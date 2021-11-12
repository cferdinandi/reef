import {stringToHTML} from './utilities.js';
import {compare} from './dom.js';

function diffUnsafe (el, fn) {

	// Get the target element
	let elem = typeof el === 'string' ? document.querySelector(el) : el;
	if (!elem) throw `Element not found: ${el}`;

	// Render the content
	return function () {
		compare(stringToHTML(fn(this.data)), elem);
	};

}

export {diffUnsafe};