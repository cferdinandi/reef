import {emit, getType} from './utilities.js';


/**
 * Create a Proxy handler object
 * @param  {String} name The custom event namespace
 * @param  {Object} data The data object
 * @return {Object}      The handler object
 */
function handler (name, data) {
	let type = 'signal' + (name ? `-${name}` : '');
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
			emit(type, {prop, value, action: 'set'});
			return true;
		},
		deleteProperty (obj, prop) {
			delete obj[prop];
			emit(type, {prop, value: obj[prop], action: 'delete'});
			return true;
		}
	};
}

/**
 * Create a new signal
 * @param  {Object} data The data object
 * @param  {String} name The custom event namespace
 * @return {Proxy}       The signal Proxy
 */
function signal (data = {}, name = '') {
	data = ['array', 'object'].includes(getType(data)) ? data : {value: data};
	return new Proxy(data, handler(name, data));
}


export default signal;
