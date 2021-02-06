import * as _ from './utilities.js';
import * as $ from './dom.js';
import * as events from './events.js';


// Default settings
let defaults = {
	autoLinks: true,
	follow: '[snorkel]',
	ignore: '[snorkel-ignore]',
	replace: '[snorkel="replace"]',
	loading: 'reef-loading',
	root: '/',
	cache: true,
	cacheSize: 50,
	cacheTime: 3600,
	components: []
};

// Is a Snorkel currently running
let isRunning = false;

// Cached event listeners
let click, pop;

/**
 * Snorkel constructor
 * @param {Object} options The library options
 */
function ReefSnorkel (options = {}) {

	// Make sure there's a Reef instance
	if (!_.Reef || !_.diff || !_.Reef.err) {
		throw new Error('Reef not found. Use Reef.use(ReefSnorkel) to install this plugin.');
	}

	// Properties
	let _this = this;
	let _settings = Object.assign({}, defaults, options);

	// Create immutable property getter
	Object.defineProperties(_this, {

		// Read-only properties
		_autoLinks: {value: _settings.autoLinks},
		_follow: {value: _settings.follow},
		_ignore: {value: _settings.ignore},
		_replace: {value: _settings.replace},
		_root: {value: _settings.root},
		_cache: {value: _settings.cache},
		_cacheSize: {value: _settings.cacheSize * 1000},
		_cacheTime: {value: _settings.cacheTime},
		_loading: {value: _settings.loading},

		// Getter for _components
		// returns immutable copy
		_components: {
			get: function () {
				return _settings.components;
			}
		}

	});

	// Start the instance
	_this.run();

}

/**
 * Start/restart a snorkel instance
 */
ReefSnorkel.prototype.run = function () {

	// If an instance is already running, stop it
	if (isRunning) {
		_.Reef.err('An instance of ReefSnorkel was already running, and has been stopped.');
		isRunning.stop();
	}

	// Setup event listeners
	click = events.click(this);
	pop = events.pop(this);
	history.replaceState({url: window.location.href}, document.title, window.location.href);
	document.addEventListener('click', click);
	window.addEventListener('popstate', pop);

	// Cache the instance
	isRunning = this;

	// Emit initialized event
	_.Reef.emit(document, 'snorkel:initialized', this);

};

/**
 * Stop Snorkel instance from running
 */
ReefSnorkel.prototype.stop = function () {

	// Stop event listeners
	document.removeEventListener('click', click);
	window.removeEventListener('popstate', pop);

	// Clear the cache
	_.clearCache();

	// Flush variables
	click = null;
	pop = null;
	isRunning = false;

	// Emit stopped event
	_.Reef.emit(document, 'snorkel:stopped', this);

};

/**
 * Visit a URL
 * @param  {String}  url     The URL to visit
 * @param  {Boolean} replace If true, replace the current page state instead of adding a new entry
 */
ReefSnorkel.prototype.visit = function (url, replace) {
	$.getHTML(url, {
		replace,
		cacheSize: this._cacheSize,
		components: this._components,
		loading: this._loading
	});
};

/**
 * Clear the page cache
 */
ReefSnorkel.prototype.clearCache = function () {
	_.clearCache();
};

/**
 * Add a component to the instance
 * @param {Reef|Array} component A Reef component, or an array of components
 */
ReefSnorkel.prototype.addComponent = function (component) {

	// Add components
	let components = _.Reef.trueTypeOf(component) === 'array' ? component : [component];
	for (let comp of components) {
		this._components.push(comp);
	}

	// Emit components added event
	_.Reef.emit(document, 'snorkel:components-added', {
		snorkel: this,
		components
	});

};

/**
 * Remove a component to the instance
 * @param {Reef|Array} component A Reef component, or an array of components
 */
ReefSnorkel.prototype.removeComponent = function (component) {

	// Remove the components
	let components = _.Reef.trueTypeOf(component) === 'array' ? component : [component];
	for (let comp of components) {
		let index = this._components.indexOf(comp);
		if (index < 0) return;
		this._components.splice(index, 1);
	}

	// Emit components removed event
	_.Reef.emit(document, 'snorkel:components-removed', {
		snorkel: this,
		components
	});

};

/**
 * Define the Reef instance and attach the snorkel to it
 * @param  {Constructor} reef      The Reef instance
 * @param  {Object}      internals Internal methods
 */
ReefSnorkel.install = function (reef, internals) {

	// Define the Reef object
	_.setReef(reef, internals);

	// Emit ready event
	_.Reef.emit(document, 'snorkel:ready');

};

// Auto-install when used as a global script
if (typeof window !== 'undefined' && window.Reef) {
	window.Reef.use(ReefSnorkel);
}


export default ReefSnorkel;