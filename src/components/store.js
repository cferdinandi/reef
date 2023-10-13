import {emit} from './utilities.js';


/**
 * Store Class
 */
class Store {

	/**
	 * The constructor object
	 * @param  {Object} data    The data object
	 * @param  {Object} actions The store functions
	 * @param  {String} name    The custom event namespace for the signal
	 */
	constructor (data, actions, name = '') {

		// Get signal type
		let type = 'signal' + (name ? `-${name}` : '');

		// Create data property setter/getter
		Object.defineProperties(this, {
			value: {
				get () {
					return structuredClone(data);
				},
				set () {
					return true;
				}
			}
		});

		// Add store functions
		for (let fn in actions) {
			if (typeof actions[fn] !== 'function') continue;
			this[fn] = function (...args) {
				actions[fn](data, ...args);
				emit(type, data);
			};
		}

	}

}

/**
 * Create a new store
 * @param  {Object} data    The data object
 * @param  {Object} setters The store functions
 * @param  {String} name    The custom event namespace for the signal
 * @return {Proxy}          The Store instance
 */
function store (data = {}, setters = {}, name = '') {
	return new Store(data, setters, name);
}


export default store;