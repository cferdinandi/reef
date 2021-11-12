import {clone} from './base.js';
import {debounce, props} from './utilities.js';

// Add run method
let HTMLUnsafe = clone();
HTMLUnsafe.prototype.run = debounce(function () {
	elem.innerHTML = fn(...props(this));
});

function htmlUnsafe (el, fn) {
	return new htmlUnsafe(el, fn);
}

export {htmlUnsafe};