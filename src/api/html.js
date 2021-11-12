import {clone} from '../utils/base.js';
import {clean, debounce, props, emit} from '../utils/utilities.js';

// Add run method
let HTML = clone();
HTML.prototype.run = debounce(function () {
	let $ = props(this);
	if (!emit('html-before', $, this.el)) return;
	this.el.innerHTML = clean(this.fn(...$));
	emit('html', $, this.el);
});

function html (el, fn) {
	return new HTML(el, fn);
}

export {html};