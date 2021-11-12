import {clone} from '../utils/base.js';
import {clean, debounce, props, emit} from '../utils/utilities.js';

// Add run method
let HTML = clone();
HTML.prototype.run = debounce(function () {
	let $ = props(this);
	if (!emit('html-before', $, this.el)) return;
	this.el.innerHTML = clean(this.fn(...$));
	emit('html', $, this.el);
});

/**
 * Instantiate a new HTML instance
 * @param  {String}   el The element selector (or element itself)
 * @param  {Function} fn The function that returns the template string
 * @return {Instance}    The instantiated instance
 */
function html (el, fn) {
	return new HTML(el, fn);
}

export {html};