import {clone} from './base.js';
import {debounce, props} from './utilities.js';

// Add run method
let HTMLUnsafe = clone();
HTMLUnsafe.prototype.run = debounce(function () {
	this.el.innerHTML = this.fn(...props(this));
});

function htmlUnsafe (el, fn) {
	return new HTMLUnsafe(el, fn);
}

export {htmlUnsafe};