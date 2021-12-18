import {getType, render} from './utilities.js';

/**
 * Create settings and getters for data Proxy
 * @param  {Constructor} instance The current instantiation
 * @return {Object}               The setter and getter methods for the Proxy
 */
function handler (instance) {
	return {
		get: function (obj, prop) {
			if (prop === '_isProxy') return true;
			if (['object', 'array'].includes(getType(obj[prop])) && !obj[prop]._isProxy) {
				obj[prop] = new Proxy(obj[prop], handler(instance));
			}
			return obj[prop];
		},
		set: function (obj, prop, value) {
			if (obj[prop] === value) return true;
			obj[prop] = value;
			render(instance);
			return true;
		},
		deleteProperty: function (obj, prop) {
			delete obj[prop];
			render(instance);
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
function makeProxy (data, instance) {
	if (!data) return null;
	return new Proxy(data, handler(instance));
}

export {makeProxy};