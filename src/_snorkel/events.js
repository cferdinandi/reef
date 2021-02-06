import * as _ from './utilities.js';
import * as $ from './dom.js';


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
	let link = _.getLink(event);
	if (!link || link.host !== window.location.host || link.hasAttribute('download') || link.getAttribute('rel') === 'external' || link.href.includes('mailto:') || !link.pathname.startsWith(instance._root)) return;

	// Check if link is a follow link and if autoLinks are enabled
	let follow = link.closest(instance._follow);
	let ignore = link.closest(instance._ignore);
	if (ignore && (!follow || !ignore.contains(follow))) return;
	if (!follow && !instance._autoLinks) return;

	// Make sure link isn't hash pointing to hash at current URL
	if (_.isSamePath(link) && link.hash.length) return;

	// Stop link from running
	event.preventDefault();

	// Fetch and update
	$.getHTML(link.href, {
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
		$.pushState(window.location.href, document.title, true);
		return;
	}

	// Make sure link isn't hash pointing to hash at current URL
	let link = new URL(event.state.url);
	if (_.isSamePath(link) && link.hash.length) return;

	// Get the HTML
	$.getHTML(event.state.url, {
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


export {click, pop};