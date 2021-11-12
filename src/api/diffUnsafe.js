import {clone} from '../utils/base.js';
import {stringToHTML, debounce, props, emit} from '../utils/utilities.js';
import {compare} from '../utils/dom.js';

// Add run method
let DiffUnsafe = clone();
DiffUnsafe.prototype.run = debounce(function () {
	let $ = props(this);
	if (!emit('diff-unsafe-before', $, this.el)) return;
	compare(stringToHTML(this.fn(...$)), this.el);
	emit('diff-unsafe', $, this.el);
});

/**
 * Instantiate a new DiffUnsafe instance
 * @param  {String}   el The element selector (or element itself)
 * @param  {Function} fn The function that returns the template string
 * @return {Instance}    The instantiated instance
 */
function diffUnsafe (el, fn) {
	return new DiffUnsafe(el, fn);
}

export {diffUnsafe};