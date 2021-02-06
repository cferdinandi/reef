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
function cleanURL (str) {
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
		let parts = replaceDynamicURLParts(cleanURL(route.url));
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
function getLinkElem (url, root) {
	let link = document.createElement('a');
	link.href = (root.length ? cleanURL(root) : '') + cleanURL(url);
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
	let href = cleanURL(url.pathname);
	if (!root.length) return href;
	root = cleanURL(root);
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
		url = getLinkElem(url.hash.slice(2), root);
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
	let href = getHref(url, root, hash);
	let matches = findMatchedRoutes(href, routes);
	if (!matches.length) return;
	let route = Reef.clone(matches[0].route, true);
	if (route.redirect) {
		return getRoute(getLinkElem(typeof route.redirect === 'function' ? route.redirect(route) : route.redirect, root), routes, root, hash);
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


export {Reef, setReef, cleanURL, getLink, getLinkElem, getRoute, getHash, isSamePath};