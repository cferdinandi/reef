import {clone} from './base.js';
import {clean, debounce, props} from './utilities.js';
import {compare} from './dom.js';

// Add run method
let Diff = clone();
Diff.prototype.run = debounce(function () {
	compare(clean(this.fn(...props(this)), true), this.el);
});

function diff (el, fn) {
	return new Diff(el, fn);
}

export {diff};