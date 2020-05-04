/*! Reef v7.0.1 | (c) 2020 Chris Ferdinandi | MIT License | http://github.com/cferdinandi/reef */
define(function () { 'use strict';

	//
	// Variables
	//

	// Attributes that might be changed dynamically
	var dynamicAttributes = ['checked', 'selected', 'value'];

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

	var matches = function (elem, selector) {
		return (Element.prototype.matches && elem.matches(selector)) || (Element.prototype.msMatchesSelector && elem.msMatchesSelector(selector)) || (Element.prototype.webkitMatchesSelector && elem.webkitMatchesSelector(selector));
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
		if (type === 'string' && !allowHTML) {
			var temp = document.createElement('div');
			temp.textContent = obj;
			return temp.innerHTML;
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
			},
			deleteProperty: function (obj, prop) {
				delete obj[prop];
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

	var makeProxy = function (options, instance) {
		if (options.setters) return !options.store ? options.data : null;
		return options.data && !options.store ? new Proxy(options.data, dataHandler(instance)) : null;
	};

	/**
	 * Create the Reef object
	 * @param {String|Node} elem    The element to make into a component
	 * @param {Object}      options The component options
	 */
	var Reef = function (elem, options) {

		// Make sure an element is provided
		if (!elem && (!options || !options.lagoon)) return err('You did not provide an element to make into a component.');

		// Make sure a template is provided
		if (!options || (!options.template && !options.lagoon)) return err('You did not provide a template for this component.');

		// Set the component properties
		var _this = this;
		var _data = makeProxy(options, _this);
		var _store = options.store;
		var _setters = options.setters;
		var _getters = options.getters;
		_this.debounce = null;

		// Create properties for stuff
		Object.defineProperties(this, {
			elem: {value: elem},
			template: {value: options.template},
			allowHTML: {value: options.allowHTML},
			lagoon: {value: options.lagoon},
			store: {value: _store},
			attached: {value: []}
		});

		// Define setter and getter for data
		Object.defineProperty(_this, 'data', {
			get: function () {
				return _setters ? clone(_data, true) : _data;
			},
			set: function (data) {
				if (_store || _setters) return true;
				_data = new Proxy(data, dataHandler(_this));
				debounceRender(_this);
				return true;
			}
		});

		if (_setters && !_store) {
			Object.defineProperty(_this, 'do', {
				value: function (id) {
					if (!_setters[id]) return err('There is no setter with this name.');
					var args = Array.prototype.slice.call(arguments);
					args[0] = _data;
					_setters[id].apply(_this, args);
					debounceRender(_this);
				}
			});
		}

		if (_getters && !_store) {
			Object.defineProperty(_this, 'get', {
				value: function (id) {
					if (!_getters[id]) return err('There is no getter with this name.');
					return _getters[id](_data);
				}
			});
		}

		// Attach to store
		if (_store && 'attach' in _store) {
			_store.attach(_this);
		}

		// Attach linked components
		if (options.attachTo) {
			var _attachTo = trueTypeOf(options.attachTo) === 'array' ? option.attachTo : [options.attachTo];
			_attachTo.forEach(function (coral) {
				if ('attach' in coral) {
					coral.attach(_this);
				}
			});
		}

	};

	/**
	 * Store constructor
	 * @param {Object} options The data store options
	 */
	Reef.Store = function (options) {
		options.lagoon = true;
		return new Reef(null, options);
	};

	/**
	 * Create an array map of style names and values
	 * @param  {String} styles The styles
	 * @return {Array}         The styles
	 */
	var getStyleMap = function (styles) {
		return styles.split(';').reduce(function (arr, style) {
			if (style.indexOf(':') > 0) {
				var styleArr = style.trim().split(':');
				arr.push({
					name: styleArr[0] ? styleArr[0].trim() : '',
					value: styleArr[1] ? styleArr[1].trim() : ''
				});
			}
			return arr;
		}, []);
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
	 * Get default* attributes to use on initial render
	 * @param  {Array}   atts        The attributes on a node
	 * @param  {Boolean} firstRender If true, this is the fist render
	 * @return {Array}               Attributes, include default values
	 */
	var getDefaultAttributes = function (atts, firstRender) {
		return atts.reduce(function (atts, attribute) {
			if (attribute.att.length > 7 && attribute.att.slice(0, 7) === 'default') {
				if (!firstRender) return atts;
				attribute.att = attribute.att.slice(7);
			}
			atts.push(attribute);
			return atts;
		}, []);
	};

	/**
	 * Add attributes to an element
	 * @param {Node}  elem The element
	 * @param {Array} atts The attributes to add
	 */
	var addAttributes = function (elem, atts, firstRender) {
		getDefaultAttributes(atts, firstRender).forEach(function (attribute) {
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
						elem[attribute.att] = attribute.value;
						if (!elem[attribute.att]) {
							elem[attribute.att] = true;
						}
					} catch (e) {}
				}
				try {
					elem.setAttribute(attribute.att, attribute.value || '');
				} catch (e) {}
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
				if (attribute.att in elem) {
					try {
						elem[attribute.att] = '';
					} catch (e) {}
				}
				try {
					elem.removeAttribute(attribute.att);
				} catch (e) {}
			}
		});
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
	 * @param  {Node}    node       The node
	 * @param  {Array}   atts       The static attributes
	 * @param  {Boolean} isTemplate If true, these are for the template
	 */
	var getDynamicAttributes = function (node, atts, isTemplate) {
		// if (isTemplate) return;
		dynamicAttributes.forEach(function (prop) {
			if (!node[prop] || (isTemplate && node.tagName.toLowerCase() === 'option' && prop === 'selected') || (isTemplate && node.tagName.toLowerCase() === 'select' && prop === 'value')) return;
			atts.push(getAttribute(prop, node[prop]));
		});
	};

	/**
	 * Get base attributes for a node
	 * @param  {Node} node The node
	 * @return {Array}     The node's attributes
	 */
	var getBaseAttributes = function (node, isTemplate) {
		return Array.prototype.reduce.call(node.attributes, function (arr, attribute) {
			if (dynamicAttributes.indexOf(attribute.name) < 0 || (isTemplate && attribute.name === 'selected')) {
				arr.push(getAttribute(attribute.name, attribute.value));
			}
			return arr;
		}, []);
	};

	/**
	 * Create an array of the attributes on an element
	 * @param  {Node}    node       The node to get attributes from
	 * @return {Array}              The attributes on an element as an array of key/value pairs
	 */
	var getAttributes = function (node, isTemplate) {
		var atts = getBaseAttributes(node, isTemplate);
		getDynamicAttributes(node, atts, isTemplate);
		return atts;
	};

	/**
	 * Make an HTML element
	 * @param  {Object} elem The element details
	 * @return {Node}        The HTML element
	 */
	var makeElem = function (elem) {

		// Create the element
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
		addAttributes(node, elem.atts, true);

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
			if (dynamicAttributes.indexOf(att.att) > -1) return false;
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
				return node.node.nodeType !== 3 && matches(node.node, polyp);
			});
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
				domMap[index].node.appendChild(fragment);
				return;
			}

			// If there are existing child elements that need to be modified, diff them
			if (node.children.length > 0) {
				diff(node.children, domMap[index].children, domMap[index].node, polyps);
			}

		});

	};

	/**
	 * Create a DOM Tree Map for an element
	 * @param  {Node}    element    The element to map
	 * @param  {Boolean} isSVG      If true, the node is an SVG
	 * @return {Array}          A DOM tree map
	 */
	var createDOMMap = function (element, isSVG, isTemplate) {
		return Array.prototype.map.call(element.childNodes, (function (node) {
			var details = {
				content: node.childNodes && node.childNodes.length > 0 ? null : node.textContent,
				atts: node.nodeType !== 1 ? [] : getAttributes(node, isTemplate),
				type: node.nodeType === 3 ? 'text' : (node.nodeType === 8 ? 'comment' : node.tagName.toLowerCase()),
				node: node
			};
			details.isSVG = isSVG || details.type === 'svg';
			details.children = createDOMMap(node, details.isSVG, isTemplate);
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
			if (coral.attached.indexOf(reef) > -1) return err('' + reef.elem + ' has attached nodes that it is also attached to, creating an infinite loop.');
			if ('render' in coral) debounceRender(coral);
		});
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
				Array.prototype.slice.call(doc.head.childNodes).reverse().forEach(function (node) {
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

	/**
	 * Emit a custom event
	 * @param  {Node}   elem   The element to emit the custom event on
	 * @param  {String} name   The name of the custom event
	 * @param  {*}      detail Details to attach to the event
	 */
	Reef.emit = function (elem, name, detail) {
		var event;
		if (!elem || !name) return err('You did not provide an element or event name.');
		event = new CustomEvent(name, {
			bubbles: true,
			detail: detail
		});
		elem.dispatchEvent(event);
	};

	/**
	 * Render a template into the DOM
	 * @return {Node}  The elemenft
	 */
	Reef.prototype.render = function () {

		// If this is used only for data, render attached and bail
		if (this.lagoon) {
			renderPolyps(this.attached, this);
			return;
		}

		// Make sure there's a template
		if (!this.template) return err('No template was provided.');

		// If elem is an element, use it.
		// If it's a selector, get it.
		var elem = trueTypeOf(this.elem) === 'string' ? document.querySelector(this.elem) : this.elem;
		if (!elem) return err('The DOM element to render your template into was not found.');

		// Get the data (if there is any)
		var data = clone((this.store ? this.store.data : this.data) || {}, this.allowHTML);

		// Get the template
		var template = (trueTypeOf(this.template) === 'function' ? this.template(data) : this.template);
		if (['string', 'number'].indexOf(trueTypeOf(template)) === -1) return;

		// If UI is unchanged, do nothing
		if (elem.innerHTML === template.innerHTML) return;

		// Create DOM maps of the template and target element
		var templateMap = createDOMMap(stringToHTML(template), false, true);
		var domMap = createDOMMap(elem);

		// Diff and update the DOM
		var polyps = this.attached.map(function (polyp) { return polyp.elem; });
		diff(templateMap, domMap, elem, polyps);

		// Dispatch a render event
		Reef.emit(elem, 'render', data);

		// If there are linked Reefs, render them, too
		renderPolyps(this.attached, this);

		// Return the elem for use elsewhere
		return elem;

	};

	/**
	 * Attach a component to this one
	 * @param  {Function|Array} coral The component(s) to attach
	 */
	Reef.prototype.attach = function (coral) {
		if (trueTypeOf(coral) === 'array') {
			this.attached.concat(coral);
			// Array.prototype.push.apply(this.attached, coral);
		} else {
			this.attached.push(coral);
		}
	};

	/**
	 * Detach a linked component to this one
	 * @param  {Function|Array} coral The linked component(s) to detach
	 */
	Reef.prototype.detach = function (coral) {
		var isArray = trueTypeOf(coral) === 'array';
		this.attached = this.attached.filter(function (polyp) {
			if (isArray) {
				return coral.indexOf(polyp) === -1;
			} else {
				return polyp !== coral;
			}
		});
	};

	/**
	 * Turn debug mode on or off
	 * @param  {Boolean} on If true, turn debug mode on
	 */
	Reef.debug = function (on) {
		debug = on ? true : false;
	};

	// Expose the clone method externally
	Reef.clone = clone;


	//
	// Set support
	//

	support = checkSupport();

	return Reef;

});
