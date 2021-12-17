/**
 * Emit a custom event
 * @param  {String} type   The event type
 * @param  {Object} detail Any details to pass along with the event
 * @param  {Node}   elem   The element to attach the event to
 */
function emit (type, detail = {}, elem = document) {

	// Create a new event
	let event = new CustomEvent(`reef:${type}`, {
		bubbles: true,
		cancelable: true,
		detail: detail
	});

	// Dispatch the event
	return elem.dispatchEvent(event);

}

/**
 * Create an immutable clone of data
 * @param  {*} obj The data object to copy
 * @return {*}     The clone of the array or object
 */
function copy (obj) {

	/**
	 * Create an immutable copy of an object
	 * @return {Object}
	 */
	function cloneObj () {
		let clone = {};
		for (let key in obj) {
			if (Object.prototype.hasOwnProperty.call(obj, key)) {
				clone[key] = copy(obj[key]);
			}
		}
		return clone;
	}

	/**
	 * Create an immutable copy of an array
	 * @return {Array}
	 */
	function cloneArr () {
		return obj.map(function (item) {
			return copy(item);
		});
	}

	// Get object type
	let type = Object.prototype.toString.call(obj).slice(8, -1).toLowerCase();

	// Return a clone based on the object type
	if (type === 'object') return cloneObj();
	if (type === 'array') return cloneArr();
	return obj;

}

/**
 * Debounce rendering for better performance
 * @param  {Constructor} instance The current instantiation
 */
function render (instance) {

	// If there's a pending render, cancel it
	if (instance._debounce) {
		window.cancelAnimationFrame(instance.debounce);
	}

	// Setup the new render to run at the next animation frame
	instance._debounce = window.requestAnimationFrame(function () {
		instance.render();
	});

}

/**
 * Get instance render details
 * @param  {Constructor} instance The Constructor instance
 * @return {Object}               The element, data, and template details
 */
function getRenderDetails (instance) {
	let elem = instance._elem;
	let data = instance._store ? Object.assign(instance._store.data, instance.data || {}) : instance.data;
	let template = instance._template(data, elem);
	return {elem, data, template};
}

/**
 * Convert a template string into HTML DOM nodes
 * @param  {String} str The template string
 * @return {Node}       The template HTML
 */
function stringToHTML (str) {

	// Create document
	let parser = new DOMParser();
	let doc = parser.parseFromString(str, 'text/html');

	// If there are items in the head, move them to the body
	if (doc.head && doc.head.childNodes && doc.head.childNodes.length > 0) {
		Array.from(doc.head.childNodes).reverse().forEach(function (node) {
			doc.body.insertBefore(node, doc.body.firstChild);
		});
	}

	return doc.body || document.createElement('body');

}

/**
 * Check if an attribute string has a stringified falsy value
 * @param  {String}  str The string
 * @return {Boolean}     If true, value is falsy (yea, I know, that's a little confusing)
 */
function isFalsy (str) {
	return ['false', 'null', 'undefined', '0', '-0', 'NaN', '0n', '-0n'].includes(str);
}

export {emit, copy, render, getRenderDetails, stringToHTML, isFalsy};