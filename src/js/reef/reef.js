(function (root, factory) {
	if (typeof define === 'function' && define.amd) {
		define([], function () {
			return factory(root);
		});
	} else if (typeof exports === 'object') {
		module.exports = factory(root);
	} else {
		root.Reef = factory(root);
	}
})(typeof global !== 'undefined' ? global : typeof window !== 'undefined' ? window : this, function (window) {

	'use strict';

	//
	// Variables
	//

	// Setup parser variable
	var parser;


	//
	// Methods
	//

	/**
	 * Check feature support
	 */
	var supports = function () {
		if (!window.DOMParser) return false;
		parser = parser || new DOMParser();
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
	 * Return a clone of an object or array
	 * @param  {Object|Array} obj The object or array to clone
	 * @return {Object|Array}     An exact copy of the object or array
	 */
	var clone = function (obj) {
		if (!obj) return;
		return JSON.parse(JSON.stringify(obj));
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
	 * Create the Component object
	 * @param {String|Node} elem    The element to make into a component
	 * @param {Object}      options The component options
	 */
	var Component = function (elem, options) {

		// Check browser support
		if (!supports()) throw new Error('Reef.js is not supported by this browser.');

		// Make sure an element is provided
		if (!elem && (!options || !options.lagoon)) throw new Error('Reef.js: You did not provide an element to make into a component.');

		// Make sure a template is provided
		if (!options || (!options.template && !options.lagoon)) throw new Error('Reef.js: You did not provide a template for this component.');

		// Set the component properties
		this.elem = elem;
		this.data = options.data;
		this.template = options.template;
		this.sanitize = typeof options.sanitize === 'undefined' ? true : options.sanitize;
		this.sanitizeOptions = options.sanitizeOptions || {};
		this.attached = [];
		this.lagoon = options.lagoon;

		// Attach linked components
		if (options.attachTo) {
			var _this = this;
			options.attachTo.forEach(function (coral) {
				if ('attach' in coral) {
					coral.attach(_this);
				}
			});
		}

	};

	/**
	 * Create an array map of style names and values
	 * @param  {String} styles The styles
	 * @return {Array}         The styles
	 */
	var getStyleMap = function (styles) {
		return styles.split(';').filter(function (style) {
				return style.indexOf(':') > 0;
			}).map(function (style) {
				var styleArr = style.split(':');
				return {
					name: styleArr[0] ? styleArr[0].trim() : '',
					value: styleArr[1] ? styleArr[1].trim() : ''
				};
			});
	};

	/**
	 * Remove styles from an element
	 * @param  {Node}  elem   The element
	 * @param  {Array} styles The styles to remove
	 */
	var removeStyles = function (elem, styles) {
		styles.forEach(function (style) {
			elem.style[style] = '';
		});
	};

	/**
	 * Add or updates styles on an element
	 * @param  {Node}  elem   The element
	 * @param  {Array} styles The styles to add or update
	 */
	var changeStyles = function (elem, styles) {
		styles.forEach(function (style) {
			elem.style[style.name] = style.value;
		});
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
		var remove = Array.prototype.filter.call(elem.style, function (style) {
			var findStyle = find(styleMap, function (newStyle) {
				return newStyle.name === style && newStyle.value === elem.style[style];
			});
			return findStyle === null;
		});

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
		atts.forEach(function (attribute) {
			// If the attribute is a class, use className
			// Else if it's style, diff and update styles
			// Otherwise, set is as a property of the element
			if (attribute.att === 'class') {
				elem.className = attribute.value;
			} else if (attribute.att === 'style') {
				diffStyles(elem, attribute.value);
			} else {
				elem.setAttribute(attribute.att, attribute.value || true);
			}
		});
	};

	/**
	 * Remove attributes from an element
	 * @param {Node}  elem The element
	 * @param {Array} atts The attributes to remove
	 */
	var removeAttributes = function (elem, atts) {
		atts.forEach(function (attribute) {
			// If the attribute is a class, use className
			// Else if it's style, remove all styles
			// Otherwise, use removeAttribute()
			if (attribute.att === 'class') {
				elem.className = '';
			} else if (attribute.att === 'style') {
				removeStyles(elem, Array.prototype.slice.call(elem.style));
			} else {
				elem.removeAttribute(attribute.att);
			}
		});
	};

	/**
	 * Create an array of the attributes on an element
	 * @param  {NamedNodeMap} attributes The attributes on an element
	 * @return {Array}                   The attributes on an element as an array of key/value pairs
	 */
	var getAttributes = function (attributes) {
		return Array.prototype.map.call(attributes, function (attribute) {
			return {
				att: attribute.name,
				value: attribute.value
			};
		});
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
			elem.children.forEach(function (childElem) {
				node.appendChild(makeElem(childElem));
			});
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
		var remove = existing.atts.filter(function (att) {
			var getAtt = find(template.atts, function (newAtt) {
				return att.att === newAtt.att;
			});
			return getAtt === null;
		});

		// Get attributes to change
		var change = template.atts.filter(function (att) {
			var getAtt = find(existing.atts, function (existingAtt) {
				return att.att === existingAtt.att;
			});
			return getAtt === null || getAtt.value !== att.value;
		});

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
		templateMap.forEach(function (node, index) {

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
			var isPolyp = polyps.filter(function (polyp) {
				return node.node.nodeType !== 3 && node.node.matches(polyp);
			});
			if (isPolyp.length > 0) return;

			// If content is different, update it
			if (templateMap[index].content !== domMap[index].content) {
				domMap[index].node.textContent = templateMap[index].content;
			}

			// Repeat for child elements
			if (node.children.length > 0) {
				diff(node.children, domMap[index].children || [], domMap[index].node, polyps);
			}

		});

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
				atts: node.nodeType !== 1 ? [] : getAttributes(node.attributes),
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
		polyps.forEach(function (coral) {
			if (coral.attached.indexOf(reef) > -1) throw new Error('ReefJS: ' + reef.elem + ' has attached nodes that it is also attached to, creating an infinite loop.');
			if ('render' in coral) coral.render();
		});
	};

	/**
	 * Convert a template string into HTML DOM nodes
	 * @param  {String} str The template string
	 * @return {Node}       The template HTML
	 */
	var stringToHTML = function (str) {
		parser = parser || new DOMParser();
		var doc = parser.parseFromString(str, 'text/html');
		return doc.body;
	};

	var sanitize = function (str, options) {
		if (!window.DOMPurify) throw new Error('You are using the unsafe version of Reef. Please use the full version to sanitize your templates.');
		return DOMPurify.sanitize(str, options);
	};

	/**
	 * Render a template into the DOM
	 * @return {Node}  The element
	 */
	Component.prototype.render = function () {

		// If this is used only for data, render attached and bail
		if (this.lagoon) {
			renderPolyps(this.attached, this);
			return;
		}

		// Make sure there's a template
		if (!this.template) throw new Error('Reef.js: No template was provided.');

		// If elem is an element, use it.
		// If it's a selector, get it.
		var elem = typeof this.elem === 'string' ? document.querySelector(this.elem) : this.elem;

		if (!elem) throw new Error('Reef.js: The DOM element to render your template into was not found.');

		// Get the template
		var template = (typeof this.template === 'function' ? this.template(clone(this.data)) : this.template);
		if (['string', 'number'].indexOf(typeof template) === -1) return;

		// Create DOM maps of the template and target element
		template = this.sanitize ? sanitize(template, this.sanitizeOptions) : template;
		var templateMap = createDOMMap(stringToHTML(template));
		var domMap = createDOMMap(elem);

		// Diff and update the DOM
		var polyps = this.attached.map(function (polyp) { return polyp.elem; });
		diff(templateMap, domMap, elem, polyps);

		// Dispatch a render event
		if (typeof window.CustomEvent === 'function') {
			var event = new CustomEvent('render', {
				bubbles: true
			});
			elem.dispatchEvent(event);
		}

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
		return clone(this.data);
	};

	/**
	 * Update the data property and re-render
	 * @param {Object} obj The data to merge into the existing state
	 */
	Component.prototype.setData = function (obj) {
		if (trueTypeOf(obj) !== 'object') throw new Error('ReefJS: The provided data is not an object.');
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
		this.attached = this.attached.filter(function (polyp) {
			if (isArray) {
				return coral.indexOf(polyp) === -1;
			} else {
				return polyp !== coral;
			}
		});
	};


	//
	// Export public methods
	//

	return Component;

});