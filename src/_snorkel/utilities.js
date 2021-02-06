// The global Reef instance
let Reef;
let diff;

// Cached page views
let cache = new Map();

/**
 * Define Reef instance and internal methods
 * @param {Constructor} reef      The Reef constructor
 * @param {Object}      internals Internal methods
 */
function setReef (reef, internals = {}) {
	Reef = reef;
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
	Reef.emit(document, 'snorkel:cache-updated', {url, html});

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
	Reef.emit(document, 'snorkel:cache-cleared', this);
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


export {Reef, diff, setReef, addToCache, getFromCache, clearCache, getLink, isSamePath};