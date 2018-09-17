let $ = require('jquery');
let _ = require('lodash');
// AJAX
// Load more products
let currentPage = 1;
let AllProductsLoaded = false;

$('#loading-content').hide();

function addNextPage() {
	currentPage++;
	let parameters = {
		'page': currentPage,
		'filterlist': document.querySelector('.variables').getAttribute('data-sort'),
	};

	const category = document.querySelector('.variables').getAttribute('data-category');
	const count = document.querySelector('.variables').getAttribute('data-count');
	const brand = document.querySelector('.variables').getAttribute('data-brand');
	const search = document.querySelector('.variables').getAttribute('data-search');

	if (category) {
		ajaxCall('/products/', category, parameters);
	} else if (search) {
		ajaxCall('/products?search=', search, parameters);
	} else if (!brand) { // For default product page
		ajaxCall('/products/', null, parameters);
	} else if (brand) {
		ajaxCall('/brands/', brand, parameters);
	}
}

function ajaxCall(link, variable, parameters) {
	if (!AllProductsLoaded) {
		$('#loading-content').show();
		$.get(link + variable, parameters, function (data) {
			$('.products').append($(data).find('.products .items-box__item'));
			if ($(data).find('.products .items-box__item').length == 0) {
				AllProductsLoaded = true;
				$('#loading-content').hide();
			}
		});
	}
}

const scrollNews = _.throttle(function (e) {
	if ($(window).scrollTop() + $(window).height() > $(document).height() - 240) {
		addNextPage();
	}
}, 1000);

window.addEventListener('scroll', scrollNews, false);