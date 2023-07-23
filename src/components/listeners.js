/**
 * Handlers Class
 */
class Listeners {

	#listeners;
	#ids;
	#events;

	/**
	 * The constructor object
	 * @param  {Object} listeners The event listeners to register
	 */
	constructor (listeners) {

		// Create instance properties
		this.#listeners = {};
		this.#ids = {};
		this.#events = [];

		// Setup property values
		for (let [key, fn] of Object.entries(listeners)) {
			let id = crypto.randomUUID();
			this.#listeners[key] = {fn, id};
			this.#ids[id] = key;
		}

		console.log(this.#ids);
		console.log(this.#listeners);

	}

	static getHandler (instance) {
		return function (event) {
			let target = event.target.closest(`[reef-on${event.type}]`);
			if (!target) return;
			let id = instance.#ids[target.getAttribute(`reef-on${event.type}`)];
			if (!instance.#events.includes(event.type) || !instance.#listeners[id]) return;
			instance.#listeners[id].fn(event);
		}
	}



	listen (type) {
		if (this.#events.includes(type)) return;
		document.addEventListener(type, Listeners.getHandler(this), true);
		this.#events.push(type);
	}


}

/**
 * Create a new listeners instance
 * @param  {Object} listeners The event listeners to register
 */
function listeners (listeners) {
	return new Listeners(listeners);
}


export default listeners;