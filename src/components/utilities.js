// If true, debug mode is enabled
var debug = false;

/**
 * Turn debug mode on or off
 * @param  {Boolean} on If true, turn debug mode on
 */
var setDebug = function (on) {
	debug = on ? true : false;
};

// Check browser support
var support = (function () {
	if (!window.DOMParser) return false;
	var parser = new DOMParser();
	try {
		parser.parseFromString('x', 'text/html');
	} catch(err) {
		return false;
	}
	return true;
})();

/**
 * Check if element has selector
 * @param  {Node}    elem     The element
 * @param  {String}  selector The selector
 * @return {Boolean}          If true, the element has the selector
 */
var matches = function (elem, selector) {
	return (Element.prototype.matches && elem.matches(selector)) || (Element.prototype.msMatchesSelector && elem.msMatchesSelector(selector)) || (Element.prototype.webkitMatchesSelector && elem.webkitMatchesSelector(selector));
};

/**
 * Convert an iterable object into an array
 * @param  {*}     arr The NodeList, HTMLCollection, etc. to convert into an array
 * @return {Array}     The array
 */
var arrayFrom = function (arr) {
	return Array.prototype.slice.call(arr);
};

/**
 * More accurately check the type of a JavaScript object
 * @param  {Object} obj The object
 * @return {String}     The object type
 */
var trueTypeOf = function (obj) {
	return Object.prototype.toString.call(obj).slice(8, -1).toLowerCase();
};

/**
 * Throw an error message
 * @param  {String} msg The error message
 */
var err = function (msg) {
	if (debug) {
		throw new Error(msg);
	}
};

/**
 * Create an immutable copy of an object and recursively encode all of its data
 * @param  {*}       obj       The object to clone
 * @param  {Boolean} allowHTML If true, allow HTML in data strings
 * @return {*}                 The immutable, encoded object
 */
var clone = function (obj, allowHTML) {

	// Get the object type
	var type = trueTypeOf(obj);

	// If an object, loop through and recursively encode
	if (type === 'object') {
		var cloned = {};
		for (var key in obj) {
			if (obj.hasOwnProperty(key)) {
				cloned[key] = clone(obj[key], allowHTML);
			}
		}
		return cloned;
	}

	// If an array, create a new array and recursively encode
	if (type === 'array') {
		return obj.map(function (item) {
			return clone(item, allowHTML);
		});
	}

	// If the data is a string, encode it
	// https://portswigger.net/web-security/cross-site-scripting/preventing
	if (type === 'string' && !allowHTML) {
		return obj.replace(/[^\w-_. ]/gi, function(c){
			return '&#' + c.charCodeAt(0) + ';';
		}).replace(/javascript:/gi, '');
	}

	// Otherwise, return object as is
	return obj;

};

/**
 * Debounce rendering for better performance
 * @param  {Constructor} instance The current instantiation
 */
var debounceRender = function (instance) {

	// If there's a pending render, cancel it
	if (instance.debounce) {
		window.cancelAnimationFrame(instance.debounce);
	}

	// Setup the new render to run at the next animation frame
	instance.debounce = window.requestAnimationFrame(function () {
		instance.render();
	});

};

/**
 * Create settings and getters for data Proxy
 * @param  {Constructor} instance The current instantiation
 * @return {Object}               The setter and getter methods for the Proxy
 */
var dataHandler = function (instance) {
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
};

/**
 * Find the first matching item in an array
 * @param  {Array}    arr      The array to search in
 * @param  {Function} callback The callback to run to find a match
 * @return {*}                 The matching item
 */
var find = function (arr, callback) {
	var matches = arr.filter(callback);
	if (matches.length < 1) return null;
	return matches[0];
};

/**
 * Create a proxy from a data object
 * @param  {Object}     options  The options object
 * @param  {Contructor} instance The current Reef instantiation
 * @return {Proxy}               The Proxy
 */
var makeProxy = function (options, instance) {
	if (options.setters) return !options.store ? options.data : null;
	return options.data && !options.store ? new Proxy(options.data, dataHandler(instance)) : null;
};

/**
 * Convert a template string into HTML DOM nodes
 * @param  {String} str The template string
 * @return {Node}       The template HTML
 */
var stringToHTML = function (str) {

	// If DOMParser is supported, use it
	if (support) {

		// Create document
		var parser = new DOMParser();
		var doc = parser.parseFromString(str, 'text/html');

		// If there are items in the head, move them to the body
		if ('head' in doc && 'childNodes' in doc.head && doc.head.childNodes.length > 0) {
			arrayFrom(doc.head.childNodes).reverse().forEach(function (node) {
				doc.body.insertBefore(node, doc.body.firstChild);
			});
		}

		return doc.body;

	}

	// Otherwise, fallback to old-school method
	var dom = document.createElement('div');
	dom.innerHTML = str;
	return dom;

};


export {setDebug, matches, arrayFrom, trueTypeOf, err, clone, debounceRender, dataHandler, find, makeProxy, stringToHTML};