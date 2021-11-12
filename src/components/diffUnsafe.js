import {clone} from './base.js';
import {stringToHTML, debounce, props} from './utilities.js';
import {compare} from './dom.js';

// Add run method
let DiffUnsafe = clone();
DiffUnsafe.prototype.run = debounce(function () {
	compare(stringToHTML(this.fn(...props(this))), this.el);
});

function diffUnsafe (el, fn) {
	return new DiffUnsafe(el, fn);
}

export {diffUnsafe};