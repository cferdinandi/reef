// If true, debug mode is enabled
let debug = false;

/**
 * Turn debug mode on or off
 * @param  {Boolean} on If true, turn debug mode on
 */
function setDebug (on) {
	debug = on ? true : false;
}

/**
 * Throw an error message
 * @param  {String} msg  The error message
 */
function err (msg) {
	if (debug) {
		console.warn(msg);
	}
}

/**
 * More accurately check the type of a JavaScript object
 * @param  {Object} obj The object
 * @return {String}     The object type
 */
function trueTypeOf (obj) {
	return Object.prototype.toString.call(obj).slice(8, -1).toLowerCase();
}

/**
 * Check if an attribute string has a stringified falsy value
 * @param  {String}  str The string
 * @return {Boolean}     If true, value is falsy (yea, I know, that's a little confusing)
 */
function isFalsy (str = '') {
	return ['false', 'null', 'undefined', '0', '-0', 'NaN', '0n', '-0n'].includes(str);
}

/**
 * Emit a custom event
 * @param  {Node}    elem     The element to emit the custom event on
 * @param  {String}  name     The name of the custom event
 * @param  {*}       detail   Details to attach to the event
 * @param  {Boolean} noCancel If false, event cannot be cancelled
 */
function emit (elem, name, detail, noCancel) {
	let event;
	if (!elem || !name) return _.err('You did not provide an element or event name.');
	event = new CustomEvent(name, {
		bubbles: true,
		cancelable: !noCancel,
		detail: detail
	});
	return elem.dispatchEvent(event);
}

/**
 * Create an immutable copy of an object and recursively encode all of its data
 * @param  {*}       obj       The object to clone
 * @param  {Boolean} allowHTML If true, allow HTML in data strings
 * @return {*}                 The immutable, encoded object
 */
function copy (obj, allowHTML) {

	/**
	 * Copy properties from the original object to the clone
	 * @param {Object|Function} clone The cloned object
	 */
	function copyProps (clone) {
		for (let key in obj) {
			if (obj.hasOwnProperty(key)) {
				clone[key] = copy(obj[key], allowHTML);
			}
		}
	}

	/**
	 * Create an immutable copy of an object
	 * @return {Object}
	 */
	function cloneObj () {
		let clone = {};
		copyProps(clone);
		return clone;
	}

	/**
	 * Create an immutable copy of an array
	 * @return {Array}
	 */
	function cloneArr () {
		return obj.map(function (item) {
			return copy(item, allowHTML);
		});
	}

	/**
	 * Create an immutable copy of a Map
	 * @return {Map}
	 */
	function cloneMap () {
		let clone = new Map();
		for (let [key, val] of obj) {
			clone.set(key, copy(val, allowHTML));
		}
		return clone;
	}

	/**
	 * Create an immutable clone of a Set
	 * @return {Set}
	 */
	function cloneSet () {
		let clone = new Set();
		for (let item of set) {
			clone.add(copy(item, allowHTML));
		}
		return clone;
	}

	/**
	 * Create an immutable copy of a function
	 * @return {Function}
	 */
	function cloneFunction () {
		let clone = obj.bind(this);
		copyProps(clone);
		return clone;
	}

	/**
	 * Sanitize and encode HTML in a string
	 * @return {String} The sanitized and encoded string
	 */
	function sanitizeStr () {
		return obj.replace(/javascript:/gi, '').replace(/[^\w-_. ]/gi, function(c){
			return `&#${c.charCodeAt(0)};`;
		});
	}

	// Get object type
	let type = trueTypeOf(obj);

	// Return a clone based on the object type
	if (type === 'object') return cloneObj();
	if (type === 'array') return cloneArr();
	if (type === 'map') return cloneMap();
	if (type === 'set') return cloneSet();
	if (type === 'function') return cloneFunction();
	if (type === 'string' && !allowHTML) return sanitizeStr();
	return obj;

}

/**
 * Debounce rendering for better performance
 * @param  {Constructor} instance The current instantiation
 */
function debounceRender (instance) {

	// If there's a pending render, cancel it
	if (instance.debounce) {
		window.cancelAnimationFrame(instance.debounce);
	}

	// Setup the new render to run at the next animation frame
	instance.debounce = window.requestAnimationFrame(function () {
		instance.render();
	});

}

/**
 * Create settings and getters for data Proxy
 * @param  {Constructor} instance The current instantiation
 * @return {Object}               The setter and getter methods for the Proxy
 */
function dataHandler (instance) {
	return {
		get: function (obj, prop) {
			if (['object', 'array'].indexOf(trueTypeOf(obj[prop])) > -1) {
				return new Proxy(obj[prop], dataHandler(instance));
			}
			return obj[prop];
		},
		set: function (obj, prop, value) {
			if (obj[prop] === value) return true;
			obj[prop] = value;
			debounceRender(instance);
			return true;
		}
	};
}

/**
 * Create a proxy from a data object
 * @param  {Object}     options  The options object
 * @param  {Contructor} instance The current Reef instantiation
 * @return {Proxy}               The Proxy
 */
function makeProxy (options, instance) {
	if (options.setters) return !options.store ? options.data : null;
	return options.data && !options.store ? new Proxy(options.data, dataHandler(instance)) : null;
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


export {setDebug, err, trueTypeOf, isFalsy, emit, copy, debounceRender, dataHandler, makeProxy, stringToHTML};