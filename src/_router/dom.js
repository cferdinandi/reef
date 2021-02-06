import * as _ from './utilities.js';


/**
 * Scroll to an anchor link
 * @param  {String} hash The anchor to scroll to
 * @param  {String} url  The URL to update [optional]
 */
function scrollToAnchor (hash, url) {

	// Update the URL
	if (url) {
		window.location.hash = '!' + cleanURL(url) + hash;
	}

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
 * Emit an event before routing
 * @param  {Object}      current The current route
 * @param  {Object}      next    The next route
 */
function preEvent (current, next) {
	let details = {
		current: current,
		next: next
	};
	// @deprecated Will be removed in v9
	_.Reef.emit(window, 'beforeRouteUpdated', details);
	return _.Reef.emit(window, 'router:before', details);
}

/**
 * Emit an event after routing
 * @param  {Object}      current  The current route
 * @param  {Object}      previous The previous route
 */
function postEvent (current, previous) {
	let details = {
		current: current,
		previous: previous
	};
	// @deprecated Will be removed in v9
	_.Reef.emit(window, 'routeUpdated', details);
	return _.Reef.emit(window, 'router:after', details);
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
 * Update the document title
 * @param  {Object}      route  The route object
 * @param  {Constructor} router The router component
 */
function updateTitle (route, router) {
	if (!route || !route.title) return;
	let title = typeof route.title === 'function' ? route.title(route) : route.title;
	document.title = typeof router.title === 'function' ? router.title(route, title) : router.title;
}

/**
 * Bring heading into focus for AT announcements
 */
function focusHeading () {
	let heading = document.querySelector('h1, h2, h3, h4, h5, h6');
	if (!heading) return;
	if (!heading.hasAttribute('tabindex')) { heading.setAttribute('tabindex', '-1'); }
	heading.focus();
}

/**
 * Render an updated UI
 * @param  {URL}         link   The URL object
 * @param  {Constructor} router The router component
 * @param  {String}      hash   An anchor link to scroll to [optional]
 */
function render (route, router, hash) {

	// Render each component
	renderComponents(router._components);

	// a11y adjustments
	updateTitle(route, router);
	if (hash) {
		scrollToAnchor(hash);
	} else {
		focusHeading();
	}

}

/**
 * Update the route
 * @param  {URL}         link   The URL object
 * @param  {Constructor} router The router component
 */
function updateRoute (link, router) {

	// Get the route
	let route = _.getRoute(link, router.routes, router.root, router.hash);

	// If redirect, recursively grab it
	if (route.redirect) return updateRoute(getLinkElem(typeof route.redirect === 'function' ? route.redirect(route) : route.redirect, router.root), router);

	// If hash enabled, handle anchors on URLs
	if (router.hash) {
		router.hashing = true;
		let hash = _.getHash(link.hash);
		if (route.url === router.current.url && hash.length) {
			scrollToAnchor(hash, route.url);
			return;
		}
	}

	// Emit pre-routing event
	let previous = router.current;
	preEvent(previous, route);

	// Update the route
	router.current = route;

	// Get the href
	let href = _.cleanURL(link.getAttribute('href'));

	// Update the URL
	if (router.hash) {
		window.location.hash = '!' + href;
	} else {
		history.pushState(route ? route : {}, route && route.title ? route.title : '', href);
	}

	// Render the UI
	render(route, router, router.hash ? _.getHash(link.hash) : link.hash);

	// Emit post-routing event
	postEvent(route, previous);

}


export {preEvent, postEvent, updateTitle, render, updateRoute};