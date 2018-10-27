var keystone = require('keystone');
let Types = keystone.Field.Types;

/**
 * ProductCategory Model
 * ==================
 */

let ProductCategory = new keystone.List('ProductCategory', {
	autokey: {
		from: 'name',
		path: 'key',
		unique: true
	}
});

ProductCategory.add({
	name: {
		type: String,
		required: true
	},
	nameSingular: {
		type: String,
		required: false
	},
	CoverImage: {
		type: Types.CloudinaryImage
	},
	ChildCategoryOf: {
		type: Types.Relationship,
		ref: 'ProductCategory',
		many: false,
		required: false,
	},
	IsParentCategory: Types.Boolean,
});

ProductCategory.relationship({
	ref: 'Product',
	path: 'products',
	refPath: 'ProductType'
});

ProductCategory.defaultColumns = 'name, ChildCategoryOf, IsParentCategory';

ProductCategory.register();
