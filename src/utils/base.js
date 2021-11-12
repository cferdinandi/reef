import {err} from './debug.js';
import {emit} from './utilities.js';

function deactivate ($) {
	let index = $.fns.indexOf(this);
	if (index < 0) return;
	$.fns.splice(index, 1);
}

function Constructor (el, fn) {

	// Get element
	el = typeof el === 'string' ? document.querySelector(el) : el;
	if (!el) return err('Element not found.');
	if (!fn) return err('Please provide a function');

	// Set properties
	Object.defineProperties(this, {
		el: {value: typeof el === 'string' ? document.querySelector(el) : el},
		fn: {value: fn},
		props: {value: []}
	});
	this._debounce = null;

}

Constructor.prototype.add = function (...props) {
	for (let $ of props) {
		if (this.props.includes($)) continue;
		this.props.push($);
		$.fns.push(this);
	}
};

Constructor.prototype.rm = function (...props) {
	for (let $ of props) {

		// Remove the prop
		let index = this.props.indexOf($);
		if (index < 0) continue;
		this.props.splice(index, 1);

		// Stop reactivity
		deactivate($);

	}
};

Constructor.prototype.stop = function () {
	for (let $ of this.props) {
		deactivate($);
	}
};

Constructor.prototype.start = function () {
	for (let $ of this.props) {
		if ($.fns.includes(this)) continue;
		$.fns.push(this);
	}
};

function clone (el, fn) {
	function Clone (el, fn) {
		Constructor.call(this, el, fn);
	}
	Clone.prototype = Object.create(Constructor.prototype);
	return Clone;
}

export {clone};