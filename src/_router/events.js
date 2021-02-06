import * as _ from './utilities.js';
import * as $ from './dom.js';


/**
 * Handle click events
 * @param  {Event}       event  The event object
 * @param  {Constructor} router The router component
 */
function clickHandler (event, router) {

	// Ignore for right-click or control/command click
	// Ignore if event was prevented
	if (event.metaKey || event.ctrlKey || event.shiftKey || event.defaultPrevented) return;

	// Check if a link was clicked
	// Ignore if link points to external location
	// Ignore if link has "download", rel="external", or "mailto:"
	let link = _.getLink(event);
	if (!link || link.host !== window.location.host || link.hasAttribute('download') || link.getAttribute('rel') === 'external' || link.href.includes('mailto:')) return;

	// Make sure link isn't hash pointing to hash at current URL
	if (_.isSamePath(link) && !router.hash && link.hash.length) return;

	// Stop link from running
	event.preventDefault();

	// Update the route
	$.updateRoute(link, router);

}

/**
 * Handle popstate events
 * @param  {Event}       event  The event object
 * @param  {Constructor} router The router component
 */
function popHandler (event, router) {
	if (!event.state) {
		history.replaceState(router.current, document.title, window.location.href);
	} else {

		// Emit pre-routing event
		let previous = router.current;
		$.preEvent(previous, event.state);

		// Update the UI
		router.current = event.state;
		$.render(router.current, router);

		// Emit post-routing event
		$.postEvent(event.state, previous);

	}
}

/**
 * Handle hashchange events
 * @param  {Event}       event  The event object
 * @param  {Constructor} router The router component
 */
function hashHandler (event, router) {

	// Don't run on hashchange transitions
	if (router.hashing) {
		router.hashing = false;
		return;
	}

	// Parse a link from the URL
	let link = _.getLinkElem(window.location.hash.slice(2), router.root);
	let href = link.getAttribute('href');
	let route = _.getRoute(link, router.routes, router.root, router.hash);

	// Emit pre-routing event
	let previous = router.current;
	let cancelled = !$.preEvent(previous, route);

	// If the event was cancelled, bail
	if (cancelled) return;

	// Update the UI
	router.current = route;
	$.render(route, router);

	// Emit post-routing event
	$.postEvent(route, previous);

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

/**
 * Get a hash change event callback function for a specific instance
 * @param  {Constructor} instance The ReefRouter instance
 * @param  {Constructor} Reef     The Reef Constructor
 * @return {Function}             The callback function
 */
function hash (instance) {
	return function (event) { hashHandler(event, instance); };
}


export {click, pop, hash};