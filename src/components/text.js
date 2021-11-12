import {clone} from './base.js';
import {debounce, props} from './utilities.js';

// Add run method
let Text = clone();
Text.prototype.run = debounce(function () {
	this.el.textContent = this.fn(...props(this));
});

function text (el, fn) {
	return new Text(el, fn);
}

export {text};