import {clone} from '../utils/base.js';
import {debounce, props, emit} from '../utils/utilities.js';

// Add run method
let Text = clone();
Text.prototype.run = debounce(function () {
	let $ = props(this);
	if (!emit('text-before', $, this.el)) return;
	this.el.textContent = this.fn(...$);
	emit('text', $, this.el);
});

function text (el, fn) {
	return new Text(el, fn);
}

export {text};