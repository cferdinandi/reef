/*! reef v11.BETA | (c) 2021 Chris Ferdinandi | MIT License | http://github.com/cferdinandi/reef */
var reef = (function (exports) {
	'use strict';

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

	// Is debugging enabled
	let on = false;

	/**
	 * Turn debugging on or off
	 * @param  {Boolean} val If true, enables debugging
	 */
	function debug (val) {
		on = !!val;
	}

	/**
	 * Show an error message in the console if debugging is enabled
	 * @param  {String} msg The message to log
	 */
	function err (msg) {
		if (on) {
			console.warn('[Reef] ' + msg);
		}
	}

	/**
	 * Run attached functions
	 * @param  {Instance} instance The instantiation
	 */
	function run (instance) {
		for (let fn of instance._fns) {
			fn.run();
		}
	}

	/**
	 * Create settings and getters for data Proxy
	 * @param  {Instance} instance The current instantiation
	 * @return {Object}            The setter and getter methods for the Proxy
	 */
	function handler (instance) {
		return {
			get: function (obj, prop) {
				if (typeof obj[prop] === 'object') {
					return new Proxy(obj[prop], handler(instance));
				}
				return obj[prop];
			},
			set: function (obj, prop, value) {
				if (obj[prop] === value) return true;
				obj[prop] = value;
				run(instance);
				return true;
			},
			deleteProperty: function (obj, prop) {
				delete obj[prop];
				run(instance);
				return true;
			}
		};
	}

	/**
	 * Create a proxy from an array or object
	 * @param  {*}        data     The array or object to proxify
	 * @param  {Instance} instance The constructor instance
	 * @param  {Object}   setters  Setter functions for the instance
	 * @return {Proxy}             The proxy
	 */
	function proxify (data, instance, setters) {

		// If an object, make a Proxy
		if (!setters && typeof data === 'object') {
			data = new Proxy(data, handler(instance));
		}

		// Return data back out
		return data;

	}

	/**
	 * The Store object
	 * @param {*}      data    Data to store
	 * @param {Object} setters Setter functions (optional)
	 */
	function Store (data, setters) {

		// Proxify the data
		data = proxify(data, this, setters);

		// Define properties
		Object.defineProperties(this, {

			// Data setters/getters
			$: {
				get: function () {
					return setters ? copy(data) : data;
				},
				set: function (val) {

					// If setters, do nothing
					if (setters) return true;

					// If an object, make a Proxy
					data = proxify(val, this);

					// Run functions
					run(this);

					return true;

				}
			},

			/**
			 * Run a setter function
			 * @param  {String} key  The setter key
			 * @param  {...*}   args The args for the setter function
			 */
			do: {
				value: function (key, ...args) {
					if (!this._setters) return err('No setters for this store.');
					if (!this._setters[key]) return err(`There is no setter named "${key}"`);
					this._setters[key](data, ...args);
					run(this);
				}
			},

			// Functions and setters
			_fns: {value: []},
			_setters: {value: setters}
		});

		// Emit a custom event
		emit('store', this.$);

	}

	/**
	 * Instantiate a new store
	 * @param  {*}        data    Data to store
	 * @param  {Object}   setters Setter functions (optional)
	 * @return {Instance}         A new Store instance
	 */
	function store (data, setters) {
		return new Store(data, setters);
	}

	/**
	 * Base constructor object for the API methods
	 * @param {String}   el The element seelctor (or the element itself)
	 * @param {Function} fn The function that returns a template string
	 */
	function Constructor (el, fn) {

		// Get element
		el = typeof el === 'string' ? document.querySelector(el) : el;
		if (!el) return err('Element not found.');
		if (!fn) return err('Please provide a function');

		// Set properties
		Object.defineProperties(this, {
			el: {value: typeof el === 'string' ? document.querySelector(el) : el},
			fn: {value: fn},
			$: {value: []}
		});
		this._debounce = null;

	}

	/**
	 * Add stores to the instance
	 * @param  {...Store} props The Store instances to attach
	 */
	Constructor.prototype.use = function (...props) {
		for (let $ of props) {
			if (this.$.includes($)) continue;
			this.$.push($);
			$._fns.push(this);
		}
	};

	/**
	 * Destroy the component
	 */
	Constructor.prototype.destroy = function () {
		if (!emit('destroy-before', this)) return;
		for (let $ of this.$) {
			let index = $._fns.indexOf(this);
			if (index < 0) continue;
			$._fns.splice(index, 1);
		}
		emit('destroy', this);
	};

	/**
	 * Clone the Constructor object
	 * @return {Constructor} The cloned Constructor object
	 */
	function clone () {
		function Clone (el, fn) {
			Constructor.call(this, el, fn);
		}
		Clone.prototype = Object.create(Constructor.prototype);
		return Clone;
	}

	// Add run method
	let Text = clone();
	Text.prototype.run = debounce(function () {
		let $ = props(this);
		if (!emit('text-before', $, this.el)) return;
		this.el.textContent = this.fn(...$);
		emit('text', $, this.el);
	});

	/**
	 * Instantiate a new Text instance
	 * @param  {String}   el The element selector (or element itself)
	 * @param  {Function} fn The function that returns the template string
	 * @return {Instance}    The instantiated instance
	 */
	function text (el, fn) {
		return new Text(el, fn);
	}

	// Add run method
	let HTML = clone();
	HTML.prototype.run = debounce(function () {
		let $ = props(this);
		if (!emit('html-before', $, this.el)) return;
		this.el.innerHTML = clean(this.fn(...$));
		emit('html', $, this.el);
	});

	/**
	 * Instantiate a new HTML instance
	 * @param  {String}   el The element selector (or element itself)
	 * @param  {Function} fn The function that returns the template string
	 * @return {Instance}    The instantiated instance
	 */
	function html (el, fn) {
		return new HTML(el, fn);
	}

	// Add run method
	let HTMLUnsafe = clone();
	HTMLUnsafe.prototype.run = debounce(function () {
		let $ = props(this);
		if (!emit('html-unsafe-before', $, this.el)) return;
		this.el.innerHTML = this.fn(...$);
		emit('html-unsafe', $, this.el);
	});

	/**
	 * Instantiate a new HTMLUnsafe instance
	 * @param  {String}   el The element selector (or element itself)
	 * @param  {Function} fn The function that returns the template string
	 * @return {Instance}    The instantiated instance
	 */
	function htmlUnsafe (el, fn) {
		return new HTMLUnsafe(el, fn);
	}

	// Form fields and attributes that can be modified by users
	// They also have implicit values that make it hard to know if they were changed by the user or developer
	let formFields = ['input', 'option', 'textarea'];
	let formAtts = ['value', 'checked', 'selected'];
	let formAttsNoVal = ['checked', 'selected'];

	/**
	 * Add an attribute to an element
	 * @param {Node}   elem The element
	 * @param {String} att  The attribute
	 * @param {String} val  The value
	 */
	function addAttribute (elem, att, val) {

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
	 * @param  {Node} template The new template
	 * @param  {Node} existing The existing DOM node
	 */
	function diffAttributes (template, existing) {

		// If the node is not an element, bail
		if (template.nodeType !== 1) return;

		// Get attributes for the template and existing DOM
		let templateAtts = template.attributes;
		let existingAtts = existing.attributes;

		// Add and update attributes from the template into the DOM
		for (let {name, value} of templateAtts) {

			// Skip [reef-default-*] attributes
			if (name.slice(0, 13) === 'reef-default-') continue;

			// Skip user-editable form field attributes
			if (formAtts.includes(name) && formFields.includes(template.tagName.toLowerCase())) continue;

			// Convert [reef-*] names to their real attribute name
			let attName = name.replace('reef-', '');

			// If its a no-value property and it's falsey remove it
			if (formAttsNoVal.includes(attName) && isFalsy(value)) {
				removeAttribute(existing, attName);
				continue;
			}

			// Otherwise, add the attribute
			addAttribute(existing, attName, value);

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
	 * @param  {Node} elem The element
	 */
	function addDefaultAtts (elem) {

		// Only run on elements
		if (elem.nodeType !== 1) return;

		// Remove [reef-default-*] and [reef-*] attributes and replace them with the plain attributes
		// Remove unsafe HTML attributes
		for (let {name, value} of elem.attributes) {

			// If the attribute isn't a [reef-default-*] or [reef-*], skip it
			if (name.slice(0, 5) !== 'reef-') continue;

			// Get the plain attribute name
			let attName = name.replace('reef-default-', '').replace('reef-', '');

			// Remove the [reef-default-*] or [reef-*] attribute
			removeAttribute(elem, name);

			// If it's a no-value attribute and its falsy, skip it
			if (formAttsNoVal.includes(attName) && isFalsy(value)) continue;

			// Add the plain attribute
			addAttribute(elem, attName, value);

		}

		// If there are child elems, recursively add defaults to them
		if (elem.childNodes) {
			for (let node of elem.childNodes) {
				addDefaultAtts(node);
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
	 * @param  {Node}  node1 The first node
	 * @param  {Node}  node2 The second node
	 * @return {Boolean}     If true, they're not the same node
	 */
	function isDifferentNode (node1, node2) {
		return (
			node1.nodeType !== node2.nodeType ||
			node1.tagName !== node2.tagName ||
			node1.id !== node2.id ||
			node1.src !== node2.src
		);
	}

	/**
	 * Check if the desired node is further ahead in the DOM existingNodes
	 * @param  {Node}     node           The node to look for
	 * @param  {NodeList} existingNodes  The DOM existingNodes
	 * @param  {Integer}  index          The indexing index
	 * @return {Integer}                 How many nodes ahead the target node is
	 */
	function aheadInTree (node, existingNodes, index) {
		return Array.from(existingNodes).slice(index + 1).find(function (branch) {
			return !isDifferentNode(node, branch);
		});
	}

	/**
	 * If there are extra elements in DOM, remove them
	 * @param  {Array} existingNodes      The existing DOM
	 * @param  {Array} templateNodes The template
	 */
	function trimExtraNodes (existingNodes, templateNodes) {
		let extra = existingNodes.length - templateNodes.length;
		if (extra < 1)  return;
		for (; extra > 0; extra--) {
			existingNodes[existingNodes.length - 1].remove();
		}
	}

	/**
	 * Diff the existing DOM node versus the template
	 * @param  {Array} template The template HTML
	 * @param  {Node}  existing The current DOM HTML
	 */
	function diff (template, existing) {

		// Get the nodes in the template and existing UI
		let templateNodes = template.childNodes;
		let existingNodes = existing.childNodes;

		// Loop through each node in the template and compare it to the matching element in the UI
		templateNodes.forEach(function (node, index) {

			// If element doesn't exist, create it
			if (!existingNodes[index]) {
				addDefaultAtts(node);
				existing.append(node.cloneNode(true));
				return;
			}

			// If there is, but it's not the same node type, insert the new node before the existing one
			if (isDifferentNode(node, existingNodes[index])) {

				// Check if node exists further in the tree
				let ahead = aheadInTree(node, existingNodes, index);

				// If not, insert the node before the current one
				if (!ahead) {
					addDefaultAtts(node);
					existingNodes[index].before(node.cloneNode(true));
					return;
				}

				// Otherwise, move it to the current spot
				existingNodes[index].before(ahead);

			}

			// If content is different, update it
			let templateContent = getNodeContent(node);
			if (templateContent && templateContent !== getNodeContent(existingNodes[index])) {
				existingNodes[index].textContent = templateContent;
			}

			// If attributes are different, update them
			diffAttributes(node, existingNodes[index]);

			// If there shouldn't be child nodes but there are, remove them
			if (!node.childNodes.length && existingNodes[index].childNodes.length) {
				existingNodes[index].innerHTML = '';
				return;
			}

			// If DOM is empty and shouldn't be, build it up
			// This uses a document fragment to minimize reflows
			if (!existingNodes[index].childNodes.length && node.childNodes.length) {
				let fragment = document.createDocumentFragment();
				diff(node, fragment);
				existingNodes[index].appendChild(fragment);
				return;
			}

			// If there are nodes within it, recursively diff those
			if (node.childNodes.length) {
				diff(node, existingNodes[index]);
			}

		});

		// If extra elements in DOM, remove them
		trimExtraNodes(existingNodes, templateNodes);

	}

	// Add run method
	let Diff = clone();
	Diff.prototype.run = debounce(function () {
		let $ = props(this);
		if (!emit('diff-before', $, this.el)) return;
		diff(clean(this.fn(...$), true), this.el);
		emit('diff', $, this.el);
	});

	/**
	 * Instantiate a new Diff instance
	 * @param  {String}   el The element selector (or element itself)
	 * @param  {Function} fn The function that returns the template string
	 * @return {Instance}    The instantiated instance
	 */
	function diff$1 (el, fn) {
		return new Diff(el, fn);
	}

	// Add run method
	let DiffUnsafe = clone();
	DiffUnsafe.prototype.run = debounce(function () {
		let $ = props(this);
		if (!emit('diff-unsafe-before', $, this.el)) return;
		diff(stringToHTML(this.fn(...$)), this.el);
		emit('diff-unsafe', $, this.el);
	});

	/**
	 * Instantiate a new DiffUnsafe instance
	 * @param  {String}   el The element selector (or element itself)
	 * @param  {Function} fn The function that returns the template string
	 * @return {Instance}    The instantiated instance
	 */
	function diffUnsafe (el, fn) {
		return new DiffUnsafe(el, fn);
	}

	exports.debug = debug;
	exports.diff = diff$1;
	exports.diffUnsafe = diffUnsafe;
	exports.html = html;
	exports.htmlUnsafe = htmlUnsafe;
	exports.store = store;
	exports.text = text;

	return exports;

}({}));
