/**
 * Convert the string to an HTML document
 * @param  {String} str The string to convert to HTML
 * @return {Node}       An HTML document
 */
function stringToHTML (str) {
	let parser = new DOMParser();
	let doc = parser.parseFromString(str, 'text/html');
	return doc.body || document.createElement('body');
}

/**
 * Sanitize an HTML string
 * @param  {String}          str   The HTML string to sanitize
 * @param  {Boolean}         nodes If true, returns HTML nodes instead of a string
 * @return {String|NodeList}       The sanitized string or nodes
 */
function clean (str, nodes) {

	/**
	 * Remove <script> elements
	 * @param  {Node} html The HTML
	 */
	function removeScripts (html) {
		let scripts = html.querySelectorAll('script');
		for (let script of scripts) {
			script.remove();
		}
	}

	/**
	 * Check if the attribute is potentially dangerous
	 * @param  {String}  name  The attribute name
	 * @param  {String}  value The attribute value
	 * @return {Boolean}       If true, the attribute is potentially dangerous
	 */
	function isPossiblyDangerous (name, value) {
		let val = value.replace(/\s+/g, '').toLowerCase();
		if (['src', 'href', 'xlink:href'].includes(name)) {
			if (val.includes('javascript:') || val.includes('data:')) return true;
		}
		if (name.startsWith('on')) return true;
	}

	/**
	 * Remove potentially dangerous attributes from an element
	 * @param  {Node} elem The element
	 */
	function removeAttributes (elem) {

		// Loop through each attribute
		// If it's dangerous, remove it
		let atts = elem.attributes;
		for (let {name, value} of atts) {
			if (!isPossiblyDangerous(name, value)) continue;
			elem.removeAttribute(name);
		}

	}

	/**
	 * Remove dangerous stuff from the HTML document's nodes
	 * @param  {Node} html The HTML document
	 */
	function clean (html) {
		let nodes = html.children;
		for (let node of nodes) {
			removeAttributes(node);
			clean(node);
		}
	}

	// Convert the string to HTML
	let html = stringToHTML(str);

	// Sanitize it
	removeScripts(html);
	clean(html);

	// If the user wants HTML nodes back, return them
	// Otherwise, pass a sanitized string back
	return nodes ? html : html.innerHTML;

}

/**
 * Check if an attribute string has a stringified falsy value
 * @param  {String}  str The string
 * @return {Boolean}     If true, value is falsy (yea, I know, that's a little confusing)
 */
function isFalsy (str) {
	return ['false', 'null', 'undefined', '0', '-0', 'NaN', '0n', '-0n'].includes(str);
}

/**
 * Debounce functions for better performance
 * @param  {Function} fn The function to debounce
 */
function debounce (fn) {
	return function () {

		// Setup the arguments
		let context = this;
		let args = arguments;

		// If there's a timer, cancel it
		if (context._debounce) {
			window.cancelAnimationFrame(context._debounce);
		}

		// Setup the new requestAnimationFrame()
		context._debounce = window.requestAnimationFrame(function () {
			fn.apply(context, args);
		});

	};
}

/**
 * Get properties for an instance
 * @param  {Instance} instance The instance
 * @return {Array}             The properties
 */
function props (instance) {
	return instance.$.map(function (prop) {
		return prop.$;
	});
}

/**
 * Emit a custom event
 * @param  {String} type   The event type
 * @param  {Object} detail Any details to pass along with the event
 * @param  {Node}   elem   The element to attach the event to
 */
function emit (type, detail = {}, elem = document) {

	// Make sure there's an event type
	if (!type) return;

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

export {stringToHTML, clean, isFalsy, debounce, props, emit, copy};