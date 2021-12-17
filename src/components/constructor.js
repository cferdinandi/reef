import {debug, err} from './debug.js';
import {copy, render, getRenderDetails, emit, stringToHTML} from './utilities.js';
import {diff} from './dom.js';

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
	let dataCopy = copy(data);

	// Define instance properties
	Object.defineProperties(this, {

		// Internal props
		_elem: {
			get: function () {
				return typeof elem === 'string' ? document.querySelector(elem) : elem;
			}
		},
		_store: {value: store},
		_template: {value: template},
		_debounce: {value: false, writable: true},
		_isStore: {value: isStore},
		_components: isStore ? {value: [], writable: true} : {value: null},
		_listeners: {value: Object.freeze(listeners)},
		_after: {value: Object.freeze(after || {})},

		// Public props
		data: {
			get: function () {
				return dataCopy;
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
				setters[id].apply(this, [dataCopy, ...args]);

				// Update the data
				data = dataCopy;
				dataCopy = copy(data);

				// Render a new UI
				render(this);

			}
		}

	});

	// Emit initialized event
	emit('initialized', this);

}

/**
 * Get the compiled HTML string
 * @return {String} The HTML string
 */
Constructor.prototype.html = function () {
	let details = getRenderDetails(this);
	return details.template;
};

// @todo pick one: nest or html

/**
 * Nest this component inside another one
 * @return {String} The HTML string
 */
Constructor.prototype.nest = function (component) {
	let instance = this;
	component._elem.addEventListener('reef:render', function () {
		instance.render();
	}, {once: true});
	return '';
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
	let cancel = !emit('before-render', details.data, details.elem);
	if (cancel) return;

	// Diff and update the DOM
	diff(stringToHTML(details.template), details.elem, this);

	// Run any render effects
	if (this._after.render && typeof this._after.render === 'function') {
		this._after.render(this.data);
	}

	// Dispatch a render event
	emit('render', details.data, details.elem);

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
Constructor.clone = copy;

// Emit ready event
emit('ready');

export default Constructor;