import * as _ from './utilities.js';
import * as $ from './dom.js';
import * as events from './events.js';


/**
 * Router constructor
 * @param {Object} options The data store options
 */
function ReefRouter (options) {

	// Make sure there's a Reef instance
	if (!_.Reef || !_.Reef.err) {
		throw new Error('Reef not found. Use ReefRouter.install(Reef) to define your global Reef library.');
	}

	// Make sure routes are provided
	if (!options || !options.routes || _.Reef.trueTypeOf(options.routes) !== 'array' || !options.routes.length) return _.Reef.err('Please provide an array of routes.');

	// Properties
	let _this = this;
	let _routes = options.routes;
	let _root = options.root ? options.root : '';
	let _title = options.title ? options.title : '{{title}}';
	let _components = [];
	let _hash = options.useHash || window.location.protocol === 'file:';
	let _current = _.getRoute(window.location, _routes, _root, _hash);
	_this._hashing = false;

	// Create immutable property getters
	Object.defineProperties(_this, {

		// Read-only properties
		routes: {value: _.Reef.clone(_routes, true)},
		root: {value: _root},
		title: {value: _title},
		hash: {value: _hash},

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
		// @todo is this needed?
		_routes: {
			set: function (routes) {
				_routes = routes;
				return true;
			}
		},

		// Getter for _components
		// returns immutable copy
		_components: {
			get: function () {
				return _components;
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

}

/**
 * Add routes to the router
 * @param {Array|Object} routes The route or routes to add
 */
ReefRouter.prototype.addRoutes = function (routes) {

	// Make sure the routes are an array or object
	let type = _.Reef.trueTypeOf(routes);
	if (!['array', 'object'].includes(type)) return _.Reef.err('Please provide a valid route or routes.');

	// If it's an object, push it
	// Otherwise, merge them
	if (type === 'object') {
		this.routes.push(routes);
	} else {
		this.routes.push.apply(this.routes, routes);
	}

};

/**
 * Add a component to the router
 * @param {Reef} component A Reef component
 */
ReefRouter.prototype.addComponent = function (component) {
	this._components.push(component);
};

/**
 * Navigate to a path
 * @param  {String} url The URL to navigate to
 */
ReefRouter.prototype.navigate = function (url) {
	$.updateRoute(_.getLinkElem(url, this.root), this);
};

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
	_.setReef(reef);
};

// Auto-install when used as a global script
if (typeof window !== 'undefined' && window.Reef) {
	ReefRouter.install(window.Reef);
}


export default ReefRouter;