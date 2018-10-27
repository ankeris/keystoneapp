let keystone = require('keystone');
let Types = keystone.Field.Types;

let Product = new keystone.List('Product', {
	map: {
		name: 'title'
	},
	singular: 'Product',
	plural: 'Products',
	autokey: {
		path: 'slug',
		from: 'title',
		unique: true
	},
});

Product.add({
	title: {
		type: String,
		required: true
	},
	price: {
		type: Number
	},
	Discount: {
		type: Number,
		collapse: true,
		note: 'What is the new price?',
	},
	description: {
		type: Types.Html,
		wysiwyg: true,
		height: 300
	},
	TechnicalDescription: {
		type: Types.Html,
		wysiwyg: true,
		height: 300
	},
	images: {
		type: Types.CloudinaryImages
	},
	awards: {
		type: Types.CloudinaryImages
	},
	ProductType: {
		type: Types.Relationship,
		ref: 'ProductCategory',
		many: true
	},
	Manufacturer: {
		type: Types.Relationship,
		ref: 'ProductManufacturer',
		many: false
	},
	Highlight: {
		type: Types.Boolean
	}
});

Product.defaultColumns = 'title, ProductType, Manufacturer, images, Highlight';
Product.register();
