//
// Variables
//

var regPatterns = {
	parameterRegex: /([:*])(\w+)/g,
	wildcardRegex: /\*/g,
	replaceVarRegex: '([^\/]+)',
	replaceWildcard: '(?:.*)',
	followedBySlashRegex: '(?:\/$|$)',
	matchRegexFlags: ''
}


//
// Methods
//

/**
 * Check if pushState() is supported by the browser
 * @return {Boolean} If true, pushState() is supported
 */
var isPushStateAvailable = function () {
	return !!(
		typeof window !== 'undefined' &&
		window.history &&
		window.history.pushState
	);
};

/**
 * Escape slashes in string patterns
 * @param  {String} s The string to clean
 * @return {String}   The cleaned string
 */
var clean = function (s) {
	if (s instanceof RegExp) return s;
	return s.replace(/\/+$/, '').replace(/^\/+/, '^/');
};

/**
 * Create an object of parameters from regex result
 * @param  {Array} match Items that match the regex pattern
 * @param  {Array} names The parameter names
 * @return {Object}      The parameters
 */
var regExpResultToParams = function (match, names) {
	if (!match || names.length === 0) return;
	return match.slice(1, match.length).reduce(function (params, value, index) {
		params[names[index]] = decodeURIComponent(value);
		return params;
	}, {});
};

/**
 * Replace dynamic URL parts with their values
 * @param  {String} route The route
 * @return {Object}       The parameters
 */
var replaceDynamicURLParts = function (route) {

	// Variables
	var paramNames = [];
	var regexp;

	// If route is already a regex, use it
	// Other wise, replace dynamic parts
	if (route instanceof RegExp) {
		regexp = route;
	} else {
		regexp = new RegExp(
			route.replace(regPatterns.parameterRegex, function (full, dots, name) {
				paramNames.push(name);
				return regPatterns.replaceVarRegex;
			}).replace(regPatterns.wildcardRegex, regPatterns.replaceWildcard) + regPatterns.followedBySlashRegex, regPatterns.matchRegexFlags);
	}

	return {
		regexp: regexp,
		paramNames: paramNames
	};

};

/**
 * Return an array of matched routes
 * @param  {String} url    The URL
 * @param  {Array}  routes The routes
 * @return {Array}         The matched routes
 */
var findMatchedRoutes = function (url, routes) {
	if (!routes) return [];
	return routes.map(function (route) {
		var parts = replaceDynamicURLParts(clean(route.url));
		var match = url.replace(/^\/+/, '/').match(parts.regexp);
		if (!match) return;
		route.params = regExpResultToParams(match, parts.paramNames);
		return route;
	}).filter(function (match) {
		return match;
	});
};

/**
 * Find the first matched route for a URL
 * @param  {String} url   The URL
 * @param  {Array} routes The possible routes
 * @return {Object}       The matched route
 */
var match = function (url, routes) {
	return findMatchedRoutes(url, routes)[0];
};

/**
 * Get GET parameters from the URL
 * @todo  make work with params
 * @param  {String} url The URL
 * @return {Array}      The parameters
 */
var extractGETParameters = function (url) {
	return url.split(/\?(.*)?$/).slice(1).join('');
};

/**
 * Remove slashes from GET params
 * @param  {String} str The string
 * @return {Array}      The cleaned params
 */
var cleanGETParam = function (str) {
	return str.split(/\?(.*)?$/)[0];
};

/**
 * Get just the URL without any parameters
 * @param  {String} url      The URL
 * @param  {Boolean} useHash If true, use hash instead of real URLs
 * @param  {String} hash     The URL hash, if any
 * @return {String}          The URL without parameters
 */
var getOnlyURL = function (url, useHash, hash) {

	// Variables
	var onlyURL = url;
	var split;

	// If there's no hash, create one to preserve backclick
	if (typeof hash === 'undefined') {
		hash = '#';
	}

	// Clean the URL
	if (isPushStateAvailable() && !useHash) {
		onlyURL = cleanGETParam(url).split(hash)[0];
	} else {
		split = url.split(hash);
		onlyURL = split.length > 1 ? cleanGETParam(split[1]) : cleanGETParam(split[0]);
	}

	return onlyURL;

};


//
// Constructor

/**
 * Router constructor
 * @param {Object} options The data store options
 */
Reef.Router = function (options) {

	// Make sure routes are provided
	if (!options || !options.routes || Reef._.trueTypeOf(options.routes) !== 'array' || !options.routes.length) return Reef._.err('You did not provide any routes.');

	var _this = this;
	var _root = options.root ? options.root : '/';
	var _routes = options.routes;
	// var _push = isPushStateAvailable();
	var _push = false;

	// Create properties for stuff
	Object.defineProperties(_this, {
		routes: {value: Reef.clone(_routes)},
		root: {value: _root},
		usePushState: {value: _push}
	});

	document.addEventListener('click', function (event) {

		// Don't run if right-click or command/control + click or shift + click
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;

		// Check if link was clicked
		if (event.target.tagName.toLowerCase() !== 'a') return;

		// Prevent link from opening
		event.preventDefault();

		// Navigate to the URL
		_this.navigate(event.target.getAttribute('href').replace(/\/+$/, '').replace(/^\/+/, '/'));

	});

};

/**
 * Navigate to a specific path
 * @param  {String} path     [description]
 * @param  {Boolean} absolute [description]
 * @return {[type]}          [description]
 */
Reef.Router.prototype.navigate = function (path) {

	// Create a fallback for path
	path = path || '';

	// Get the matching route
	var route = match(path, this.routes);

	// Run an event before routing
	Reef.emit(window, 'beforeRoute', route);

	// If pushState is available, use it
	// Otherwise, fallback to a hashbang
	if (this.usePushState) {
		var to = (this.root + path.replace(/^\/+/, '/')).replace(/([^:])(\/{2,})/g, '$1/');
		history.pushState({}, '', to);
	} else if (typeof window !== 'undefined') {
		path = path.replace(new RegExp('^#!'), '');
		window.location.href = window.location.href.replace(/#$/, '').replace(new RegExp('#!.*$'), '') + '#!' + path;
	}

	// Run an event after routing
	Reef.emit(window, 'afterRoute', route);

};