import {clone} from './base.js';
import {clean, debounce, props} from './utilities.js';

// Add run method
let HTML = clone();
HTML.prototype.run = debounce(function () {
	this.el.innerHTML = clean(this.fn(...props(this)));
});

function html (el, fn) {
	return new HTML(el, fn);
}

export {html};