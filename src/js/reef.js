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

	// Attribute exceptions for use with setAttribute()
	var attributeExceptions = ['for'];

	// Setup parser variable
	var parser;


	//
	// Methods
	//

	/**
	 * Check feature support
	 */
	var supports = function () {
		if (!Array.from || !window.DOMParser) return false;
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
		if (!options || !options.template && (!options || !options.lagoon)) throw new Error('Reef.js: You did not provide a template for this component.');

		// Set the component properties
		this.elem = elem;
		this.data = options.data;
		this.template = options.template;
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
	 * Check if setAttribute() should be used for this attribute
	 * @param  {String} att The attribute type
	 * @return {Boolean}    Returns true if setAttribute() should be used
	 */
	var useSetAttribute = function (att) {
		return att.slice(0, 5) === 'data-' || attributeExceptions.indexOf(att) > -1;
	};

	/**
	 * Add attributes to an element
	 * @param {Node}  elem The element
	 * @param {Array} atts The attributes to add
	 */
	var addAttributes = function (elem, atts) {
		atts.forEach(function (attribute) {
			// If the attribute is a class, use className
			// Else if it starts with `data-`, use setAttribute()
			// Otherwise, set is as a property of the element
			if (attribute.att === 'class') {
				elem.className = attribute.value;
			} else if (useSetAttribute(attribute.att)) {
				elem.setAttribute(attribute.att, attribute.value);
			} else {
				elem[attribute.att] = attribute.value;
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
			// Otherwise, use removeAttribute()
			if (attribute.att === 'class') {
				elem.className = '';
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
		return Array.from(attributes).map(function (attribute) {
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
		var node = elem.type === 'text' ? document.createTextNode(elem.content) : document.createElement(elem.type);

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
			var getAtt = template.atts.find(function (newAtt) {
				return att.att === newAtt.att;
			});
			return getAtt === undefined;
		});

		// Get attributes to change
		var change = template.atts.filter(function (att) {
			var getAtt = existing.atts.find(function (existingAtt) {
				return att.att === existingAtt.att;
			});
			return getAtt === undefined || getAtt.value !== att.value;
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
				domMap[domMap.length - count].node.remove();
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
			diffAtts(templateMap[index], domMap[index], domMap[index].node);

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
	var createDOMMap = function (element) {
		var map = [];
		Array.from(element.childNodes).forEach(function (node) {
			map.push({
				content: node.childNodes && node.childNodes.length > 0 ? null : node.textContent,
				atts: node.nodeType === 3 ? [] : getAttributes(node.attributes),
				type: node.nodeType === 3 ? 'text' : node.tagName.toLowerCase(),
				children: createDOMMap(node),
				node: node
			});

		});
		return map;
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
		var templateMap = createDOMMap(stringToHTML(template), polyps);
		var domMap = createDOMMap(elem, polyps);

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
	 * Add attribute exceptions
	 * @param {String|Array} att The attribute(s) to add
	 */
	Component.addAttributes = function (atts) {
		if (trueTypeOf(atts) === 'array') {
			Array.prototype.push.apply(attributeExceptions, atts);
		} else {
			attributeExceptions.push(atts);
		}
	};

	/**
	 * Remove attribute exceptions
	 * @param {String|Array} att The attribute(s) to remove
	 */
	Component.removeAttributes = function (atts) {
		var isArray = trueTypeOf(atts) === 'array';
		attributeExceptions = attributeExceptions.filter(function (att) {
			if (isArray) {
				return atts.indexOf(att) === -1;
			} else {
				return att !== atts;
			}
		});
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