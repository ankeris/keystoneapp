const keystone = require('keystone');
const async = require('async');
const browser = require('browser-detect');
const helpers = require('../helpers');
const getRidOfMetadata = helpers.getRidOfMetadata;

// redis
const redisQueries = require('../redis-queries/redisQueries');
const {loadAll} = redisQueries;
const findCategory = redisQueries.findOneByKey;

exports = module.exports = function(req, res) {
	let view = new keystone.View(req, res);
	let locals = res.locals;
	const supportWebP = browser(req.headers['user-agent']).name == 'chrome';

	locals.section = 'products';

	locals.data = {
		products: [],
		categories: [],
		subcategories: [],
		sort: req.query.filterlist
	};

	locals.filters = {
		category: req.params.category,
		search: req.query.search
	};

	// Load all categories for side navigation
	view.on('init', function(next) {
		const loadAllCategoriesQuery = {
			dbCollection: keystone.list('ProductCategory'),
			populateBy: 'ChildCategoryOf',
			sort: 'name',
			redisKeyName: 'allCategories',
			callback: (cats, err) => {
				locals.data.categories = cats;
				if (err || !cats.length) {
					return next(err);
				}
				next();
			}
		};

		loadAll(loadAllCategoriesQuery);
	});
	// load current category
	view.on('init', next => {
		if (req.params.category) {
			findCategory({
				dbCollection: keystone.list('ProductCategory'),
				keyName: locals.filters.category,
				callback: (result, err) => {
					if (err) throw console.log(err);
					else locals.data.category = result;
					next(err);
				}
			});
		} else {
			next();
		}
	});

	// Additionally query manufacturers for sidenav
	view.on('init', function(next) {
		const loadAllManufacturersQuery = {
			dbCollection: keystone.list('ProductManufacturer'),
			sort: 'name',
			redisKeyName: 'allManufacturers',
			callback: (result, err) => {
				locals.data.manufacturers = result;
				if (err || !result.length) {
					return next(err);
				}
				next();
			}
		};

		loadAll(loadAllManufacturersQuery);
	});
	// Load the products
	view.on('init', function(next) {
		let q = keystone.list('Product').paginate({
			page: req.query.page || 1,
			perPage: 9,
			maxPages: 10
		});
		q.populate('Manufacturer ProductType').sort(getSort());

		if (locals.data.category) {
			// Load products for basic categories (without subcategories)
			if (!locals.data.category.IsParentCategory) {
				q.find({
					ProductType: locals.data.category
				}).exec(function(err, result) {
					if (err) {
						next(err);
					} else {
						locals.data.products = getRidOfMetadata(result, true, 300, 300, supportWebP);
						next(err);
					}
				});
			} // Load products of all children categories of parent category
			else if (locals.data.category.IsParentCategory) {
				keystone
					.list('ProductCategory')
					.model.find({$or: [{ChildCategoryOf: locals.data.category}, {_id: locals.data.category}]})
					.exec(function(err, result) {
						q.find({
							ProductType: {$in: result}
						}).exec(function(err, result) {
							if (err) {
								next(err);
							} else {
								locals.data.products = getRidOfMetadata(result, true, 300, 300, supportWebP);
								next(err);
							}
						});
					});
			}
		}

		function getSort() {
			if (req.query.filterlist == 'price-high') {
				return {price: -1};
			} else if (req.query.filterlist == 'price-low') {
				return {price: 1};
			} else {
				return {title: -1};
			}
		}

		if (req.query.search) {
			const regex = new RegExp(escapeRegex(req.query.search), 'gi');
			q.find({
				$or: [
					{
						slug: regex
					},
					{
						title: regex
					}
				]
			}).exec(
				function(err, result) {
					if (err) {
						next(err);
					} else {
						locals.data.products = getRidOfMetadata(result, true, 300, 300, supportWebP);
						next(err);
					}
				} // Default query when products page is opened
			);
		} else if (!locals.data.category) {
			q.exec(function(err, result) {
				// getting rid of metadata with "toObject()" from mongoose
				locals.data.products = getRidOfMetadata(result, true, 300, 300, supportWebP);
				next(err);
			});
		}
	});

	// Render the view
	view.render('products');
};

function escapeRegex(text) {
	return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}
