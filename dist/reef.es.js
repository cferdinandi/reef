/*! Reef v10.0.0 | (c) 2021 Chris Ferdinandi | MIT License | http://github.com/cferdinandi/reef */
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
function isFalsy (str) {
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
 * @param  {*} obj The object to clone
 * @return {*}     The immutable, encoded object
 */
function copy (obj) {

	/**
	 * Copy properties from the original object to the clone
	 * @param {Object|Function} clone The cloned object
	 */
	function copyProps (clone) {
		for (let key in obj) {
			if (obj.hasOwnProperty(key)) {
				clone[key] = copy(obj[key]);
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
			return copy(item);
		});
	}

	/**
	 * Create an immutable copy of a Map
	 * @return {Map}
	 */
	function cloneMap () {
		let clone = new Map();
		for (let [key, val] of obj) {
			clone.set(key, copy(val));
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
			clone.add(copy(item));
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

	// Get object type
	let type = trueTypeOf(obj);

	// Return a clone based on the object type
	if (type === 'object') return cloneObj();
	if (type === 'array') return cloneArr();
	if (type === 'map') return cloneMap();
	if (type === 'set') return cloneSet();
	if (type === 'function') return cloneFunction();
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
			if (['object', 'array'].includes(trueTypeOf(obj[prop]))) {
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
}

/**
 * Create a proxy from a data object
 * @param  {Object}     options  The options object
 * @param  {Contructor} instance The current Reef instantiation
 * @return {Proxy}               The Proxy
 */
function makeProxy (options, instance) {
	if (options.setters) return !options.store ? options.data : null;
	return options.data ? new Proxy(options.data, dataHandler(instance)) : null;
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

// Form fields and attributes that can be modified by users
// They also have implicit values that make it hard to know if they were changed by the user or developer
let formFields = ['input', 'option', 'textarea'];
let formAtts = ['value', 'checked', 'selected'];
let formAttsNoVal = ['checked', 'selected'];

/**
 * Check if attribute should be skipped (sanitize properties)
 * @param  {String}  name  The attribute name
 * @param  {String}  value The attribute value
 * @return {Boolean}       If true, skip the attribute
 */
function skipAttribute (name, value) {
	let val = value.replace(/\s+/g, '').toLowerCase();
	if (['src', 'href', 'xlink:href'].includes(name)) {
		if (val.includes('javascript:') || val.includes('data:text/html')) return true;
	}
	if (name.startsWith('on')) return true;
}

/**
 * Add an attribute to an element
 * @param {Node}   elem The element
 * @param {String} att  The attribute
 * @param {String} val  The value
 */
function addAttribute (elem, att, val) {

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

		// If the attribute should be skipped, remove it
		if (skipAttribute(name, value)) {
			removeAttribute(elem, name);
			continue;
		}

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
 * Remove scripts from HTML
 * @param  {Node}    elem The element to remove scripts from
 */
function removeScripts (elem) {
	let scripts = elem.querySelectorAll('script');
	for (let script of scripts) {
		script.remove();
	}
}

/**
 * Diff the existing DOM node versus the template
 * @param  {Array} template The template HTML
 * @param  {Node}  existing The current DOM HTML
 * @param  {Array} polyps   Attached components for this element
 */
function diff (template, existing, polyps) {

	// Get the nodes in the template and existing UI
	let templateNodes = template.childNodes;
	let existingNodes = existing.childNodes;

	// Don't inject scripts
	if (removeScripts(template)) return;

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

		// If element is an attached component, skip it
		let isPolyp = polyps.filter(function (polyp) {
			return ![3, 8].includes(node.nodeType) && node.matches(polyp);
		});
		if (isPolyp.length > 0) return;

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
			diff(node, fragment, polyps);
			existingNodes[index].appendChild(fragment);
			return;
		}

		// If there are nodes within it, recursively diff those
		if (node.childNodes.length) {
			diff(node, existingNodes[index], polyps);
		}

	});

	// If extra elements in DOM, remove them
	trimExtraNodes(existingNodes, templateNodes);

}

/**
 * If there are linked Reefs, render them, too
 * @param  {Array} polyps Attached Reef components
 */
function renderPolyps (polyps, reef) {
	if (!polyps) return;
	for (let coral of polyps) {
		if (coral.attached.includes(reef)) return err(`"${reef.elem}" has attached nodes that it is also attached to, creating an infinite loop.`);
		if ('render' in coral) {
			coral.render();
		}
	}
}

/**
 * Create the Reef object
 * @param {String|Node} elem    The element to make into a component
 * @param {Object}      options The component options
 */
function Reef (elem, options = {}) {

	// Make sure an element is provided
	if (!elem && !options.lagoon) return err('You did not provide an element to make into a component.');

	// Make sure a template is provided
	if (!options.template && !options.lagoon) return err('You did not provide a template for this component.');

	// Get the component properties
	let _this = this;
	let _data = makeProxy(options, _this);
	let _attachTo = options.attachTo ? (trueTypeOf(options.attachTo) === 'array' ? options.attachTo : [options.attachTo]) : [];
	let {store: _store, setters: _setters, getters: _getters} = options;
	_this.debounce = null;

	// Set the component properties
	Object.defineProperties(_this, {

		// Read-only properties
		elem: {value: elem},
		template: {value: options.template},
		lagoon: {value: options.lagoon},
		store: {value: _store},
		attached: {value: []},

		// getter/setter for data
		data: {
			get: function () {
				return _setters ? copy(_data) : _data;
			},
			set: function (data) {
				if (_store || _setters) return true;
				_data = new Proxy(data, dataHandler(_this));
				debounceRender(_this);
				return true;
			},
			configurable: true
		},

		// immutable data getter
		dataCopy: {
			get: function () {
				return copy(_data);
			}
		},

		// do() method for options.setters
		do: {
			value: function (id) {
				if (_store || !_setters) return err('There are no setters for this component.');
				if (!_setters[id]) return err('There is no setter with this name.');
				let args = Array.from(arguments);
				args[0] = _data;
				_setters[id].apply(_this, args);
				debounceRender(_this);
			}
		},

		// get() method for options.getters
		get: {
			value: function (id) {
				if (_store || !_getters) return err('There are no getters for this component.');
				if (!_getters[id]) return err('There is no getter with this name.');
				let args = Array.from(arguments);
				args[0] = _data;
				return _getters[id].apply(_this, args);
			}
		}

	});

	// Attach to store
	if (_store && 'attach' in _store) {
		_store.attach(_this);
	}

	// Attach linked components
	if (_attachTo.length) {
		_attachTo.forEach(function (coral) {
			if ('attach' in coral) {
				coral.attach(_this);
			}
		});
	}

	// Emit initialized event
	emit(document, 'reef:initialized', _this);

}

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

	// If elem is an element, use it
	// If it's a selector, get it
	let elem = trueTypeOf(this.elem) === 'string' ? document.querySelector(this.elem) : this.elem;
	if (!elem) return err('The DOM element to render your template into was not found.');

	// Merge store and local data into a single object
	let data = Object.assign({}, (this.store ? this.store.data : {}), (this.data ? this.data : {}));

	// Get the template
	let template = (trueTypeOf(this.template) === 'function' ? this.template(data, elem) : this.template);

	// Emit pre-render event
	// If the event was cancelled, bail
	let canceled = !emit(elem, 'reef:before-render', data);
	if (canceled) return;

	// Diff and update the DOM
	let polyps = this.attached.map(function (polyp) { return polyp.elem; });
	diff(stringToHTML(template), elem, polyps);

	// Dispatch a render event
	emit(elem, 'reef:render', data);

	// If there are linked Reefs, render them, too
	renderPolyps(this.attached, this);

	// Return the elem for use elsewhere
	return elem;

};

/**
 * Get an immutable copy of the data
 * @return {Object} The app data
 */
Reef.prototype.immutableData = function () {
	return copy(this.data);
};

/**
 * Attach a component to this one
 * @param  {Function|Array} coral The component(s) to attach
 */
Reef.prototype.attach = function (coral) {

	// Attach components
	let polyps = trueTypeOf(coral) === 'array' ? coral : [coral];
	for (let polyp of polyps) {
		this.attached.push(polyp);
	}

	// Emit attached event
	emit(document, 'reef:attached', {
		component: this,
		attached: polyps
	});

};

/**
 * Detach a linked component to this one
 * @param  {Function|Array} coral The linked component(s) to detach
 */
Reef.prototype.detach = function (coral) {

	// Detach components
	let polyps = trueTypeOf(coral) === 'array' ? coral : [coral];
	for (let polyp of polyps) {
		let index = this.attached.indexOf(polyp);
		if (index < 0) return;
		this.attached.splice(index, 1);
	}

	// Emit detached event
	emit(document, 'reef:detached', {
		component: this,
		detached: polyps
	});

};

/**
 * Store constructor
 * @param {Object} options The data store options
 */
Reef.Store = function (options) {
	options.lagoon = true;
	return new Reef(null, options);
};

// External helper methods
Reef.debug = setDebug;
Reef.clone = copy;
Reef.emit = emit;
Reef.err = err;

// Emit ready event
emit(document, 'reef:ready');

export default Reef;
