/*! reef v13.0.2 | (c) 2023 Chris Ferdinandi | MIT License | http://github.com/cferdinandi/reef */
var reef = (function (exports) {
	'use strict';

	/**
	 * Emit a custom reefevent
	 * @param  {String} type   The event type
	 * @param  {*}      detail Any details to pass along with the event
	 * @param  {Node}   elem   The element to emit the event on
	 */
	function emit (type, detail, elem = document) {

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
	 * Get the element from the UI
	 * @param  {String|Node} elem The element or selector string
	 * @return {Node}             The element
	 */
	function getElem (elem) {
		return typeof elem === 'string' ? document.querySelector(elem) : elem;
	}

	/**
	 * Get an object's type
	 * @param  {*}      obj The object
	 * @return {String}     The type
	 */
	function getType (obj) {
		return Object.prototype.toString.call(obj).slice(8, -1).toLowerCase();
	}

	/**
	 * Create a Proxy handler object
	 * @param  {String} name The custom event namespace
	 * @param  {Object} data The data object
	 * @return {Object}      The handler object
	 */
	function handler (name, data) {
		let type = 'signal' + (name ? `-${name}` : '');
		return {
			get (obj, prop) {
				if (prop === '_isSignal') return true;
				if (['object', 'array'].includes(getType(obj[prop])) && !obj[prop]._isSignal) {
					obj[prop] = new Proxy(obj[prop], handler(name));
				}
				return obj[prop];
			},
			set (obj, prop, value) {
				if (obj[prop] === value) return true;
				obj[prop] = value;
				emit(type, {prop, value, action: 'set'});
				return true;
			},
			deleteProperty (obj, prop) {
				delete obj[prop];
				emit(type, {prop, value: obj[prop], action: 'delete'});
				return true;
			}
		};
	}

	/**
	 * Create a new signal
	 * @param  {Object} data The data object
	 * @param  {String} name The custom event namespace
	 * @return {Proxy}       The signal Proxy
	 */
	function signal (data = {}, name = '') {
		data = ['array', 'object'].includes(getType(data)) ? data : {value: data};
		return new Proxy(data, handler(name));
	}

	/**
	 * Store Class
	 */
	class Store {

		/**
		 * The constructor object
		 * @param  {Object} data    The data object
		 * @param  {Object} actions The store functions
		 * @param  {String} name    The custom event namespace for the signal
		 */
		constructor (data, actions, name = '') {

			// Get signal type
			let type = 'signal' + (name ? `-${name}` : '');

			// Create data property setter/getter
			Object.defineProperties(this, {
				value: {
					get () {
						return structuredClone(data);
					},
					set () {
						return true;
					}
				}
			});

			// Add store functions
			for (let fn in actions) {
				if (typeof actions[fn] !== 'function') continue;
				this[fn] = function (...args) {
					actions[fn](data, ...args);
					emit(type, data);
				};
			}

		}

	}

	/**
	 * Create a new store
	 * @param  {Object} data    The data object
	 * @param  {Object} setters The store functions
	 * @param  {String} name    The custom event namespace for the signal
	 * @return {Proxy}          The Store instance
	 */
	function store (data = {}, setters = {}, name = '') {
		return new Store(data, setters, name);
	}

	// Form fields and attributes that can be modified by users
	// They also have implicit values that make it hard to know if they were changed by the user or developer
	let formFields = ['input', 'option', 'textarea'];
	let formAtts = ['value', 'checked', 'selected'];
	let formAttsNoVal = ['checked', 'selected'];

	/**
	 * Convert a template string into HTML DOM nodes
	 * @param  {String}  str The template string
	 * @return {Element}     The template HTML
	 */
	function stringToHTML (str) {

		// Create document
		let parser = new DOMParser();
		let doc = parser.parseFromString(`<body><template>${str}</template></body>`, 'text/html');

		// If there's a body, return it
		if (doc.body) {
			return doc.body.firstElementChild.content;
		}

		// Otherwise, create a body and return it
		return document.createElement('body');

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
	 * Add an event listener to an element
	 * @param  {Element} elem   The element to delegate events on
	 * @param  {String}  event  The event name
	 * @param  {String}  val    The function to run for the event
	 * @param  {Object}  events The allowed event functions
	 */
	function listen (elem, event, val, events) {

		// Only run if there are events
		if (!event.startsWith('on') || !events) return;

		// If there's already a listener for this event, skip
		if (!!elem[event]) return;

		// Get the event listener ID
		let fnName = val.split('(')[0];
		let listener = events[fnName];
		if (!listener) return;

		// Start listening
		elem[event] = listener;

	}

	/**
	 * Check if attribute should be skipped (sanitize properties)
	 * @param  {String}  name   The attribute name
	 * @param  {String}  value  The attribute value
	 * @return {Boolean}        If true, skip the attribute
	 */
	function skipAttribute (name, value) {
		let val = value.replace(/\s+/g, '').toLowerCase();
		if (['src', 'href', 'xlink:href'].includes(name)) {
			if (val.includes('javascript:') || val.includes('data:text/html')) return true;
		}
		if (name.startsWith('on') || name.startsWith('@on') || name.startsWith('#on')) return true;
	}

	/**
	 * Add an attribute to an element
	 * @param {Node}   elem   The element
	 * @param {String} att    The attribute
	 * @param {String} val    The value
	 * @param {Object} events The allowed event functions
	 */
	function addAttribute (elem, att, val, events) {

		// If there's an event object, add listener
		listen(elem, att, val, events);

		// Sanitize dangerous attributes
		if (skipAttribute(att, val)) return;

		// If it's a form attribute, set the property directly
		if (formAtts.includes(att)) {
			elem[att] = att === 'value' ? val : ' ';
		}

		// Update the attribute
		elem.setAttribute(att, val);

	}

	/**
	 * Remove an attribute from an element
	 * @param {Node}   elem The element
	 * @param {String} att  The attribute
	 */
	function removeAttribute (elem, att) {

		// If it's a form attribute, remove the property directly
		if (formAtts.includes(att)) {
			elem[att] = '';
		}

		// Remove the attribute
		elem.removeAttribute(att);

	}

	/**
	 * Compare the existing node attributes to the template node attributes and make updates
	 * @param  {Node}   template The new template
	 * @param  {Node}   existing The existing DOM node
	 * @param  {Object} events   The allowed event functions
	 */
	function diffAttributes (template, existing, events) {

		// If the node is not an element, bail
		if (template.nodeType !== 1) return;

		// Get attributes for the template and existing DOM
		let templateAtts = template.attributes;
		let existingAtts = existing.attributes;

		// Add and update attributes from the template into the DOM
		for (let {name, value} of templateAtts) {

			// Skip [#*] attributes
			if (name.startsWith('#')) continue;

			// Skip user-editable form field attributes
			if (formAtts.includes(name) && formFields.includes(template.tagName.toLowerCase())) continue;

			// Convert [@*] names to their real attribute name
			let attName = name.startsWith('@') ? name.slice(1) : name;

			// If its a no-value property and it's falsy remove it
			if (formAttsNoVal.includes(attName) && isFalsy(value)) {
				removeAttribute(existing, attName);
				continue;
			}

			// Otherwise, add the attribute
			addAttribute(existing, attName, value, events);

		}

		// Remove attributes from the DOM that shouldn't be there
		for (let {name, value} of existingAtts) {

			// If the attribute exists in the template, skip it
			if (templateAtts[name]) continue;

			// Skip user-editable form field attributes
			if (formAtts.includes(name) && formFields.includes(existing.tagName.toLowerCase())) continue;

			// Otherwise, remove it
			removeAttribute(existing, name);

		}

	}

	/**
	 * Add default attributes to a newly created element
	 * @param  {Node}   elem   The element
	 * @param  {Object} events The allowed event functions
	 */
	function addDefaultAtts (elem, events) {

		// Only run on elements
		if (elem.nodeType !== 1) return;

		// Remove [@*] and [#*] attributes and replace them with the plain attributes
		// Remove unsafe HTML attributes
		for (let {name, value} of elem.attributes) {

			// If the attribute should be skipped, remove it
			if (skipAttribute(name, value)) {
				removeAttribute(elem, name);
				listen(elem, name, value, events);
				continue;
			}

			// If the attribute isn't a [@*] or [#*], skip it
			if (!name.startsWith('@') && !name.startsWith('#')) continue;

			// Get the plain attribute name
			let attName = name.slice(1);

			// Remove the [@*] or [#*] attribute
			removeAttribute(elem, name);

			// If it's a no-value attribute and its falsy, skip it
			if (formAttsNoVal.includes(attName) && isFalsy(value)) continue;

			// Add the plain attribute
			addAttribute(elem, attName, value, events);

		}

		// If there are child elems, recursively add defaults to them
		if (elem.childNodes) {
			for (let node of elem.childNodes) {
				addDefaultAtts(node, events);
			}
		}

	}

	/**
	 * Get the content from a node
	 * @param  {Node}   node The node
	 * @return {String}      The content
	 */
	function getNodeContent (node) {
		return node.childNodes && node.childNodes.length ? null : node.textContent;
	}

	/**
	 * Check if two nodes are different
	 * @param  {Node}    node1 The first node
	 * @param  {Node}    node2 The second node
	 * @return {Boolean}       If true, they're not the same node
	 */
	function isDifferentNode (node1, node2) {
		return (
			(typeof node1.nodeType === 'number' && node1.nodeType !== node2.nodeType) ||
			(typeof node1.tagName === 'string' && node1.tagName !== node2.tagName) ||
			(typeof node1.id === 'string' && !!node1.id && node1.id !== node2.id) ||
			('getAttribute' in node1 && 'getAttribute' in node2 && node1.getAttribute('key') !== node2.getAttribute('key')) ||
			(typeof node1.src === 'string' && !!node1.src && node1.src !== node2.src)
		);
	}

	/**
	 * Check if the desired node is further ahead in the current DOM tree branch
	 * @param  {Node}     node     The node to look for
	 * @param  {NodeList} existing The existing nodes in the DOM
	 * @return {Node}              The element from the DOM
	 */
	function aheadInTree (node, existing) {

		// If the node isn't an element, bail
		if (node.nodeType !== 1) return;

		// Look for the ID or [key] attribute
		let id = node.getAttribute('id');
		let key = node.getAttribute('key');
		if (!id || !key) return;

		// Use the ID or [key] as the selector
		let selector = id ? `#${id}` : `[key="${key}"]`;

		// Look for the corresponding element in the DOM
		return existing.querySelector(`:scope > ${selector}`);

	}

	/**
	 * If there are extra elements in DOM, remove them
	 * @param  {Array} existingNodes The existing DOM nodes
	 * @param  {Array} templateNodes The template nodes
	 */
	function trimExtraNodes (existingNodes, templateNodes) {
		let extra = existingNodes.length - templateNodes.length;
		if (extra < 1)  return;
		for (; extra > 0; extra--) {
			existingNodes[existingNodes.length - 1].remove();
		}
	}

	/**
	 * Remove scripts from HTML
	 * @param  {Node} elem The element to remove scripts from
	 */
	function removeScripts (elem) {
		let scripts = elem.querySelectorAll('script');
		for (let script of scripts) {
			script.remove();
		}
	}

	/**
	 * Diff the existing DOM node versus the template
	 * @param  {Array}  template The template HTML
	 * @param  {Node}   existing The current DOM HTML
	 * @param  {Object} events   The allowed event functions
	 */
	function diff (template, existing, events) {

		// Get the nodes in the template and existing UI
		let templateNodes = template.childNodes;
		let existingNodes = existing.childNodes;

		// Don't inject scripts
		if (removeScripts(template)) return;

		// Loop through each node in the template and compare it to the matching element in the UI
		templateNodes.forEach(function (node, index) {

			// If there's no existing element, create and append
			if (!existingNodes[index]) {
				let clone = node.cloneNode(true);
				addDefaultAtts(clone, events);
				existing.append(clone);
				return;
			}

			// If there is, but it's not the same node type...
			if (isDifferentNode(node, existingNodes[index])) {

				// Check if node exists further in the tree
				let ahead = aheadInTree(node, existing);

				// If not, insert the new node before the current one
				if (!ahead) {
					let clone = node.cloneNode(true);
					addDefaultAtts(clone, events);
					existingNodes[index].before(clone);
					return;
				}

				// Otherwise, move existing node to the current spot
				existingNodes[index].before(ahead);

			}

			// Stop diffing if element should be ignored
			if (templateNodes[index] && 'hasAttribute' in templateNodes[index] && templateNodes[index].hasAttribute('reef-ignore')) return;

			// If attributes are different, update them
			diffAttributes(node, existingNodes[index], events);

			// Stop diffing if a native web component
			if (node.nodeName.includes('-')) return;

			// If content is different, update it
			let templateContent = getNodeContent(node);
			if (templateContent && templateContent !== getNodeContent(existingNodes[index])) {
				existingNodes[index].textContent = templateContent;
			}

			// If there shouldn't be child nodes but there are, remove them
			if (!node.childNodes.length && existingNodes[index].childNodes.length) {
				existingNodes[index].innerHTML = '';
				return;
			}

			// If DOM is empty and shouldn't be, build it up
			// This uses a document fragment to minimize reflows
			if (!existingNodes[index].childNodes.length && node.childNodes.length) {
				let fragment = document.createDocumentFragment();
				diff(node, fragment, events);
				existingNodes[index].appendChild(fragment);
				return;
			}

			// If there are nodes within it, recursively diff those
			if (node.childNodes.length) {
				diff(node, existingNodes[index], events);
			}

		});

		// If extra elements in DOM, remove them
		trimExtraNodes(existingNodes, templateNodes);

	}

	/**
	 * Render a template into the UI
	 * @param  {Node|String} elem     The element or selector to render the template into
	 * @param  {String}      template The template to render
	 * @param  {Object}      events   The allowed event functions
	 */
	function render (elem, template, events) {
		let node = getElem(elem);
		let html = stringToHTML(template);
		if (!emit('before-render', null, node)) return;
		diff(html, node, events);
		emit('render', null, node);
	}

	/**
	 * Create the event handler function
	 * @param {Class} instance The Component instance
	 */
	function createHandler (instance) {
		return function handler (event) {
			instance.render();
		};
	}

	/**
	 * Component Class
	 */
	class Component {

		/**
		 * The constructor object
		 * @param  {Node|String} elem            The element or selector to render the template into
		 * @param  {Function}    template        The template function to run when the data updates
		 * @param  {Object}      options         Additional options
		 * @param  {Array}       options.signals The names of the signals to listen for
		 * @param  {Object}      options.events  The allowed event functions
		 */
		constructor (elem, template, options) {

			// Create instance properties
			this.elem = elem;
			this.template = template;
			this.signals = options.signals ? options.signals.map((signal) => `reef:signal-${signal}`) : ['reef:signal'];
			this.events = options.events;
			this.handler = createHandler(this);
			this.debounce = null;

			// Init
			this.start();

		}

		/**
		 * Start reactive data rendering
		 */
		start () {
			for (let signal of this.signals) {
				document.addEventListener(signal, this.handler);
			}
			this.render();
			emit('start', null, getElem(this.elem));
		}

		/**
		 * Stop reactive data rendering
		 */
		stop () {
			for (let signal of this.signals) {
				document.removeEventListener(signal, this.handler);
			}
			emit('stop', null, getElem(this.elem));
		}

		/**
		 * Render the UI
		 */
		render () {

			// Cache instance
			let self = this;

			// If there's a pending render, cancel it
			if (self.debounce) {
				window.cancelAnimationFrame(self.debounce);
			}

			// Setup the new render to run at the next animation frame
			self.debounce = window.requestAnimationFrame(function () {
				render(self.elem, self.template(), self.events);
			});

		}

	}

	/**
	 * Create a new listener
	 * @param  {Node|String} elem     The element or selector to render the template into
	 * @param  {Function}    template The template function to run when the data updates
	 * @param  {Object}      options  Additional options
	 */
	function component (elem, template, options = {}) {
		return new Component(elem, template, options);
	}

	// Hold the selector for the element to focus on
	let focusOn;

	/**
	 * Set focus on the element
	 * 1ms delay prevents odd bugs from browser-native focus shifts
	 */
	function setFocus () {
		setTimeout(function () {

			// Find target element in the DOM
			let elem = document.querySelector(focusOn);
			focusOn = null;
			if (!elem) return;

			// Try to focus element
			elem.focus();
			if (document.activeElement === elem) return;

			// If element could not be focused, set a tabindex and try again
			elem.setAttribute('tabindex', -1);
			elem.focus();

		}, 1);
	}

	/**
	 * Shift focus to trigger a screen reader announcement after content is loaded
	 */
	function focus (selector) {
		if (!selector || typeof selector !== 'string') return;
		focusOn = selector;
		document.addEventListener('reef:render', setFocus, {once: true});
	}

	exports.component = component;
	exports.focus = focus;
	exports.render = render;
	exports.signal = signal;
	exports.store = store;

	Object.defineProperty(exports, '__esModule', { value: true });

	return exports;

})({});
//# sourceMappingURL=reef.js.map
