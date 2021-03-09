/*! ReefSnorkel v8.2.3 | (c) 2021 Chris Ferdinandi | MIT License | http://github.com/cferdinandi/reef */
// The global Reef instance
let Reef$1;
let diff;

// Cached page views
let cache = new Map();

/**
 * Define Reef instance and internal methods
 * @param {Constructor} reef      The Reef constructor
 * @param {Object}      internals Internal methods
 */
function setReef (reef, internals = {}) {
	Reef$1 = reef;
	diff = internals.diff;
}

/**
 * Add an HTML page to cache
 * @param {String}  url  The URL
 * @param {String}  html The HTML
 * @param {Integer} size The maximum cache size
 */
function addToCache (url, html, size) {

	// Add the URL to the cache
	cache.set(url, {
		html: html,
		timestamp: new Date().getTime()
	});

	// Emit event
	Reef$1.emit(document, 'snorkel:cache-updated', {url, html});

	// If the cache is over size, delete the first entry
	if (cache.size > size) {
		cache.delete(keys().next().value);
	}

}

/**
 * Get a page from cache
 * @param  {String} url        The URL
 * @param  {Integer} cacheTime How long to keep it in cache
 * @return {String}            The HTML
 */
function getFromCache (url, cacheTime) {
	let html = cache.get(url);
	if (!html || (html.timestamp + cacheTime) > new Date().getTime()) {
		cache.delete(url);
		return;
	}
	return html.html;
}

/**
 * Clear the cache
 */
function clearCache() {
	cache.clear();
	Reef$1.emit(document, 'snorkel:cache-cleared', this);
}

/**
 * Get the link from the event
 * @param  {Event} event The event object
 * @return {Node}        The link
 */
function getLink (event) {
	if (!('closest' in event.target)) return;
	return event.target.closest('a');
}

/**
 * Check if URL matches current location
 * @param  {String}  url  The URL path
 * @param  {Boolean} hash If true, using hashbang routing
 * @return {Boolean}      If true, points to current location
 */
function isSamePath (url, hash) {
	return url.pathname === window.location.pathname && url.search === window.location.search;
}

/**
 * Scroll to an anchor link
 * @param  {String} hash The anchor to scroll to
 */
function scrollToAnchor (hash) {

	// If there's no hash, scroll to the top of the page and bail
	if (!hash) return;

	// Get the element from its hash
	let elem = document.getElementById(hash.slice(1));
	if (!elem) return;

	// Scroll to the element
	elem.scrollIntoView();

	// If the element is not in focus, focus it
	if (document.activeElement === elem) return;
	elem.setAttribute('tabindex', '-1');
	elem.focus();

}

/**
 * Update the page stated
 * @param  {String} url      The URL
 * @param  {String} title    The page title
 * @param  {Boolean} replace If true, replace instead of push
 */
function pushState (url, title, replace) {
	history[replace ? 'replaceState' : 'pushState']({url: url}, title, url);
}

/**
 * Emit an event before routing
 * @param  {String} current The current URL
 * @param  {String} next    The next URL
 */
function preEvent (current, next) {
	return Reef$1.emit(document, 'snorkel:before', {
		current: current,
		next: next
	});
}

/**
 * Emit an event after routing
 * @param  {String} current  The current URL
 * @param  {String} previous The previous URL
 */
function postEvent (current, previous) {
	return Reef$1.emit(document, 'snorkel:after', {
		current: current,
		previous: previous
	});
}

/**
 * Emit an event on 404
 * @param  {String} current  The current URL
 * @param  {String} notFound The URL that wasn't found
 */
function notFoundEvent (current, notFound) {
	return Reef$1.emit(document, 'snorkel:not-found', {
		current: current,
		notFound: notFound
	});
}

/**
 * Render any components using this router
 * @param  {Array} components Attached components
 */
function renderComponents (components) {
	components.forEach(function (component) {
		if (!('render' in component)) return;
		component.render();
	});
}

/**
 * Get the DOM from an HTML string
 * @param  {String} str The HTML string
 * @return {HTML}       The DOM
 */
function getDOM (str) {
	let parser = new DOMParser();
	let doc = parser.parseFromString(str, 'text/html');
	return doc;
}

/**
 * Update the existing DOM with the new one
 * @param  {Document} dom      The document object
 * @param  {Object}   settings The settings for the render
 */
function updateDOM (dom, settings) {

	// Add a loading class
	document.documentElement.classList.add(settings.loading);

	// Diff the head and replace the body
	diff(dom.head, document.head);
	document.body.replaceWith(dom.body);

	// Scroll to the top of the page
	window.scrollTo(0, 0);

	// Remove the loading class
	document.documentElement.classList.remove(settings.loading);

}

/**
 * Render the DOM
 * @param  {String} html    The HTML string
 * @param  {Object} options The settings for the render
 */
function render (html, settings) {

	// Get a document from the HTML string
	let dom = getDOM(html);
	let {noPush, replace, url, current, components} = settings;

	// Update the DOM
	updateDOM(dom, settings);

	// Update the URL
	if (!noPush) {
		pushState(url, dom.title, replace);
	}

	// Render each component
	renderComponents(components);

	// Scroll as needed
	scrollToAnchor(window.location.hash);

	// Emit an event
	postEvent(url, current);

}

/**
 * Fetch an HTML page
 * @param  {String} url     The URL
 * @param  {Object} options The settings for this fetch
 */
function getHTML (url, settings) {

	// Cache the current URL
	let current = window.location.href;

	// Update the settings
	Object.assign(settings, {current, url});

	// Extract the settings
	let {cacheTime, cacheSize} = settings;

	// Run a pre-fetch event
	let cancelled = !preEvent(current, url);

	// If the event was cancelled, bail
	if (cancelled) return;

	// If a cache should be used, and it exists, use it
	if (cacheTime) {
		let cache = getFromCache(url, cacheTime);
		if (cache) {
			render(cache, settings);
			return;
		}
	}

	// Fetch the HTML
	fetch(url).then(function (response) {
		if (response.ok) return response.text();
		throw response.statusText;
	}).then(function (text) {
		render(text, settings);
		addToCache(url, text, cacheSize);
	}).catch(function (error) {
		Reef.err(error, true);
		notFoundEvent(current, url);
	});

}

/**
 * Handle click events
 * @param  {Event}       event    The event object
 * @param  {Constructor} instance The Snorkel instance
 */
function clickHandler (event, instance) {

	// Ignore for right-click or control/command click
	// Ignore if event was prevented
	if (event.metaKey || event.ctrlKey || event.shiftKey || event.defaultPrevented) return;

	// Check if a link was clicked
	// Ignore if link points to external location
	// Ignore if link has "download", rel="external", or "mailto:"
	// Ignore if link doesn't start with root
	let link = getLink(event);
	if (!link || link.host !== window.location.host || link.hasAttribute('download') || link.getAttribute('rel') === 'external' || link.href.includes('mailto:') || !link.pathname.startsWith(instance._root)) return;

	// Check if link is a follow link and if autoLinks are enabled
	let follow = link.closest(instance._follow);
	let ignore = link.closest(instance._ignore);
	if (ignore && (!follow || !ignore.contains(follow))) return;
	if (!follow && !instance._autoLinks) return;

	// Make sure link isn't hash pointing to hash at current URL
	if (isSamePath(link) && link.hash.length) return;

	// Stop link from running
	event.preventDefault();

	// Fetch and update
	getHTML(link.href, {
		replace: link.closest(instance._replace),
		cacheSize: instance._cacheSize,
		components: instance._components,
		loading: instance._loading
	});

}

/**
 * Handle popstate events
 * @param  {Event}       event    The event object
 * @param  {Constructor} instance The Snorkel instance
 */
function popHandler (event, instance) {

	// If there's no event state, push one
	if (!event.state) {
		pushState(window.location.href, document.title, true);
		return;
	}

	// Make sure link isn't hash pointing to hash at current URL
	let link = new URL(event.state.url);
	if (isSamePath(link) && link.hash.length) return;

	// Get the HTML
	getHTML(event.state.url, {
		noPush: true,
		cacheTime: instance._cache ? instance._cacheTime : false,
		components: instance._components,
		loading: instance._loading
	});

}

/**
 * Get a click event callback function for a specific instance
 * @param  {Constructor} instance The ReefRouter instance
 * @param  {Constructor} Reef     The Reef Constructor
 * @return {Function}             The callback function
 */
function click (instance) {
	return function (event) { clickHandler(event, instance); };
}

/**
 * Get a pop event callback function for a specific instance
 * @param  {Constructor} instance The ReefRouter instance
 * @param  {Constructor} Reef     The Reef Constructor
 * @return {Function}             The callback function
 */
function pop (instance) {
	return function (event) { popHandler(event, instance); };
}

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
let click$1, pop$1;

/**
 * Snorkel constructor
 * @param {Object} options The library options
 */
function ReefSnorkel (options = {}) {

	// Make sure there's a Reef instance
	if (!Reef$1 || !diff || !Reef$1.err) {
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
		Reef$1.err('An instance of ReefSnorkel was already running, and has been stopped.');
		isRunning.stop();
	}

	// Setup event listeners
	click$1 = click(this);
	pop$1 = pop(this);
	history.replaceState({url: window.location.href}, document.title, window.location.href);
	document.addEventListener('click', click$1);
	window.addEventListener('popstate', pop$1);

	// Cache the instance
	isRunning = this;

	// Emit initialized event
	Reef$1.emit(document, 'snorkel:initialized', this);

};

/**
 * Stop Snorkel instance from running
 */
ReefSnorkel.prototype.stop = function () {

	// Stop event listeners
	document.removeEventListener('click', click$1);
	window.removeEventListener('popstate', pop$1);

	// Clear the cache
	clearCache();

	// Flush variables
	click$1 = null;
	pop$1 = null;
	isRunning = false;

	// Emit stopped event
	Reef$1.emit(document, 'snorkel:stopped', this);

};

/**
 * Visit a URL
 * @param  {String}  url     The URL to visit
 * @param  {Boolean} replace If true, replace the current page state instead of adding a new entry
 */
ReefSnorkel.prototype.visit = function (url, replace) {
	getHTML(url, {
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
	clearCache();
};

/**
 * Add a component to the instance
 * @param {Reef|Array} component A Reef component, or an array of components
 */
ReefSnorkel.prototype.addComponent = function (component) {

	// Add components
	let components = Reef$1.trueTypeOf(component) === 'array' ? component : [component];
	for (let comp of components) {
		this._components.push(comp);
	}

	// Emit components added event
	Reef$1.emit(document, 'snorkel:components-added', {
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
	let components = Reef$1.trueTypeOf(component) === 'array' ? component : [component];
	for (let comp of components) {
		let index = this._components.indexOf(comp);
		if (index < 0) return;
		this._components.splice(index, 1);
	}

	// Emit components removed event
	Reef$1.emit(document, 'snorkel:components-removed', {
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
	setReef(reef, internals);

	// Emit ready event
	Reef$1.emit(document, 'snorkel:ready');

};

// Auto-install when used as a global script
if (typeof window !== 'undefined' && window.Reef) {
	window.Reef.use(ReefSnorkel);
}

export default ReefSnorkel;
