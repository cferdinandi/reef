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

	}

	/**
	 * Create an event listener handler method
	 * @param  {Instance} instance The Listener class instance
	 * @return {Function}          The event handler method
	 */
	static getHandler (instance) {
		return function (event) {
			let target = event.target.closest(`[reef-on${event.type}]`);
			if (!target) return;
			let id = instance.#ids[target.getAttribute(`reef-on${event.type}`)];
			if (!instance.#events.includes(event.type) || !instance.#listeners[id]) return;
			instance.#listeners[id].fn(event);
		}
	}

	/**
	 * Delegate the event on an element
	 * @param  {Element} elem  The element to delegate events on
	 * @param  {String}  event The event name
	 * @param  {String}  val   The function to run for the event
	 */
	delegate (elem, event, val) {

		// Get the event listener ID
		let fnName = val.split('(')[0];
		let listener = this.#listeners[fnName];
		if (!listener) return;

		// Add the reef-on* attribute and remove the original
		elem.setAttribute(`reef-${event}`, listener.id);

		// If there's not already a listener, start one
		let type = event.replace('on', '');
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