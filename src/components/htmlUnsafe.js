function htmlUnsafe (el, fn) {

	// Get the target element
	let elem = typeof el === 'string' ? document.querySelector(el) : el;
	if (!elem) throw `Element not found: ${el}`;

	// Render the content
	return function () {
		elem.innerHTML = fn(this.data);
	};

}

export {htmlUnsafe};