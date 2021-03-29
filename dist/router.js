/*! ReefRouter v8.2.5 | (c) 2021 Chris Ferdinandi | MIT License | http://github.com/cferdinandi/reef */
var ReefRouter = (function () {
	'use strict';

	// The global Reef instance
	let Reef;

	// RegExp patterns
	let regPatterns = {
		parameterRegex: /([:*])(\w+)/g,
		wildcardRegex: /\*/g,
		replaceVarRegex: '([^\/]+)',
		replaceWildcard: '(?:.*)',
		followedBySlashRegex: '(?:\/$|$)',
		matchRegexFlags: ''
	};


	function setReef (reef) {
		Reef = reef;
	}

	/**
	 * Get the URL parameters
	 * @param  {String} url The URL
	 * @return {Object}     The URL parameters
	 */
	function getParams (url) {
		let search = new URL(url).searchParams;
		let obj = {};
		for (let [key, value] of search) {
			if (obj[key] !== undefined) {
				if (!Array.isArray(obj[key])) {
					obj[key] = [obj[key]];
				}
				obj[key].push(value);
			} else {
				obj[key] = value;
			}
		}
		return obj;
	}

	/**
	 * Remove hashbang (#!) from a string
	 * @param  {String} str The string
	 * @return {String}     The string with the hashbang removed
	 */
	function removeHashBang (str) {
		return str.replace(/^(#!)\/?/g, '');
	}

	/**
	 * Remove leading and trailing slashes from a string
	 * @param  {String} str The string
	 * @return {String}     The string with slashes removed
	 */
	function removeSlashes (str) {
		return str.replace(/^\/|\/$/g, '');
	}

	/**
	 * Remove slashes and hashbangs from a URL
	 * @param  {String} str The string
	 * @return {String}     The string with slashes and hashbangs removed
	 */
	function cleanURL$1 (str) {
		return '/' + removeHashBang(removeSlashes(str));
	}

	/**
	 * Extract parameters from URL
	 * @param  {String} match The URL to extract parameters from
	 * @param  {Array}  names The parameter names
	 * @return {Object}       The parameters as key/value pairs
	 */
	function regExpResultToParams (match, names) {
		if (!match || names.length === 0) return {};
		return match.slice(1, match.length).reduce(function (params, value, index) {
			params[names[index]] = decodeURIComponent(value);
			return params;
		}, {});
	}

	/**
	 * Replace dynamic parts of a URL
	 * @param  {String} route The URL path
	 * @return {Object}       The regex and parameter names
	 */
	function replaceDynamicURLParts (route) {

		// Setup parameter names array
		let paramNames = [];

		// Parse route
		let regexp = new RegExp(route.replace(regPatterns.parameterRegex, function (full, dots, name) {
			paramNames.push(name);
			return regPatterns.replaceVarRegex;
		}).replace(regPatterns.wildcardRegex, regPatterns.replaceWildcard) + regPatterns.followedBySlashRegex, regPatterns.matchRegexFlags);

		return {
			regexp: regexp,
			paramNames: paramNames
		};

	}

	/**
	 * If the URL points to '/', check for home route
	 * @param  {Array} routes The routes
	 * @return {Array}        The homepage route
	 */
	function getHome (routes) {
		let home = routes.find(function (route) {
			return route.url === '/';
		});
		return home ? [{
			route: home,
			params: {}
		}] : null;
	}

	/**
	 * Find routes that match the pattern
	 * @param  {String} url   The URL path
	 * @param  {Array} routes The routes
	 * @return {Array}        The matching routes
	 */
	function findMatchedRoutes (url, routes) {

		// If there are no routes, or the routes are not an array
		if (!routes || Reef.trueTypeOf(routes) !== 'array') return [];

		// Check for a home route if the url is a single slash
		if (url === '/') {
			let home = getHome(routes);
			if (home) return home;
		}

		// Otherwise, find any routes that match the pattern
		return routes.map(function (route) {
			let parts = replaceDynamicURLParts(cleanURL$1(route.url));
			let match = url.replace(/^\/+/, '/').match(parts.regexp);
			if (!match) return;
			let params = regExpResultToParams(match, parts.paramNames);
			return {
				route: route,
				params: params
			};
		}).filter(function (match) {
			return match;
		});

	}

	/**
	 * Get the link from the event
	 * @todo  move to top of page
	 * @param  {Event} event The event object
	 * @return {Node}        The link
	 */
	function getLink (event, router) {
		if (!('closest' in event.target)) return;
		return event.target.closest('a');
	}

	/**
	 * Create a link element from a URL
	 * @param  {String} url  The URL
	 * @param  {String} root The root for the domain
	 * @return {Node}       The element
	 */
	function getLinkElem$1 (url, root) {
		let link = document.createElement('a');
		link.href = (root.length ? cleanURL$1(root) : '') + cleanURL$1(url);
		return link;
	}

	/**
	 * Get the href from a full URL, excluding hashes and query strings
	 * @param  {URL}     url  The URL object
	 * @param  {String}  root The root domain
	 * @param  {Boolean} hash If true, as hash is used
	 * @return {String}      The href
	 */
	function getHref (url, root, hash) {
		let href = cleanURL$1(url.pathname);
		if (!root.length) return href;
		root = cleanURL$1(root);
		if (href.startsWith(root)) {
			href = href.slice(root.length);
		}
		if (!href.length) {
			href = '/';
		}
		return href;
	}

	/**
	 * Get a cleaned up URL object
	 * @param  {URL}     url  The URL object
	 * @param  {String}  root The root domain
	 * @param  {Boolean} hash If true, as hash is used
	 * @return {URL}          The URL object
	 */
	function getURL (url, root, hash) {
		if ((hash && url.pathname.slice(-5) === '.html') || url.hash.startsWith('#!')) {
			url = getLinkElem$1(url.hash.slice(2), root);
		}
		return url;
	}

	/**
	 * Get the route from the URL
	 * @param  {URL} url      The URL object
	 * @param  {Array} routes The routes
	 * @param  {String} root  The domain root
	 * @return {Object}       The matching route
	 */
	function getRoute (url, routes, root, hash) {
		url = getURL(url, root, hash);
		let href = getHref(url, root);
		let matches = findMatchedRoutes(href, routes);
		if (!matches.length) return;
		let route = Reef.clone(matches[0].route, true);
		if (route.redirect) {
			return getRoute(getLinkElem$1(typeof route.redirect === 'function' ? route.redirect(route) : route.redirect, root), routes, root, hash);
		}
		route.params = matches[0].params;
		route.search = getParams(url);
		return route;
	}

	/**
	 * Get true hash from hashbang (#!) string
	 * @param  {String} str The string
	 * @return {String}     The hash
	 */
	function getHash (str) {
		let parts = str.split('#');
		return parts[2] ? '#' + parts[2] : '';
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
		Reef.emit(window, 'beforeRouteUpdated', details);
		return Reef.emit(window, 'router:before', details);
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
		Reef.emit(window, 'routeUpdated', details);
		return Reef.emit(window, 'router:after', details);
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
		let route = getRoute(link, router.routes, router.root, router.hash);

		// If redirect, recursively grab it
		if (route.redirect) return updateRoute(getLinkElem(typeof route.redirect === 'function' ? route.redirect(route) : route.redirect, router.root), router);

		// If hash enabled, handle anchors on URLs
		if (router.hash) {
			router.hashing = true;
			let hash = getHash(link.hash);
			if (route.url === router.current.url && hash.length) {
				scrollToAnchor(hash, route.url);
				return;
			}
		}

		// Emit pre-routing event
		let previous = router.current;
		let cancelled = !preEvent(previous, route);

		// If the event was cancelled, bail
		if (cancelled) return;

		// Update the route
		router.current = route;

		// Get the href
		let href = cleanURL$1(link.getAttribute('href'));

		// Update the URL
		if (router.hash) {
			window.location.hash = '!' + href;
		} else {
			history.pushState(route ? route : {}, route && route.title ? route.title : '', href);
		}

		// Render the UI
		render(route, router, router.hash ? getHash(link.hash) : link.hash);

		// Emit post-routing event
		postEvent(route, previous);

	}

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
		let link = getLink(event);
		if (!link || link.host !== window.location.host || link.hasAttribute('download') || link.getAttribute('rel') === 'external' || link.href.includes('mailto:')) return;

		// Make sure link isn't hash pointing to hash at current URL
		if (isSamePath(link) && !router.hash && link.hash.length) return;

		// Stop link from running
		event.preventDefault();

		// Update the route
		updateRoute(link, router);

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
			preEvent(previous, event.state);

			// Update the UI
			router.current = event.state;
			render(router.current, router);

			// Emit post-routing event
			postEvent(event.state, previous);

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
		let link = getLinkElem$1(window.location.hash.slice(2), router.root);
		let href = link.getAttribute('href');
		let route = getRoute(link, router.routes, router.root, router.hash);

		// Emit pre-routing event
		let previous = router.current;
		let cancelled = !preEvent(previous, route);

		// If the event was cancelled, bail
		if (cancelled) return;

		// Update the UI
		router.current = route;
		render(route, router);

		// Emit post-routing event
		postEvent(route, previous);

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

	// Default settings
	let defaults = {
		routes: [],
		root: '',
		title: function (route, title) {
			return title;
		},
		components: [],
		useHash: false
	};

	/**
	 * Router constructor
	 * @param {Object} options The router options
	 */
	function ReefRouter (options = {}) {

		// Make sure there's a Reef instance
		if (!Reef || !Reef.err) {
			throw new Error('Reef not found. Use Reef.use(ReefRouter) to define your global Reef library.');
		}

		// Merge user options into defaults
		let _settings = Object.assign({}, defaults, options);

		// Properties
		let _this = this;
		let _routes = _settings.routes;
		let _hash = _settings.useHash || window.location.protocol === 'file:';
		let _current = getRoute(window.location, _routes, _settings.root, _hash);
		_this._hashing = false;

		// Create immutable property getters
		Object.defineProperties(_this, {

			// Read-only properties
			routes: {value: Reef.clone(_routes, true)},
			root: {value: _settings.root},
			title: {value: _settings.title},
			hash: {value: _hash},
			_components: {value: _settings.components},

			// Current route
			// Return immutable copy
			current: {
				get: function () {
					return Reef.clone(_current, true);
				},
				set: function (route) {
					_current = route;
					return true;
				}
			},

			// Settings for _routes
			_routes: {
				set: function (routes) {
					_routes = routes;
					return true;
				}
			}

		});

		// Initial setup
		updateTitle(_current, _this);

		// Listen for clicks and popstate events
		document.addEventListener('click', click(_this));
		if (_hash) {
			window.addEventListener('hashchange', hash(_this));
		} else {
			history.replaceState(_current, document.title, window.location.href);
			window.addEventListener('popstate', pop(_this));
		}

		// Emit initialized event
		Reef.emit(document, 'router:initialized', _this);

	}

	/**
	 * Add routes to the router
	 * @param {Array|Object} routes The route or routes to add
	 */
	ReefRouter.prototype.addRoutes = function (routes) {

		// Make sure the routes are an array or object
		let type = Reef.trueTypeOf(routes);
		if (!['array', 'object'].includes(type)) return Reef.err('Please provide a valid route or routes.');

		// Merge them into the routes
		let arr = type === 'array' ? routes : [routes];
		for (let route of arr) {
			this.routes.push(route);
		}

		// Emit routes added event
		Reef.emit(document, 'router:routes-added', {
			router: this,
			routes: arr
		});

	};

	/**
	 * Remove route from the router
	 * @param {Array|Object} routes The route or routes to add
	 */
	ReefRouter.prototype.removeRoutes = function (routes) {

		// Make sure the routes are an array or object
		let type = Reef.trueTypeOf(routes);
		if (!['array', 'object'].includes(type)) return Reef.err('Please provide a valid route or routes.');

		// If it's an object, push it
		// Otherwise, merge them
		let arr = type === 'array' ? routes : [routes];
		for (let route of arr) {
			let index = this.routes.findIndex(function (r) {
				return r.url === route.url;
			});
			if (index < 0) return;
			this.routes.splice(index, 1);
		}

		// Emit routes removed event
		Reef.emit(document, 'router:routes-removed', {
			router: this,
			routes: arr
		});

	};

	/**
	 * Add a component to the router
	 * @param {Reef} component A Reef component
	 */
	ReefRouter.prototype.addComponent = function (component) {

		// Add components
		let components = Reef.trueTypeOf(component) === 'array' ? component : [component];
		for (let comp of components) {
			this._components.push(comp);
			comp.router = this;
		}

		// Emit event
		Reef.emit(document, 'router:components-added', {
			router: this,
			components
		});

	};

	/**
	 * Remove a component to the router
	 * @param {Reef} component A Reef component
	 */
	ReefRouter.prototype.removeComponent = function (component) {

		// Remove components
		let components = Reef.trueTypeOf(component) === 'array' ? component : [component];
		for (let comp of components) {
			let index = this._components.indexOf(comp);
			if (index < 0) return;
			this._components.splice(index, 1);
			comp.router = null;
		}

		// Emit event
		Reef.emit(document, 'router:components-removed', {
			router: this,
			components
		});

	};

	/**
	 * Go to a path
	 * @param  {String} url The URL to visit
	 */
	ReefRouter.prototype.visit = function (url) {
		updateRoute(getLinkElem$1(url, this.root), this);
	};

	// @deprecated Will be removed in v9
	ReefRouter.prototype.navigate = ReefRouter.prototype.visit;

	/**
	 * Update the title
	 */
	ReefRouter.prototype.updateTitle = function () {
		updateTitle(this.current, this);
	};

	/**
	 * Define the Reef instance and attach the Router to it
	 * @param  {Constructor} reef The Reef instance
	 */
	ReefRouter.install = function (reef) {

		// Define the Reef object
		setReef(reef);

		// Emit ready event
		Reef.emit(document, 'router:ready');

	};

	// Auto-install when used as a global script
	if (typeof window !== 'undefined' && window.Reef) {
		window.Reef.use(ReefRouter);
	}

	return ReefRouter;

}());
