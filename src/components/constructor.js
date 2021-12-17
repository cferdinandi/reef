import {debug, err} from './debug.js';
import {makeProxy} from './proxies.js';
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