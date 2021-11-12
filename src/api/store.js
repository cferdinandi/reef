import {debounce} from '../utils/utilities.js';

/**
 * Run attached functions
 * @param  {Instance} instance The instantiation
 */
function run (instance) {
	for (let fn of instance.fns) {
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
	Object.defineProperties(this, {
		$: {
			get: function () {
				return data;
			},
			set: function (val) {

				// If an object, make a Proxy
				data = proxify(val, this);

				// Run functions
				run(this);

				return true;

			}
		},
		fns: {value: []}
	});

	// Emit a custom event
	emit('store', this.$);

}

export {Store};