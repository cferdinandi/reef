import * as _ from './utilities.js';
import * as $ from './dom.js';


/**
 * Create the Reef object
 * @param {String|Node} elem    The element to make into a component
 * @param {Object}      options The component options
 */
var Reef = function (elem, options) {

	// Make sure an element is provided
	if (!elem && (!options || !options.lagoon)) return _.err('You did not provide an element to make into a component.');

	// Make sure a template is provided
	if (!options || (!options.template && !options.lagoon)) return _.err('You did not provide a template for this component.');

	// Set the component properties
	var _this = this;
	var _data = _.makeProxy(options, _this);
	var _store = options.store;
	var _router = options.router;
	var _setters = options.setters;
	var _getters = options.getters;
	_this.debounce = null;

	// Create properties for stuff
	Object.defineProperties(_this, {
		elem: {value: elem},
		template: {value: options.template},
		allowHTML: {value: options.allowHTML},
		lagoon: {value: options.lagoon},
		store: {value: _store},
		attached: {value: []},
		router: {value: _router}
	});

	// Define setter and getter for data
	Object.defineProperty(_this, 'data', {
		get: function () {
			return _setters ? _.clone(_data, true) : _data;
		},
		set: function (data) {
			if (_store || _setters) return true;
			_data = new Proxy(data, _.dataHandler(_this));
			_.debounceRender(_this);
			return true;
		}
	});

	if (_setters && !_store) {
		Object.defineProperty(_this, 'do', {
			value: function (id) {
				if (!_setters[id]) return _.err('There is no setter with this name.');
				var args = _.arrayFrom(arguments);
				args[0] = _data;
				_setters[id].apply(_this, args);
				_.debounceRender(_this);
			}
		});
	}

	if (_getters && !_store) {
		Object.defineProperty(_this, 'get', {
			value: function (id) {
				if (!_getters[id]) return _.err('There is no getter with this name.');
				return _getters[id](_data);
			}
		});
	}

	// Attach to router
	if (_router && 'addComponent' in _router) {
		_router.addComponent(_this);
	}

	// Attach to store
	if (_store && 'attach' in _store) {
		_store.attach(_this);
	}

	// Attach linked components
	if (options.attachTo) {
		var _attachTo = _.trueTypeOf(options.attachTo) === 'array' ? options.attachTo : [options.attachTo];
		_attachTo.forEach(function (coral) {
			if ('attach' in coral) {
				coral.attach(_this);
			}
		});
	}

};

/**
 * Store constructor
 * @param {Object} options The data store options
 */
Reef.Store = function (options) {
	options.lagoon = true;
	return new Reef(null, options);
};

/**
 * Emit a custom event
 * @param  {Node}   elem   The element to emit the custom event on
 * @param  {String} name   The name of the custom event
 * @param  {*}      detail Details to attach to the event
 */
Reef.emit = function (elem, name, detail) {
	var event;
	if (!elem || !name) return _.err('You did not provide an element or event name.');
	event = new CustomEvent(name, {
		bubbles: true,
		detail: detail
	});
	elem.dispatchEvent(event);
};

/**
 * Render a template into the DOM
 * @return {Node}  The elemenft
 */
Reef.prototype.render = function () {

	// If this is used only for data, render attached and bail
	if (this.lagoon) {
		$.renderPolyps(this.attached, this);
		return;
	}

	// Make sure there's a template
	if (!this.template) return _.err('No template was provided.');

	// If elem is an element, use it.
	// If it's a selector, get it.
	var elem = _.trueTypeOf(this.elem) === 'string' ? document.querySelector(this.elem) : this.elem;
	if (!elem) return _.err('The DOM element to render your template into was not found.');

	// Get the data (if there is any)
	var data = _.clone((this.store ? this.store.data : this.data) || {}, this.allowHTML);

	// Get the template
	var template = (_.trueTypeOf(this.template) === 'function' ? this.template(data, this.router ? this.router.current : elem, elem) : this.template);
	if (['string', 'number'].indexOf(_.trueTypeOf(template)) < 0) return;

	// Diff and update the DOM
	var polyps = this.attached.map(function (polyp) { return polyp.elem; });
	$.diff(_.stringToHTML(template), elem, polyps);

	// Dispatch a render event
	Reef.emit(elem, 'render', data);

	// If there are linked Reefs, render them, too
	$.renderPolyps(this.attached, this);

	// Return the elem for use elsewhere
	return elem;

};

/**
 * Attach a component to this one
 * @param  {Function|Array} coral The component(s) to attach
 */
Reef.prototype.attach = function (coral) {
	if (_.trueTypeOf(coral) === 'array') {
		this.attached = this.attached.concat(coral);
	} else {
		this.attached.push(coral);
	}
};

/**
 * Detach a linked component to this one
 * @param  {Function|Array} coral The linked component(s) to detach
 */
Reef.prototype.detach = function (coral) {
	var polyps = _.trueTypeOf(coral) === 'array' ? coral : [coral];
	var instance = this;
	polyps.forEach(function (polyp) {
		var index = instance.attached.indexOf(polyp);
		if (index < 0) return;
		instance.attached.splice(index, 1);
	});
};

// External helper methods
Reef.debug = _.setDebug;
Reef.clone = _.clone;

// Internal helper methods
Reef._ = {
	trueTypeOf: _.trueTypeOf,
	err: _.err
};


export default Reef;