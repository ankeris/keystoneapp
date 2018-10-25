let keystone = require('keystone');
let async = require('async');
let mongoose = require('mongoose');

exports = module.exports = function (req, res) {
	let view = new keystone.View(req, res);
	let locals = res.locals;

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
	view.on('init', function (next) {
		keystone
			.list('ProductCategory')
			.model
			.find()
			.sort('name')
			.populate('ChildCategoryOf')
			.exec(function (err, results) {
				if (err || !results.length) {
					return next(err);
				}

				locals.data.categories = results;
				// Load the counts for each category (counts how much products every category contains)
				async.each(locals.data.categories, function (category, next) {
					keystone
						.list('Product')
						.model
						.count()
						.where('ProductType')
						.in([category.id])
						.exec(function (err, count) {
							category.postCount = count;
							next(err);
						});
				}, function (err) {
					next(err);
				});
			});
	});

	// Load the current category Object
	view.on('init', function (next) {
		if (req.params.category) {
			keystone
				.list('ProductCategory')
				.model
				.findOne({
					key: locals.filters.category
				})
				.populate('ChildCategoryOf')
				.exec(function (err, result) {
					locals.data.category = result;
					next(err);
				});
		} else {
			next();
		}
	});

	// Load the products
	view.on('init', function (next) {
		let q = keystone
			.list('Product')
			.paginate({
				page: req.query.page || 1,
				perPage: 9,
				maxPages: 10
			});
		q
			.populate('Manufacturer ProductType')
			.sort(getSort());

		if (locals.data.category) {
			// Load products for basic categories (without subcategories)
			if (!locals.data.category.IsParentCategory) {
				q.find({
					'ProductType': locals.data.category
				})
					.exec(function (err, result) {
						if (err) {
							next(err);
						} else {
							locals.data.products = getRidOfMetadata(result, true, 300, 300);
							next(err);
						}
					});
			} // Load products of all children categories of parent category
			else if (locals.data.category.IsParentCategory) {
				keystone.list('ProductCategory').model.find({'ChildCategoryOf': locals.data.category})
					.exec(function (err, result) {
						q.find({
							'ProductType': { $in: result }
						}).exec(function (err, result) {
							if (err) {
								next(err);
							} else {
								locals.data.products = getRidOfMetadata(result, true, 300, 300);
								next(err);
							}
						});
					});
			}
		}
		
		function getSort() {
			if (req.query.filterlist == 'price-high') {
				return {
					'price': -1
				};
			} else if (req.query.filterlist == 'price-low') {
				return {
					'price': 1
				};
			}
		}

		if (req.query.search) {
			const regex = new RegExp(escapeRegex(req.query.search), 'gi');
			q.find({
				$or: [{
					'slug': regex
				}, {
					'title': regex
				}]
			})
				.exec(function (err, result) {
					if (err) {
						next(err);
					} else {
						locals.data.products = getRidOfMetadata(result, true, 300, 300);
						next(err);
					}
				} // Default query when products page is opened
				);
		} else if (!locals.data.category) {
			q
				.exec(function (err, result) {
					// getting rid of metadata with "toObject()" from mongoose
					locals.data.products = getRidOfMetadata(result, true, 300, 300);
					next(err);
				});
		}
	});

	// Additionally query manufacturers for section
	view.query('manufacturers', keystone.list('ProductManufacturer').model.find());
	// Render the view
	view.render('products');
};

function getRidOfMetadata(data, cropImages, width, height) {
	let result;
	// Some data has products array inside 'data.results' and some in just 'data' therefore we need conditional statement
	data.results ? result = data.results : result = data;
	let filteredResult = [];
	result.forEach(r => {
		if (cropImages && r.images[0]) {
			// Changes the link for each picture to a fixed height and width - in order to load faster.
			let oldUrl = r.images[0].secure_url.split('/');
			oldUrl.splice(oldUrl.length-2, 0, `c_limit,h_${height},w_${width}`);
			let newUrl = oldUrl.join('/');
			r.images[0].secure_url = newUrl;
		}
		filteredResult.push(r.toObject());
	});
	return filteredResult;
}

function escapeRegex(text) {
	return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}
