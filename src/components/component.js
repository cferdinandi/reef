import render from './render.js';
import {emit, getElem} from './utilities.js';


/**
 * Create the event handler function
 * @param {Class} instance The Component instance
 */
function createHandler (instance) {
	return function handler (event) {
		instance.render();
	};
}

/**
 * Component Class
 */
class Component {

	/**
	 * The constructor object
	 * @param  {Node|String} elem            The element or selector to render the template into
	 * @param  {Function}    template        The template function to run when the data updates
	 * @param  {Object}      options         Additional options
	 * @param  {Array}       options.signals The names of the signals to listen for
	 * @param  {Object}      options.events  The allowed event functions
	 */
	constructor (elem, template, options) {

		// Create instance properties
		this.elem = elem;
		this.template = template;
		this.signals = options.signals ? options.signals.map((signal) => `reef:signal-${signal}`) : ['reef:signal'];
		this.events = options.events;
		this.handler = createHandler(this);
		this.debounce = null;

		// Init
		this.start();

	}

	/**
	 * Start reactive data rendering
	 */
	start () {
		for (let signal of this.signals) {
			document.addEventListener(signal, this.handler);
		}
		this.render();
		emit('start', null, getElem(this.elem));
	}

	/**
	 * Stop reactive data rendering
	 */
	stop () {
		for (let signal of this.signals) {
			document.removeEventListener(signal, this.handler);
		}
		emit('stop', null, getElem(this.elem));
	}

	/**
	 * Render the UI
	 */
	render () {

		// Cache instance
		let self = this;

		// If there's a pending render, cancel it
		if (self.debounce) {
			window.cancelAnimationFrame(self.debounce);
		}

		// Setup the new render to run at the next animation frame
		self.debounce = window.requestAnimationFrame(function () {
			render(self.elem, self.template(), self.events);
		});

	}

}

/**
 * Create a new listener
 * @param  {Node|String} elem     The element or selector to render the template into
 * @param  {Function}    template The template function to run when the data updates
 * @param  {Object}      options  Additional options
 */
function component (elem, template, options = {}) {
	return new Component(elem, template, options);
}


export default component;