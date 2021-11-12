import {clean} from './utilities.js';

function html (el, fn) {

	// Get the target element
	let elem = typeof el === 'string' ? document.querySelector(el) : el;
	if (!elem) throw `Element not found: ${el}`;

	// Render the content
	return function () {
		elem.innerHTML = clean(fn(this.data));
	};

}

export {html};