import {emit} from './utilities.js';


/**
 * Store Class
 */
class Store {

	/**
	 * The constructor object
	 * @param  {Object} data    The data object
	 * @param  {Object} actions The store functions
	 * @param  {Array} names    The custom event namespaces for the signal
	 */
	constructor (data, actions, names = '') {

		// Get signal types
		let types = Array.isArray(names) ? names : [names];
		types.push('');

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
				types.forEach(name => {
					const type = 'signal' + (name ? `-${name}` : '');
					emit(type, data);
				});
			};
		}

	}

}

/**
 * Create a new store
 * @param  {Object} data    The data object
 * @param  {Object} setters The store functions
 * @param  {Array} names    The custom event namespaces for the signal
 * @return {Proxy}          The Store instance
 */
function store (data = {}, setters = {}, names = '') {
	return new Store(data, setters, names);
}


export default store;