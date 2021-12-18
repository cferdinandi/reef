/*! Reef v11.0.1 | (c) 2021 Chris Ferdinandi | MIT License | http://github.com/cferdinandi/reef */
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
        console.warn(`[Reef] ${msg}`);
    }
}

/**
 * Emit a custom event
 * @param  {String} type   The event type
 * @param  {Object} detail Any details to pass along with the event
 * @param  {Node}   elem   The element to attach the event to
 */
function emit (type, detail = {}, elem = document) {

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
 * Get an object's type
 * @param  {*}      obj The object
 * @return {String}     The type
 */
function getType (obj) {
	return Object.prototype.toString.call(obj).slice(8, -1).toLowerCase();
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
	let type = getType(obj);

	// Return a clone based on the object type
	if (type === 'object') return cloneObj();
	if (type === 'array') return cloneArr();
	return obj;

}

/**
 * Debounce rendering for better performance
 * @param  {Constructor} instance The current instantiation
 */
function render (instance) {

	// If there's a pending render, cancel it
	if (instance._debounce) {
		window.cancelAnimationFrame(instance.debounce);
	}

	// Setup the new render to run at the next animation frame
	instance._debounce = window.requestAnimationFrame(function () {
		instance.render();
	});

}

/**
 * Get instance render details
 * @param  {Constructor} instance The Constructor instance
 * @return {Object}               The element, data, and template details
 */
function getRenderDetails (instance) {
	let elem = instance.elem;
	let data = copy(instance._store ? Object.assign(instance._store.data, instance.data || {}) : instance.data);
	let template = instance._template(data, elem);
	return {elem, data, template};
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

/**
 * Check if an attribute string has a stringified falsy value
 * @param  {String}  str The string
 * @return {Boolean}     If true, value is falsy (yea, I know, that's a little confusing)
 */
function isFalsy (str) {
	return ['false', 'null', 'undefined', '0', '-0', 'NaN', '0n', '-0n'].includes(str);
}

/**
 * Create settings and getters for data Proxy
 * @param  {Constructor} instance The current instantiation
 * @return {Object}               The setter and getter methods for the Proxy
 */
function handler (instance) {
	return {
		get: function (obj, prop) {
			if (prop === '_isProxy') return true;
			if (['object', 'array'].includes(getType(obj[prop])) && !obj[prop]._isProxy) {
				obj[prop] = new Proxy(obj[prop], handler(instance));
			}
			return obj[prop];
		},
		set: function (obj, prop, value) {
			if (obj[prop] === value) return true;
			obj[prop] = value;
			render(instance);
			return true;
		},
		deleteProperty: function (obj, prop) {
			delete obj[prop];
			render(instance);
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
function makeProxy (data, instance) {
	if (!data) return null;
	return new Proxy(data, handler(instance));
}

//  Hold all events by type
let events = {};

/**
 * Handle listeners after event fires
 * @param {Event} event The event
 */
var eventHandler = function (event) {
	if (!events[event.type]) return;
	for (let listener of events[event.type]) {
		let {elem, callback} = listener;
		if (elem === event.target || elem.contains(event.target)) {
			callback.call(listener.instance, event);
		}
	}
};

/**
 * Start event listeners for an event type
 * @param {String} type The event type
 */
function startListener (type) {
	if (events[type]) return;
	events[type] = [];
	document.addEventListener(type, eventHandler, true);
}

/**
 * Stop event listeners for an event type
 * @param {String} type The event type
 */
function stopListener (type) {
	if (!events[type]) return;
	delete events[type];
	document.removeEventListener(type, eventHandler, true);
}

/**
 * Check if listener is already active
 * @param  {String}   type     The event type
 * @param  {Node}     elem     The elem to listen to
 * @param  {Function} callback The callback function to run
 * @return {Boolean}           If true, listener already exists
 */
function getListener (type, elem, callback) {
	return events[type].find(function (listener) {
		return elem === listener.elem && callback === listener.callback;
	});
}

/**
 * Add an event listener
 * @param {Node}        elem     The element to attach the listener to
 * @param {String}      name     The event attribute name
 * @param {String}      value    The event attribute value
 * @param {Constructor} instance The Reef instance the element is in
 */
function addEvent (elem, name, value, instance) {

	// If there are no listeners, do nothing
	if (!instance._listeners) return;

	// Get event details
	let type = name.slice(2);
	let callback = instance._listeners[value.slice(0, -2)];

	// Make sure event is for a valid listener
	if (!callback) return;

	// Start listener for this type if not already running
	startListener(type);

	// If element already has a listener, do nothing
	if (getListener(type, elem, callback)) return;

	// Otherwise, add listener
	events[type].push({elem, callback, instance});

}

/**
 * Remove all events attached to an element
 * @param  {NodeList}    elems    The elements to remove events from
 * @param  {Constructor} instance The Reef instance the elements are in
 */
function removeAllEvents (elems, instance) {
	if (!instance._listeners) return;
	for (let elem of elems) {
		for (let type in events) {
			events[type] = events[type].filter(function (listener) {
				return listener.elem !== elem;
			});
			if (!events[type].length) {
				stopListener(type);
			}
		}
	}
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
function diffAttributes (template, existing, instance) {

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

		// If its an event handler, maybe add it
		if (name.startsWith('on')) {
			addEvent(existing, name, value, instance);
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
function addDefaultAtts (elem, instance) {

	// Only run on elements
	if (elem.nodeType !== 1) return;

	// Remove [@*] and [#*] attributes and replace them with the plain attributes
	// Remove unsafe HTML attributes
	for (let {name, value} of elem.attributes) {

		// If its an event handler, maybe add it
		if (name.startsWith('on')) {
			addEvent(elem, name, value, instance);
		}

		// If the attribute should be skipped, remove it
		if (skipAttribute(name, value)) {
			removeAttribute(elem, name);
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
		addAttribute(elem, attName, value);

	}

	// If there are child elems, recursively add defaults to them
	if (elem.childNodes) {
		for (let node of elem.childNodes) {
			addDefaultAtts(node, instance);
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
function trimExtraNodes (existingNodes, templateNodes, instance) {
	let extra = existingNodes.length - templateNodes.length;
	if (extra < 1)  return;
	for (; extra > 0; extra--) {
		removeAllEvents([existingNodes[existingNodes.length - 1]], instance);
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
 */
function diff (template, existing, instance) {

	// Get the nodes in the template and existing UI
	let templateNodes = template.childNodes;
	let existingNodes = existing.childNodes;

	// Don't inject scripts
	if (removeScripts(template)) return;

	// Loop through each node in the template and compare it to the matching element in the UI
	templateNodes.forEach(function (node, index) {

		// If element doesn't exist, create it
		if (!existingNodes[index]) {
			let clone = node.cloneNode(true);
			addDefaultAtts(clone, instance);
			existing.append(clone);
			return;
		}

		// If there is, but it's not the same node type, insert the new node before the existing one
		if (isDifferentNode(node, existingNodes[index])) {

			// Check if node exists further in the tree
			let ahead = aheadInTree(node, existingNodes, index);

			// If not, insert the node before the current one
			if (!ahead) {
				let clone = node.cloneNode(true);
				addDefaultAtts(clone, instance);
				existingNodes[index].before(clone);
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
		diffAttributes(node, existingNodes[index], instance);

		// If there shouldn't be child nodes but there are, remove them
		if (!node.childNodes.length && existingNodes[index].childNodes.length) {
			removeAllEvents(node.children, instance);
			existingNodes[index].innerHTML = '';
			return;
		}

		// If DOM is empty and shouldn't be, build it up
		// This uses a document fragment to minimize reflows
		if (!existingNodes[index].childNodes.length && node.childNodes.length) {
			let fragment = document.createDocumentFragment();
			diff(node, fragment, instance);
			existingNodes[index].appendChild(fragment);
			return;
		}

		// If there are nodes within it, recursively diff those
		if (node.childNodes.length) {
			diff(node, existingNodes[index], instance);
		}

	});

	// If extra elements in DOM, remove them
	trimExtraNodes(existingNodes, templateNodes, instance);

}

/**
 * Create the Constructor object
 * @param {String|Node} elem    The element to make into a component
 * @param {Object}      options The component options
 */
function Constructor (elem, options = {}) {

	// Get variables from options
	let {data, store, template, isStore, setters, listeners, after} = options;

	// Make sure an element is provided
	if (!elem && !isStore) {
		return err('Element not found.');
	}

	// Make sure a template is provided
	if (!template && !isStore) {
		return err('Please provide a template function.');
	}

	// Cache an immutable copy of the data
	let $data = setters ? copy(data) : makeProxy(data, this);

	// Define instance properties
	Object.defineProperties(this, {

		// Internal props
		_store: {value: store},
		_template: {value: template},
		_debounce: {value: false, writable: true},
		_isStore: {value: isStore},
		_components: isStore ? {value: [], writable: true} : {value: null},
		_listeners: {value: Object.freeze(listeners)},

		// Public props
		elem: {
			get: function () {
				return typeof elem === 'string' ? document.querySelector(elem) : elem;
			}
		},
		data: {
			get: function () {
				return setters ? copy($data) : $data;
			},
			set: function (data) {
				if (setters) return true;
				$data = makeProxy(data, this);
				render(this);
				return true;
			},
			configurable: true
		},
		dataCopy: {
			get: function () {
				return copy($data);
			}
		},
		do: {
			value: function (id, ...args) {

				// Make sure there are setters
				if (!setters) {
					return err('No setters for this component.');
				}

				// Make sure there's a setter with the correct ID
				if (!setters[id]) {
					return err(`No setter named "${id}".`);
				}

				// Run the setter function
				setters[id].apply(this, [$data, ...args]);

				// Update the data
				$data = copy($data);

				// Render a new UI
				render(this);

			}
		}

	});

	// Attach component to store
	if (store) {
		store._components.push(this);
	}

	// Emit initialized event
	emit('initialize', this);

}

/**
 * Get the compiled HTML string
 * @return {String} The HTML string
 */
Constructor.prototype.html = function () {
	let details = getRenderDetails(this);
	return details.template;
};

/**
 * Render a template into the DOM
 * @return {Node}  The element
 */
Constructor.prototype.render = function () {

	// If a store, render components
	if (this._isStore) {
		for (let component of this._components) {
			if ('render' in component && typeof component.render === 'function') {
				component.render();
			}
		}
		return;
	}

	// Get the render details
	let details = getRenderDetails(this);

	// Make sure there's an element to render into
	if (!details.elem) {
		return err('Render target not found.');
	}

	// Emit pre-render event
	// If the event was cancelled, bail
	let cancel = !emit('before-render', {data: details.data, component: this}, details.elem);
	if (cancel) return;

	// Diff and update the DOM
	diff(stringToHTML(details.template), details.elem, this);

	// Dispatch a render event
	emit('render', {data: details.data, component: this}, details.elem);

	// Return the elem for use elsewhere
	return details.elem;

};

/**
 * Store constructor
 * @param {Object} options The data store options
 */
Constructor.Store = function (options) {
	options.isStore = true;
	return new Constructor(null, options);
};

// External helper methods
Constructor.debug = debug;

// Emit ready event
emit('ready');

export default Constructor;
