const keystone = require('keystone');
// redis
const {findOneByKey, loadAll} = require('../redis-queries/redisQueries');

// helpers
const {getSort, getRidOfMetadata} = require('../helpers');

exports = module.exports = function(req, res) {
	var view = new keystone.View(req, res);
	var locals = res.locals;

	locals.section = 'Nuolaidos';

	locals.data = {
		products: [],
		discounts: true,
		sort: req.query.filterlist
	};
	locals.filters = {
		categoriesWithDiscount: []
	};

	// Find categories that have Discount on them
	view.on('init', function(next) {
		const loadAllCategoriesQuery = {
			dbCollection: keystone.list('ProductCategory'),
			redisKeyName: 'all-categories',
			populateBy: 'ChildCategoryOf',
			callback: (result, err) => {
				if (err || !result.length) {
					return next(err);
				}
				locals.filters.categoriesWithDiscount = result.filter(cat => cat.discount || cat.discount > 0);
				next();
			}
		};

		loadAll(loadAllCategoriesQuery);
	});

	// Load products
	view.on('init', function(next) {
		let productsQuery = keystone
			.list('Product')
			.paginate({
				page: req.query.page || 1,
				perPage: 9,
				maxPages: 10
			})
			.populate('Manufacturer ProductType');

		// All products with discounts
		productsQuery
			.find({$or: [{Discount: {$gt: 0}}, {ProductType: {$in: locals.filters.categoriesWithDiscount}}]})
			.sort(getSort(req.query.filterlist))
			.exec(function(err, prods) {
				if (err) {
					next(err);
				} else {
					locals.data.products = getRidOfMetadata(prods, true, 300, 300);
				}
				next(err);
			});
	});
	// Render the view
	view.render('specialoffers');
};
