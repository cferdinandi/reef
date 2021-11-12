import {debounce, emit, copy} from '../utils/utilities.js';
import {err} from '../utils/debug.js';

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

export {store};