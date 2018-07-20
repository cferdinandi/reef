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

	/**
	 * Create the Component object
	 * @param {String|Node} elem    The element to make into a component
	 * @param {Object}      options The component options
	 */
	var Component = function (elem, options) {

		// Check browser support
		if (!('DOMParser' in window)) throw 'Reef.js is not supported by this browser.';

		// Make sure an element is provided
		if (!elem) throw 'Reef.js: You did not provide an element to make into a component.';

		// Make sure a template is provided
		if (!options || !options.template) throw 'Reef.js: You did not provide a template for this component.';

		// Set the component properties
		this.elem = elem;
		this.data = options.data;
		this.template = options.template;

	};

	/**
	 * Add attributes to an element
	 * @param {Node}  elem The element
	 * @param {Array} atts The attributes to add
	 */
	var addAttributes = function (elem, atts) {
		atts.forEach(function (attribute) {
			// If the attribute is a class, use className
			// Otherwise, use setAttribute()
			if (attribute.att === 'class') {
				elem.className = attribute.value;
			} else {
				elem.setAttribute(attribute.att, attribute.value || '');
			}
		});
	};

	/**
	 * Remove attributes from an element
	 * @param {Node}  elem The element
	 * @param {Array} atts The attributes to remove
	 */
	var removeAttribute = function (elem, atts) {
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
	 * Convert a template string into HTML DOM nodes
	 * @param  {String} str The template string
	 * @return {Node}       The template HTML
	 */
	var stringToHTML = function (str) {
		var parser = new DOMParser();
		var doc = parser.parseFromString(str, 'text/html');
		return doc.body;
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
		removeAttribute(existing.node, remove);

	};

	/**
	 * Diff the existing DOM node versus the template
	 * @param  {Array} templateMap A DOM tree map of the template content
	 * @param  {Array} domMap      A DOM tree map of the existing DOM node
	 * @param  {Node}  elem        The element to render content into
	 */
	var diff = function (templateMap, domMap, elem) {

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

			// If content is different, update it
			if (templateMap[index].content !== domMap[index].content) {
				domMap[index].node.textContent = templateMap[index].content;
			}

			// Repeat for child elements
			if (node.children.length > 0) {
				diff(node.children, domMap[index].children || [], domMap[index].node);
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
	 * Sanitize the template string
	 * @param  {String} template The template string
	 * @return {Object}          A sanitized, mapped version of the template
	 */
	var sanitize = function (template) {
		return createDOMMap(stringToHTML(template));
	};

	/**
	 * Render a template into the DOM
	 * @return {[type]}                   The element
	 */
	Component.prototype.render = function () {

		// Check browser support
		if (!('DOMParser' in window)) throw 'Reef.js is not supported by this browser.';

		// Make sure there's a template
		if (!this.template) throw 'Reef.js: No template was provided.';

		// If elem is an element, use it.
		// If it's a selector, get it.
		var elem = typeof this.elem === 'string' ? document.querySelector(this.elem) : this.elem;
		if (!elem) return;

		// Get the template
		var template = (typeof this.template === 'function' ? this.template(this.data) : this.template);
		if (['string', 'number'].indexOf(typeof template) === -1) return;

		// Create DOM maps of the template and target element
		var templateMap = sanitize(template);
		var domMap = createDOMMap(elem);

		// Diff and update the DOM
		diff(templateMap, domMap, elem);

		// Dispatch a render event
		if (typeof window.CustomEvent === 'function') {
			var event = new CustomEvent('render', {
				bubbles: true
			});
			elem.dispatchEvent(event);
		}

		// Return the elem for use elsewhere
		return elem;

	};

	// Export public methods
	return Component;

});