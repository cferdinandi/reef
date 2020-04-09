/*!
 * reefjs v4.1.13
 * A lightweight helper function for creating reactive, state-based components and UI
 * (c) 2020 Chris Ferdinandi
 * MIT License
 * http://github.com/cferdinandi/reef
 */

/**
 * Element.matches() polyfill (simple version)
 * https://developer.mozilla.org/en-US/docs/Web/API/Element/matches#Polyfill
 */
if (!Element.prototype.matches) {
	Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
}
(function (root, factory) {
	if (typeof define === 'function' && define.amd) {
		define([], (function () {
			return factory(root);
		}));
	} else if (typeof exports === 'object') {
		module.exports = factory(root);
	} else {
		root.Reef = factory(root);
	}
})(typeof global !== 'undefined' ? global : typeof window !== 'undefined' ? window : this, (function (window) {

	'use strict';

	//
	// Variables
	//

	// Attributes that might be changed dynamically
	var dynamicAttributes = ['checked', 'disabled', 'hidden', 'lang', 'readonly', 'required', 'selected', 'value'];

	// If true, debug mode is enabled
	var debug = false;

	// Create global support variable
	var support;


	//
	// Methods
	//

	/**
	 * Check feature support
	 */
	var checkSupport = function () {
		if (!window.DOMParser) return false;
		var parser = new DOMParser();
		try {
			parser.parseFromString('x', 'text/html');
		} catch(err) {
			return false;
		}
		return true;
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
			return obj.map((function (item) {
				return clone(item, allowHTML);
			}));
		}

		// If the data is a string, encode it
		if (type === 'string' && !allowHTML) {
			var temp = document.createElement('div');
			temp.textContent = obj;
			return temp.innerHTML;
		}

		// Otherwise, return object as is
		return obj;

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
	 * Find the index of the first matching item in an array
	 * @param  {Array}    arr      The array to search in
	 * @param  {Function} callback The callback to run to find a match
	 * @return {*}                 The matching item's index
	 */
	var findIndex = function (arr, callback) {
		return arr.reduce((function (index, item, currentIndex) {
			if (index < 0 && callback(item, currentIndex)) return currentIndex;
			return index;
		}), -1);
	};

	/**
	 * Create the Component object
	 * @param {String|Node} elem    The element to make into a component
	 * @param {Object}      options The component options
	 */
	var Component = function (elem, options) {

		// Make sure an element is provided
		if (!elem && (!options || !options.lagoon)) return err('Reef.js: You did not provide an element to make into a component.');

		// Make sure a template is provided
		if (!options || (!options.template && !options.lagoon)) return err('Reef.js: You did not provide a template for this component.');

		// Set the component properties
		this.elem = elem;
		this.data = options.data;
		this.template = options.template;
		this.allowHTML = options.allowHTML;
		this.attached = [];
		this.lagoon = options.lagoon;

		// Attach linked components
		if (options.attachTo) {
			var _this = this;
			options.attachTo.forEach((function (coral) {
				if ('attach' in coral) {
					coral.attach(_this);
				}
			}));
		}

	};

	/**
	 * Create an array map of style names and values
	 * @param  {String} styles The styles
	 * @return {Array}         The styles
	 */
	var getStyleMap = function (styles) {
		return styles.split(';').reduce((function (arr, style) {
			if (style.indexOf(':') > 0) {
				var styleArr = style.trim().split(':');
				arr.push({
					name: styleArr[0] ? styleArr[0].trim() : '',
					value: styleArr[1] ? styleArr[1].trim() : ''
				});
			}
			return arr;
		}), []);
	};

	/**
	 * Remove styles from an element
	 * @param  {Node}  elem   The element
	 * @param  {Array} styles The styles to remove
	 */
	var removeStyles = function (elem, styles) {
		styles.forEach((function (style) {
			elem.style[style] = '';
		}));
	};

	/**
	 * Add or updates styles on an element
	 * @param  {Node}  elem   The element
	 * @param  {Array} styles The styles to add or update
	 */
	var changeStyles = function (elem, styles) {
		styles.forEach((function (style) {
			elem.style[style.name] = style.value;
		}));
	};

	/**
	 * Diff existing styles from new ones
	 * @param  {Node}   elem   The element
	 * @param  {String} styles The styles the element should have
	 */
	var diffStyles = function (elem, styles) {

		// Get style map
		var styleMap = getStyleMap(styles);

		// Get styles to remove
		var remove = Array.prototype.filter.call(elem.style, (function (style) {
			var findStyle = find(styleMap, (function (newStyle) {
				return newStyle.name === style && newStyle.value === elem.style[style];
			}));
			return findStyle === null;
		}));

		// Add and remove styles
		removeStyles(elem, remove);
		changeStyles(elem, styleMap);

	};

	/**
	 * Add attributes to an element
	 * @param {Node}  elem The element
	 * @param {Array} atts The attributes to add
	 */
	var addAttributes = function (elem, atts) {
		atts.forEach((function (attribute) {
			// If the attribute is a class, use className
			// Else if it's style, diff and update styles
			// Otherwise, set the attribute
			if (attribute.att === 'class') {
				elem.className = attribute.value;
			} else if (attribute.att === 'style') {
				diffStyles(elem, attribute.value);
			} else {
				if (attribute.att in elem) {
					try {
						elem[attribute.att] = attribute.value || attribute.att;
					} catch (e) {}
				}
				try {
					elem.setAttribute(attribute.att, attribute.value || '');
				} catch (e) {}

			}
		}));
	};

	/**
	 * Remove attributes from an element
	 * @param {Node}  elem The element
	 * @param {Array} atts The attributes to remove
	 */
	var removeAttributes = function (elem, atts) {
		atts.forEach((function (attribute) {
			// If the attribute is a class, use className
			// Else if it's style, remove all styles
			// Otherwise, use removeAttribute()
			if (attribute.att === 'class') {
				elem.className = '';
			} else if (attribute.att === 'style') {
				removeStyles(elem, Array.prototype.slice.call(elem.style));
			} else {
				if (attribute.att in elem) {
					try {
						elem[attribute.att] = '';
					} catch (e) {}
				}
				try {
					elem.removeAttribute(attribute.att);
				} catch (e) {}
			}
		}));
	};

	/**
	 * Create an object with the attribute name and value
	 * @param  {String} name  The attribute name
	 * @param  {*}      value The attribute value
	 * @return {Object}       The object of attribute details
	 */
	var getAttribute = function (name, value) {
		return {
			att: name,
			value: value
		};
	};

	/**
	 * Get the dynamic attributes for a node
	 * @param  {Node} node  The node
	 * @param  {Array} atts The static attributes
	 */
	var getDynamicAttributes = function (node, atts) {
		dynamicAttributes.forEach((function (prop) {
			if (!node[prop]) return;
			atts.push(getAttribute(prop, node[prop]));
		}));
	};

	/**
	 * Get base attributes for a node
	 * @param  {Node} node The node
	 * @return {Array}     The node's attributes
	 */
	var getBaseAttributes = function (node) {
		return Array.prototype.reduce.call(node.attributes, (function (arr, attribute) {
			if (dynamicAttributes.indexOf(attribute.name) < 0) {
				arr.push(getAttribute(attribute.name, attribute.value));
			}
			return arr;
		}), []);
	};

	/**
	 * Create an array of the attributes on an element
	 * @param  {NamedNodeMap} attributes The attributes on an element
	 * @param  {Node} node The node to get attributes from
	 * @return {Array}                   The attributes on an element as an array of key/value pairs
	 */
	var getAttributes = function (node) {
		var atts = getBaseAttributes(node);
		getDynamicAttributes(node, atts);
		return atts;
	};

	/**
	 * Make an HTML element
	 * @param  {Object} elem The element details
	 * @return {Node}        The HTML element
	 */
	var makeElem = function (elem) {

		// Create the element
		// var node = elem.type === 'text' ? document.createTextNode(elem.content) : (elem.type === 'comment' ? document.createComment(elem.content) : document.createElement(elem.type));
		var node;
		if (elem.type === 'text') {
			node = document.createTextNode(elem.content);
		} else if (elem.type === 'comment') {
			node = document.createComment(elem.content);
		} else if (elem.isSVG) {
			node = document.createElementNS('http://www.w3.org/2000/svg', elem.type);
		} else {
			node = document.createElement(elem.type);
		}

		// Add attributes
		addAttributes(node, elem.atts);

		// If the element has child nodes, create them
		// Otherwise, add textContent
		if (elem.children.length > 0) {
			elem.children.forEach((function (childElem) {
				node.appendChild(makeElem(childElem));
			}));
		} else if (elem.type !== 'text') {
			node.textContent = elem.content;
		}

		return node;

	};

	/**
	 * Diff the attributes on an existing element versus the template
	 * @param  {Object} template The new template
	 * @param  {Object} existing The existing DOM node
	 */
	var diffAtts = function (template, existing) {

		// Get attributes to remove
		var remove = existing.atts.filter((function (att) {
			var getAtt = find(template.atts, (function (newAtt) {
				return att.att === newAtt.att;
			}));
			return getAtt === null;
		}));

		// Get attributes to change
		var change = template.atts.filter((function (att) {
			var getAtt = find(existing.atts, (function (existingAtt) {
				return att.att === existingAtt.att;
			}));
			return getAtt === null || getAtt.value !== att.value;
		}));

		// Add/remove any required attributes
		addAttributes(existing.node, change);
		removeAttributes(existing.node, remove);

	};

	/**
	 * Diff the existing DOM node versus the template
	 * @param  {Array} templateMap A DOM tree map of the template content
	 * @param  {Array} domMap      A DOM tree map of the existing DOM node
	 * @param  {Node}  elem        The element to render content into
	 * @param  {Array} polyps      Attached components for this element
	 */
	var diff = function (templateMap, domMap, elem, polyps) {

		// If extra elements in domMap, remove them
		var count = domMap.length - templateMap.length;
		if (count > 0) {
			for (; count > 0; count--) {
				domMap[domMap.length - count].node.parentNode.removeChild(domMap[domMap.length - count].node);
			}
		}

		// Diff each item in the templateMap
		templateMap.forEach((function (node, index) {

			// If element doesn't exist, create it
			if (!domMap[index]) {
				elem.appendChild(makeElem(templateMap[index]));
				return;
			}

			// If element is not the same type, replace it with new element
			if (templateMap[index].type !== domMap[index].type) {
				domMap[index].node.parentNode.replaceChild(makeElem(templateMap[index]), domMap[index].node);
				return;
			}

			// If attributes are different, update them
			diffAtts(templateMap[index], domMap[index]);

			// If element is an attached component, skip it
			var isPolyp = polyps.filter((function (polyp) {
				return node.node.nodeType !== 3 && node.node.matches(polyp);
			}));
			if (isPolyp.length > 0) return;

			// If content is different, update it
			if (templateMap[index].content && templateMap[index].content !== domMap[index].content) {
				domMap[index].node.textContent = templateMap[index].content;
			}

			// If target element should be empty, wipe it
			if (domMap[index].children.length > 0 && node.children.length < 1) {
				domMap[index].node.innerHTML = '';
				return;
			}

			// If element is empty and shouldn't be, build it up
			// This uses a document fragment to minimize reflows
			if (domMap[index].children.length < 1 && node.children.length > 0) {
				var fragment = document.createDocumentFragment();
				diff(node.children, domMap[index].children, fragment, polyps);
				domMap[index].node.appendChild(fragment)
				return;
			}

			// If there are existing child elements that need to be modified, diff them
			if (node.children.length > 0) {
				diff(node.children, domMap[index].children, domMap[index].node, polyps);
			}

		}));

	};

	/**
	 * Create a DOM Tree Map for an element
	 * @param  {Node}   element The element to map
	 * @return {Array}          A DOM tree map
	 */
	var createDOMMap = function (element, isSVG) {
		return Array.prototype.map.call(element.childNodes, (function (node) {
			var details = {
				content: node.childNodes && node.childNodes.length > 0 ? null : node.textContent,
				atts: node.nodeType !== 1 ? [] : getAttributes(node),
				type: node.nodeType === 3 ? 'text' : (node.nodeType === 8 ? 'comment' : node.tagName.toLowerCase()),
				node: node
			};
			details.isSVG = isSVG || details.type === 'svg';
			details.children = createDOMMap(node, details.isSVG);
			return details;
		}));
	};

	/**
	 * If there are linked Reefs, render them, too
	 * @param  {Array} polyps Attached Reef components
	 */
	var renderPolyps = function (polyps, reef) {
		if (!polyps) return;
		polyps.forEach((function (coral) {
			if (coral.attached.indexOf(reef) > -1) return err('ReefJS: ' + reef.elem + ' has attached nodes that it is also attached to, creating an infinite loop.');
			if ('render' in coral) coral.render();
		}));
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
			if (doc.head.childNodes.length > 0) {
				Array.prototype.slice.call(doc.head.childNodes).reverse().forEach((function (node) {
					doc.body.insertBefore(node, doc.body.firstChild);
				}));
			}

			return doc.body;

		}

		// Otherwise, fallback to old-school method
		var dom = document.createElement('div');
		dom.innerHTML = str;
		return dom;

	};

	/**
	 * Render a template into the DOM
	 * @return {Node}  The elemenft
	 */
	Component.prototype.render = function () {

		// If this is used only for data, render attached and bail
		if (this.lagoon) {
			renderPolyps(this.attached, this);
			return;
		}

		// Make sure there's a template
		if (!this.template) return err('Reef.js: No template was provided.');

		// If elem is an element, use it.
		// If it's a selector, get it.
		var elem = trueTypeOf(this.elem) === 'string' ? document.querySelector(this.elem) : this.elem;
		if (!elem) return err('Reef.js: The DOM element to render your template into was not found.');

		// Encode the data
		// var data = this.allowHTML ? clone(this.data) : encode(this.data || {});
		var data = clone(this.data || {}, this.allowHTML);

		// Get the template
		var template = (trueTypeOf(this.template) === 'function' ? this.template(data) : this.template);
		if (['string', 'number'].indexOf(trueTypeOf(template)) === -1) return;

		// If UI is unchanged, do nothing
		if (elem.innerHTML === template.innerHTML) return;

		// If target element or template are empty, inject the entire template
		// Otherwise, diff and update
		if (elem.innerHTML.trim().length < 1 || template.trim().length < 1) {
			elem.innerHTML = template;
		} else {

			// Create DOM maps of the template and target element
			var templateMap = createDOMMap(stringToHTML(template));
			var domMap = createDOMMap(elem);

			// Diff and update the DOM
			var polyps = this.attached.map((function (polyp) { return polyp.elem; }));
			diff(templateMap, domMap, elem, polyps);

		}

		// Dispatch a render event
		var event;
		if (trueTypeOf(window.CustomEvent) === 'function') {
			event = new CustomEvent('render', {
				bubbles: true
			});
		} else {
			event = document.createEvent('CustomEvent');
			event.initCustomEvent('render', true, false, null);
		}
		elem.dispatchEvent(event);

		// If there are linked Reefs, render them, too
		renderPolyps(this.attached, this);

		// Return the elem for use elsewhere
		return elem;

	};

	/**
	 * Get a clone of the Component.data property
	 * @return {Object} A clone of the Component.data property
	 */
	Component.prototype.getData = function () {
		return clone(this.data, true);
	};

	/**
	 * Update the data property and re-render
	 * @param {Object} obj The data to merge into the existing state
	 */
	Component.prototype.setData = function (obj) {
		if (trueTypeOf(obj) !== 'object') return err('ReefJS: The provided data is not an object.');
		for (var key in obj) {
			if (obj.hasOwnProperty(key)) {
				this.data[key] = obj[key];
			}
		}
		this.render();
	};

	/**
	 * Attach a component to this one
	 * @param  {Function|Array} coral The component(s) to attach
	 */
	Component.prototype.attach = function (coral) {
		if (trueTypeOf(coral) === 'array') {
			Array.prototype.push.apply(this.attached, coral);
		} else {
			this.attached.push(coral);
		}
	};

	/**
	 * Detach a linked component to this one
	 * @param  {Function|Array} coral The linked component(s) to detach
	 */
	Component.prototype.detach = function (coral) {
		var isArray = trueTypeOf(coral) === 'array';
		this.attached = this.attached.filter((function (polyp) {
			if (isArray) {
				return coral.indexOf(polyp) === -1;
			} else {
				return polyp !== coral;
			}
		}));
	};

	/**
	 * Turn debug mode on or off
	 * @param  {Boolean} on If true, turn debug mode on
	 */
	Component.debug = function (on) {
		if (on) {
			debug = true;
		} else {
			debug = false;
		}
	};


	//
	// Set support
	//

	support = checkSupport();


	//
	// Export public methods
	//

	return Component;

}));