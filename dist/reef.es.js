/*! Reef v8.2.5 | (c) 2021 Chris Ferdinandi | MIT License | http://github.com/cferdinandi/reef */
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
function isFalsy (str = '') {
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
 * @param  {*}       obj       The object to clone
 * @param  {Boolean} allowHTML If true, allow HTML in data strings
 * @return {*}                 The immutable, encoded object
 */
function copy (obj, allowHTML) {

	/**
	 * Copy properties from the original object to the clone
	 * @param {Object|Function} clone The cloned object
	 */
	function copyProps (clone) {
		for (let key in obj) {
			if (obj.hasOwnProperty(key)) {
				clone[key] = copy(obj[key], allowHTML);
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
			return copy(item, allowHTML);
		});
	}

	/**
	 * Create an immutable copy of a Map
	 * @return {Map}
	 */
	function cloneMap () {
		let clone = new Map();
		for (let [key, val] of obj) {
			clone.set(key, copy(val, allowHTML));
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
			clone.add(copy(item, allowHTML));
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

	/**
	 * Sanitize and encode HTML in a string
	 * @return {String} The sanitized and encoded string
	 */
	function sanitizeStr () {
		return obj.replace(/javascript:/gi, '').replace(/[^\w-_. ]/gi, function(c){
			return `&#${c.charCodeAt(0)};`;
		});
	}

	// Get object type
	let type = trueTypeOf(obj);

	// Return a clone based on the object type
	if (type === 'object') return cloneObj();
	if (type === 'array') return cloneArr();
	if (type === 'map') return cloneMap();
	if (type === 'set') return cloneSet();
	if (type === 'function') return cloneFunction();
	if (type === 'string' && !allowHTML) return sanitizeStr();
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
	return options.data && !options.store ? new Proxy(options.data, dataHandler(instance)) : null;
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

// Attributes that might be changed by users
// They also have implicit properties that make it hard to know if they were changed by the user or developer
let dynamicAttributes = ['checked', 'selected', 'value'];

// Attributes that are dynamic but have no required value
let dynamicAttributesNoValue = ['checked', 'selected'];

// Elements that have dynamic attributes
let dynamicFields = ['input', 'option', 'textarea'];

// Dynamic field value setters
// These help indicate intent for fields that have implicit properties whether set or not
let reefAttributes = ['reef-checked', 'reef-selected', 'reef-value'];
let reefAttributeDefaults = ['reef-default-checked', 'reef-default-selected', 'reef-default-value'];

/**
 * Add attributes to an element
 * @param {Node}  elem The element
 * @param {Array} atts The attributes to add
 */
function addAttributes (elem, atts) {
	atts.forEach(function (attribute) {
		// If the attribute is a class, use className
		// Else if it's style, add the styles
		// Otherwise, set the attribute
		if (attribute.att === 'class') {
			elem.className = attribute.value;
		} else if (attribute.att === 'style') {
			elem.style.cssText = attribute.value;
		} else {
			if (attribute.att in elem) {
				try {
					elem[attribute.att] = attribute.value;
					if (!elem[attribute.att] && elem[attribute.att] !== 0) {
						elem[attribute.att] = attribute.att === 'value' ? attribute.value : true;
					}
				} catch (e) {}
			}
			try {
				elem.setAttribute(attribute.att, attribute.value);
			} catch (e) {}
		}
	});
}

/**
 * Remove attributes from an element
 * @param {Node}  elem The element
 * @param {Array} atts The attributes to remove
 */
function removeAttributes (elem, atts) {
	atts.forEach(function (attribute) {
		// If the attribute is a class, use className
		// Else if it's style, remove all styles
		// Otherwise, use removeAttribute()
		if (attribute.att === 'class') {
			elem.className = '';
		} else if (attribute.att === 'style') {
			elem.style.cssText = '';
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
}

/**
 * Create an object with the attribute name and value
 * @param  {String} name  The attribute name
 * @param  {*}      value The attribute value
 * @return {Object}       The object of attribute details
 */
function getAttribute (name, value) {
	return {
		att: name,
		value: value
	};
}

/**
 * Create an array of the attributes on an element
 * @param  {Node}    node       The node to get attributes from
 * @param  {Boolean} isTemplate If true, the node is in the template and not the DOM
 * @return {Array}              The attributes on an element as an array of key/value pairs
 */
function getAttributes (node, isTemplate) {

	// If the node is not an element, return a empty array
	if (node.nodeType !== 1) return [];

	// Otherwise, get an array of attributes
	return Array.from(node.attributes).map(function (attribute) {

		// If the node is a template with a dynamic attribute/field, skip it
		if (isTemplate && dynamicAttributes.includes(attribute.name) && dynamicFields.includes(node.tagName.toLowerCase())) return;

		// If the node is in the DOM with a dynamic field, get it
		if (!isTemplate && dynamicAttributes.includes(attribute.name)) {
			return getAttribute(attribute.name, node[attribute.name]);
		}

		// If the attribute is a [reef-default-*] attribute, skip it
		if (reefAttributeDefaults.includes(attribute.name)) return;

		// If it's a template node with a [reef-*] attribute, get the attribute from the reef att
		if (isTemplate && reefAttributes.includes(attribute.name)) {
			let attName = attribute.name.replace('reef-', '');
			return dynamicAttributesNoValue.includes(attName) ? getAttribute(attName, isFalsy(attribute.value) ? null : attName) : getAttribute(attName, attribute.value);
		}

		// Otherwise, get the value as-is
		return getAttribute(attribute.name, attribute.value);

	}).filter(function (attribute) {
		return !!attribute;
	});

}

/**
 * Diff the attributes on an existing element versus the template
 * @param  {Object} template The new template
 * @param  {Object} elem     The existing DOM node
 */
function diffAtts (template, elem) {

	let templateAtts = getAttributes(template, true);
	let elemAtts = getAttributes(elem);

	// Get attributes to remove
	let remove = elemAtts.filter(function (att) {
		let getAtt = templateAtts.find(function (newAtt) {
			return att.att === newAtt.att;
		});
		return (getAtt === undefined && !dynamicAttributes.includes(att.att)) || (getAtt && dynamicAttributesNoValue.includes(getAtt.att) && getAtt.value === null);
	});

	// Get attributes to change
	let change = templateAtts.filter(function (att) {
		if (dynamicAttributesNoValue.includes(att.att) && att.value === null) return false;
		let getAtt = elemAtts.find(function (elemAtt) {
			return att.att === elemAtt.att;
		});
		return getAtt === undefined || getAtt.value !== att.value;
	});

	// Add/remove any required attributes
	addAttributes(elem, change);
	removeAttributes(elem, remove);

}

/**
 * Add default attributes to a newly created node
 * @param  {Node}   node The node
 */
function addDefaultAtts (node) {

	// Only run on elements
	if (node.nodeType !== 1) return;

	// Remove [reef-*] attributes and replace with proper values
	Array.from(node.attributes).forEach(function (attribute) {
		if (!reefAttributes.includes(attribute.name) && !reefAttributeDefaults.includes(attribute.name)) return;
		let attName = attribute.name.replace('reef-default-', '').replace('reef-', '');
		let isNoVal = dynamicAttributesNoValue.includes(attName);
		removeAttributes(node, [getAttribute(attribute.name, attribute.value)]);
		if (isNoVal && isFalsy(attribute.value)) return;
		addAttributes(node, [isNoVal ? getAttribute(attName, attName) : getAttribute(attName, attribute.value)]);
	});

	// If there are child nodes, recursively check them
	if (node.childNodes) {
		Array.from(node.childNodes).forEach(function (childNode) {
			addDefaultAtts(childNode);
		});
	}

}

/**
 * Get the type for a node
 * @param  {Node}   node The node
 * @return {String}      The type
 */
function getNodeType (node) {
	return node.nodeType === 3 ? 'text' : (node.nodeType === 8 ? 'comment' : node.tagName.toLowerCase());
}

/**
 * Get the content from a node
 * @param  {Node}   node The node
 * @return {String}      The content
 */
function getNodeContent (node) {
	return node.childNodes && node.childNodes.length > 0 ? null : node.textContent;
}

/**
 * Check if two nodes are different
 * @param  {Node}  node1 The first node
 * @param  {Node}  node2 The second node
 * @return {Boolean}     If true, they're not the same node
 */
function isDifferentNode (node1, node2) {
	return getNodeType(node1) !== getNodeType(node2) || node1.id !== node2.id || node1.src !== node1.src;
}

/**
 * Check if the desired node is further ahead in the DOM tree
 * @param  {Node}     node  The node to look for
 * @param  {NodeList} tree  The DOM tree
 * @param  {Integer}  start The starting index
 * @return {Integer}        How many nodes ahead the target node is
 */
function aheadInTree (node, tree, start) {
	return Array.from(tree).slice(start + 1).find(function (branch) {
		return !isDifferentNode(node, branch);
	});
}

/**
 * If there are extra elements in DOM, remove them
 * @param  {Array} domMap      The existing DOM
 * @param  {Array} templateMap The template
 */
function trimExtraNodes (domMap, templateMap) {
	let count = domMap.length - templateMap.length;
	if (count < 1)  return;
	for (; count > 0; count--) {
		domMap[domMap.length - count].remove(domMap[domMap.length - count]);
	}
}

/**
 * Diff the existing DOM node versus the template
 * @param  {Array} template The template HTML
 * @param  {Node}  elem     The current DOM HTML
 * @param  {Array} polyps   Attached components for this element
 */
function diff (template, elem, polyps = []) {

	// Get arrays of child nodes
	let domMap = elem.childNodes;
	let templateMap = template.childNodes;

	// Diff each item in the templateMap
	templateMap.forEach(function (node, index) {

		// If element doesn't exist, create it
		if (!domMap[index]) {
			addDefaultAtts(node);
			elem.append(node.cloneNode(true));
			return;
		}

		// If element is not the same type, update the DOM accordingly
		if (isDifferentNode(node, domMap[index])) {

			// Check if node exists further in the tree
			let ahead = aheadInTree(node, domMap, index);

			// If not, insert the node before the current one
			if (!ahead) {
				addDefaultAtts(node);
				domMap[index].before(node.cloneNode(true));
				return;
			}

			// Otherwise, move it to the current spot
			domMap[index].before(ahead);

		}

		// If attributes are different, update them
		diffAtts(node, domMap[index]);

		// If element is an attached component, skip it
		let isPolyp = polyps.filter(function (polyp) {
			return ![3, 8].includes(node.nodeType) && node.matches(polyp);
		});
		if (isPolyp.length > 0) return;

		// If content is different, update it
		let templateContent = getNodeContent(node);
		if (templateContent && templateContent !== getNodeContent(domMap[index])) {
			domMap[index].textContent = templateContent;
		}

		// If target element should be empty, wipe it
		if (domMap[index].childNodes.length > 0 && node.childNodes.length < 1) {
			domMap[index].innerHTML = '';
			return;
		}

		// If element is empty and shouldn't be, build it up
		// This uses a document fragment to minimize reflows
		if (domMap[index].childNodes.length < 1 && node.childNodes.length > 0) {
			let fragment = document.createDocumentFragment();
			diff(node, fragment, polyps);
			domMap[index].appendChild(fragment);
			return;
		}

		// If there are existing child elements that need to be modified, diff them
		if (node.childNodes.length > 0) {
			diff(node, domMap[index], polyps);
		}

	});

	// If extra elements in DOM, remove them
	trimExtraNodes(domMap, templateMap);

}

/**
 * If there are linked Reefs, render them, too
 * @param  {Array} polyps Attached Reef components
 */
function renderPolyps (polyps, reef) {
	if (!polyps) return;
	polyps.forEach(function (coral) {
		if (coral.attached.includes(reef)) return err(`"${reef.elem}" has attached nodes that it is also attached to, creating an infinite loop.`);
		if ('render' in coral) coral.render();
	});
}

/**
 * Create the Reef object
 * @param {String|Node} elem    The element to make into a component
 * @param {Object}      options The component options
 */
function Reef (elem, options) {

	// Make sure an element is provided
	if (!elem && (!options || !options.lagoon)) return err('You did not provide an element to make into a component.');

	// Make sure a template is provided
	if (!options || (!options.template && !options.lagoon)) return err('You did not provide a template for this component.');

	// Get the component properties
	let _this = this;
	let _data = makeProxy(options, _this);
	let _attachTo = options.attachTo ? (trueTypeOf(options.attachTo) === 'array' ? options.attachTo : [options.attachTo]) : [];
	let {store: _store, router: _router, setters: _setters, getters: _getters} = options;
	_this.debounce = null;

	// Set the component properties
	Object.defineProperties(_this, {

		// Read-only properties
		elem: {value: elem},
		template: {value: options.template},
		allowHTML: {value: options.allowHTML},
		lagoon: {value: options.lagoon},
		store: {value: _store},
		attached: {value: []},

		// getter/setter for data
		data: {
			get: function () {
				return _setters ? copy(_data, true) : _data;
			},
			set: function (data) {
				if (_store || _setters) return true;
				_data = new Proxy(data, dataHandler(_this));
				debounceRender(_this);
				return true;
			},
			configurable: true
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
			},
			configurable: true
		},

		// get() method for options.getters
		get: {
			value: function (id) {
				if (_store || !_getters) return err('There are no getters for this component.');
				if (!_getters[id]) return err('There is no getter with this name.');
				let args = Array.from(arguments);
				args[0] = _data;
				return _getters[id].apply(_this, args);
			},
			configurable: true
		}

	});

	// Attach to router
	if (_router && 'addComponent' in _router) {
		_router.addComponent(_this);
	}

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

	// If elem is an element, use it.
	// If it's a selector, get it.
	let elem = trueTypeOf(this.elem) === 'string' ? document.querySelector(this.elem) : this.elem;
	if (!elem) return err('The DOM element to render your template into was not found.');

	// Get the data (if there is any)
	let data = copy((this.store ? this.store.data : this.data) || {}, this.allowHTML);

	// Get the template
	let template = (trueTypeOf(this.template) === 'function' ? this.template(data, this.router && this.router.current ? this.router.current : elem, elem) : this.template);
	if (!['string', 'number'].includes(trueTypeOf(template))) return;

	// Emit pre-render event
	let cancelled = !emit(elem, 'reef:before-render', data);

	// If the event was cancelled, bail
	if (cancelled) return;

	// Diff and update the DOM
	let polyps = this.attached.map(function (polyp) { return polyp.elem; });
	diff(stringToHTML(template), elem, polyps);

	// Dispatch a render event
	emit(elem, 'reef:render', data);

	// @deprecated Will be removed in v9
	emit(elem, 'render', data);

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

/**
 * Install a Reef plugin
 * @param  {Constructor} plugin The Reef plugin
 */
Reef.use = function (plugin) {
	if (!plugin.install || typeof plugin.install !== 'function') return;
	plugin.install(Reef, {diff: diff});
	emit(document, 'reef:plugin-added', plugin);
};

// External helper methods
Reef.debug = setDebug;
Reef.clone = copy;
Reef.trueTypeOf = trueTypeOf;
Reef.err = err;
Reef.emit = emit;

// Emit ready event
emit(document, 'reef:ready');

export default Reef;
