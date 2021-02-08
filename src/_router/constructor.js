import * as _ from './utilities.js';
import * as $ from './dom.js';
import * as events from './events.js';


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
	if (!_.Reef || !_.Reef.err) {
		throw new Error('Reef not found. Use Reef.use(ReefRouter) to define your global Reef library.');
	}

	// Merge user options into defaults
	let _settings = Object.assign({}, defaults, options);

	// Properties
	let _this = this;
	let _routes = _settings.routes;
	let _hash = _settings.useHash || window.location.protocol === 'file:';
	let _current = _.getRoute(window.location, _routes, _settings.root, _hash);
	_this._hashing = false;

	// Create immutable property getters
	Object.defineProperties(_this, {

		// Read-only properties
		routes: {value: _.Reef.clone(_routes, true)},
		root: {value: _settings.root},
		title: {value: _settings.title},
		hash: {value: _hash},
		_components: {value: _settings.components},

		// Current route
		// Return immutable copy
		current: {
			get: function () {
				return _.Reef.clone(_current, true);
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
	$.updateTitle(_current, _this);

	// Listen for clicks and popstate events
	document.addEventListener('click', events.click(_this));
	if (_hash) {
		window.addEventListener('hashchange', events.hash(_this));
	} else {
		history.replaceState(_current, document.title, window.location.href);
		window.addEventListener('popstate', events.pop(_this));
	}

	// Emit initialized event
	_.Reef.emit(document, 'router:initialized', _this);

}

/**
 * Add routes to the router
 * @param {Array|Object} routes The route or routes to add
 */
ReefRouter.prototype.addRoutes = function (routes) {

	// Make sure the routes are an array or object
	let type = _.Reef.trueTypeOf(routes);
	if (!['array', 'object'].includes(type)) return _.Reef.err('Please provide a valid route or routes.');

	// Merge them into the routes
	let arr = type === 'array' ? routes : [routes];
	for (let route of arr) {
		this.routes.push(route);
	}

	// Emit routes added event
	_.Reef.emit(document, 'router:routes-added', {
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
	let type = _.Reef.trueTypeOf(routes);
	if (!['array', 'object'].includes(type)) return _.Reef.err('Please provide a valid route or routes.');

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
	_.Reef.emit(document, 'router:routes-removed', {
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
	let components = _.Reef.trueTypeOf(component) === 'array' ? component : [component];
	for (let comp of components) {
		this._components.push(comp);
	}

	// Emit event
	_.Reef.emit(document, 'router:components-added', {
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
	let components = _.Reef.trueTypeOf(component) === 'array' ? component : [component];
	for (let comp of components) {
		let index = this._components.indexOf(comp);
		if (index < 0) return;
		this._components.splice(index, 1);
	}

	// Emit event
	_.Reef.emit(document, 'router:components-removed', {
		router: this,
		components
	});

};

/**
 * Go to a path
 * @param  {String} url The URL to visit
 */
ReefRouter.prototype.visit = function (url) {
	$.updateRoute(_.getLinkElem(url, this.root), this);
};

// @deprecated Will be removed in v9
ReefRouter.prototype.navigate = ReefRouter.prototype.visit;

/**
 * Update the title
 */
ReefRouter.prototype.updateTitle = function () {
	$.updateTitle(this.current, this);
};

/**
 * Define the Reef instance and attach the Router to it
 * @param  {Constructor} reef The Reef instance
 */
ReefRouter.install = function (reef) {

	// Define the Reef object
	_.setReef(reef);

	// Emit ready event
	_.Reef.emit(document, 'router:ready');

};

// Auto-install when used as a global script
if (typeof window !== 'undefined' && window.Reef) {
	window.Reef.use(ReefRouter);
}


export default ReefRouter;