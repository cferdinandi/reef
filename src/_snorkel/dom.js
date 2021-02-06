import * as _ from './utilities.js';


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
	return _.Reef.emit(document, 'snorkel:before', {
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
	return _.Reef.emit(document, 'snorkel:after', {
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
	return _.Reef.emit(document, 'snorkel:not-found', {
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
	_.diff(dom.head, document.head);
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
		let cache = _.getFromCache(url, cacheTime);
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
		_.addToCache(url, text, cacheSize);
	}).catch(function (error) {
		Reef.err(error, true);
		notFoundEvent(current, url);
	});

}


export {pushState, preEvent, postEvent, notFoundEvent, getHTML};