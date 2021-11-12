import {clone} from '../utils/base.js';
import {clean, debounce, props, emit} from '../utils/utilities.js';
import {compare} from '../utils/dom.js';

// Add run method
let Diff = clone();
Diff.prototype.run = debounce(function () {
	let $ = props(this);
	if (!emit('diff-before', $, this.el)) return;
	compare(clean(this.fn(...$), true), this.el);
	emit('diff', $, this.el);
});

/**
 * Instantiate a new Diff instance
 * @param  {String}   el The element selector (or element itself)
 * @param  {Function} fn The function that returns the template string
 * @return {Instance}    The instantiated instance
 */
function diff (el, fn) {
	return new Diff(el, fn);
}

export {diff};