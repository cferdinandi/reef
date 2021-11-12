import {clone} from '../utils/base.js';
import {debounce, props, emit} from '../utils/utilities.js';

// Add run method
let HTMLUnsafe = clone();
HTMLUnsafe.prototype.run = debounce(function () {
	let $ = props(this);
	if (!emit('html-unsafe-before', $, this.el)) return;
	this.el.innerHTML = this.fn(...$);
	emit('html-unsafe', $, this.el);
});

function htmlUnsafe (el, fn) {
	return new HTMLUnsafe(el, fn);
}

export {htmlUnsafe};