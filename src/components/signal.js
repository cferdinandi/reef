import {emit, getType} from './utilities.js';


/**
 * Create a Proxy handler object
 * @param  {Array} names The custom event namespaces
 * @param  {Object} data The data object
 * @return {Object}      The handler object
 */
function handler (names, data) {
	let types = Array.isArray(names) ? names : [names];
	types.push('');
	return {
		get (obj, prop) {
			if (prop === '_isSignal') return true;
			if (['object', 'array'].includes(getType(obj[prop])) && !obj[prop]._isSignal) {
				obj[prop] = new Proxy(obj[prop], handler(name, data));
			}
			return obj[prop];
		},
		set (obj, prop, value) {
			if (obj[prop] === value) return true;
			obj[prop] = value;
			const eventData = {prop, value, action: 'set'};
			types.forEach(name => {
				const type = 'signal' + (name ? `-${name}` : '');
				emit(type, eventData);
			});
			return true;
		},
		deleteProperty (obj, prop) {
			delete obj[prop];
			const eventData = {prop, value: obj[prop], action: 'delete'};
			types.forEach(name => {
				const type = 'signal' + (name ? `-${name}` : '');
				emit(type, eventData);
			});
			return true;
		}
	};
}

/**
 * Create a new signal
 * @param  {Object} data The data object
 * @param  {Array} names The custom event namespaces
 * @return {Proxy}       The signal Proxy
 */
function signal (data = {}, names = '') {
	data = ['array', 'object'].includes(getType(data)) ? data : {value: data};
	return new Proxy(data, handler(names, data));
}


export default signal;
