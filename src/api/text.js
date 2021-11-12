import {clone} from '../utils/base.js';
import {debounce, props, emit} from '../utils/utilities.js';

// Add run method
let Text = clone();
Text.prototype.run = debounce(function () {
	let $ = props(this);
	if (!emit('text-before', $, this.el)) return;
	this.el.textContent = this.fn(...$);
	emit('text', $, this.el);
});

/**
 * Instantiate a new Text instance
 * @param  {String}   el The element selector (or element itself)
 * @param  {Function} fn The function that returns the template string
 * @return {Instance}    The instantiated instance
 */
function text (el, fn) {
	return new Text(el, fn);
}

export {text};