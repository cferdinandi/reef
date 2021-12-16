import {debug, err} from './debug.js';
import {copy, render, emit, stringToHTML} from './utilities.js';
import {diff} from './dom.js';

/**
 * Create the Constructor object
 * @param {String|Node} elem    The element to make into a component
 * @param {Object}      options The component options
 */
function Constructor (elem, options = {}) {

	// Make sure an element is provided
	if (!elem && !options.lagoon) {
		return err('Element not found.');
	}

	// Make sure a template is provided
	if (!options.template && !options.lagoon) {
		return err('Please provide a template function.');
	}

	// Extract data from the options
	let {data, store, template, isStore, setters} = options;

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

		// Public props
		data: {
			get: function () {
				return store ? Object.assign(store.data, copy(data)) : copy(data);
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
				setters[id].apply(this, [data, ...args]);

				// Render a new UI
				render(this);

			}
		}

	});

	// Emit initialized event
	emit('initialized', this);

}

Constructor.prototype.html = function () {
	let elem = typeof this._elem === 'string' ? document.querySelector(this._elem) : this._elem;
	return this._template(this.data, elem);
};

/**
 * Render a template into the DOM
 * @return {Node}  The element
 */
Constructor.prototype.render = function () {

	// If elem is an element, use it
	// If it's a selector, get it
	let elem = this._elem;
	if (!elem) {
		return err('Render target not found.');
	}

	// Emit pre-render event
	// If the event was cancelled, bail
	let cancel = !emit('before-render', this.data, elem);
	if (cancel) return;

	// Diff and update the DOM
	diff(stringToHTML(this._template(this.data, elem)), elem);

	// Dispatch a render event
	emit('render', this.data, elem);

	// Return the elem for use elsewhere
	return elem;

};

// External helper methods
Constructor.debug = debug;
Constructor.clone = copy;

// Emit ready event
emit('ready');

export default Constructor;