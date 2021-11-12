import {err} from './debug.js';
import {emit} from './utilities.js';

/**
 * Base constructor object for the API methods
 * @param {String}   el The element seelctor (or the element itself)
 * @param {Function} fn The function that returns a template string
 */
function Constructor (el, fn) {

	// Get element
	el = typeof el === 'string' ? document.querySelector(el) : el;
	if (!el) return err('Element not found.');
	if (!fn) return err('Please provide a function');

	// Set properties
	Object.defineProperties(this, {
		el: {value: typeof el === 'string' ? document.querySelector(el) : el},
		fn: {value: fn},
		$: {value: []}
	});
	this._debounce = null;

}

/**
 * Add stores to the instance
 * @param  {...Store} props The Store instances to attach
 */
Constructor.prototype.use = function (...props) {
	for (let $ of props) {
		if (this.$.includes($)) continue;
		this.$.push($);
		$._fns.push(this);
	}
};

/**
 * Destroy the component
 */
Constructor.prototype.destroy = function () {
	if (!emit('destroy-before', this)) return;
	for (let $ of this.$) {
		let index = $._fns.indexOf(this);
		if (index < 0) continue;
		$._fns.splice(index, 1);
	}
	emit('destroy', this);
};

/**
 * Clone the Constructor object
 * @return {Constructor} The cloned Constructor object
 */
function clone () {
	function Clone (el, fn) {
		Constructor.call(this, el, fn);
	}
	Clone.prototype = Object.create(Constructor.prototype);
	return Clone;
}

export {clone};