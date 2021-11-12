/*! reef v11.0.0BETA | (c) 2021 Chris Ferdinandi | MIT License | http://github.com/cferdinandi/reef */
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
		return instance.props.map(function (prop) {
			return prop.data;
		});
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
				instance.run();
				return true;
			},
			deleteProperty: function (obj, prop) {
				delete obj[prop];
				instance.run();
				return true;
			}
		};
	}

	/**
	 * Create a proxy from an array or object
	 * @param  {*}        data     The array or object to proxify
	 * @param  {Instance} instance The constructor instance
	 * @return {Proxy}             The proxy
	 */
	function proxify (data, instance) {

		// If an object, make a Proxy
		if (typeof data === 'object') {
			data = new Proxy(data, handler(instance));
		}

		// Return data back out
		return data;

	}

	/**
	 * The Store object
	 * @param {*} data Date to store
	 */
	function Store (data) {

		// Proxify the data
		data = proxify(data, this);

		// Define properties
		this._debounce = null;
		Object.defineProperties(this, {
			data: {
				get: function () {
					return data;
				},
				set: function (val) {

					// If an object, make a Proxy
					data = proxify(val, this);

					// Run functions
					this.run();

					return true;

				}
			},
			fns: {value: []}
		});

	}

	/**
	 * Add functions to run on state update
	 * @param  {...Function} fns One or more functions to run on state update
	 */
	Store.prototype.do = function (...fns) {
		for (let fn of fns) {
			if (this.fns.includes(fn)) continue;
			this.fns.push(fn);
			fn.add(this);
		}
	};

	/**
	 * Stop functions from running on state update
	 * @param  {...Function} fns One or more functions to stop
	 */
	Store.prototype.stop = function (...fns) {
		for (let fn of fns) {
			let index = this.fns.indexOf(fn);
			if (index < 0) return;
			this.fns.splice(index, 1);
			fn.rm(this);
		}
	};

	Store.prototype.run = function () {
		for (let fn of this.fns) {
			fn.run();
		}
	};

	function Constructor (el, fn) {
		Object.defineProperties(this, {
			el: {value: typeof el === 'string' ? document.querySelector(el) : el},
			fn: {value: fn},
			props: {value: []}
		});
		this._debounce = null;
	}

	Constructor.prototype.add = function (props) {
		this.props.push(props);
	};

	Constructor.prototype.rm = function (props) {
		let index = this.props.indexOf(props);
		if (index < 0) return;
		this.props.splice(index, 1);
	};

	function clone (el, fn) {
		function Clone (el, fn) {
			Constructor.call(this, el, fn);
		}
		Clone.prototype = Object.create(Constructor.prototype);
		return Clone;
	}

	// Add run method
	let Text = clone();
	Text.prototype.run = debounce(function () {
		console.log('ran');
		this.el.textContent = this.fn(...props(this));
	});

	function text (el, fn) {
		return new Text(el, fn);
	}

	// Add run method
	let HTML = clone();
	HTML.prototype.run = debounce(function () {
		this.el.innerHTML = clean(this.fn(...props(this)));
	});

	function html (el, fn) {
		return new HTML(el, fn);
	}

	// Add run method
	let HTMLUnsafe = clone();
	HTMLUnsafe.prototype.run = function () {
		this.el.innerHTML = this.fn(...props(this));
	};

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
		diff(clean(this.fn(...props(this)), true), this.el);
	});

	function diff$1 (el, fn) {
		return new Diff(el, fn);
	}

	// Add run method
	let DiffUnsafe = clone();
	DiffUnsafe.prototype.run = debounce(function () {
		diff(stringToHTML(this.fn(...props(this))), this.el);
	});

	function diffUnsafe (el, fn) {
		return new DiffUnsafe(el, fn);
	}

	exports.Store = Store;
	exports.diff = diff$1;
	exports.diffUnsafe = diffUnsafe;
	exports.html = html;
	exports.htmlUnsafe = htmlUnsafe;
	exports.text = text;

	return exports;

}({}));
