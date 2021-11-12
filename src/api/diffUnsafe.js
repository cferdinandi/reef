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

function diffUnsafe (el, fn) {
	return new DiffUnsafe(el, fn);
}

export {diffUnsafe};