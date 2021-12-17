//  Hold all events by type
let events = {};

/**
 * Handle listeners after event fires
 * @param {Event} event The event
 */
var eventHandler = function (event) {
	if (!events[event.type]) return;
	for (let listener of events[event.type]) {
		let {elem, callback} = listener;
		if (elem === event.target || elem.contains(event.target)) {
			callback.call(listener.instance, event);
		}
	}
};

/**
 * Start event listeners for an event type
 * @param {String} type The event type
 */
function startListener (type) {
	if (events[type]) return;
	events[type] = [];
	document.addEventListener(type, eventHandler, true);
}

/**
 * Stop event listeners for an event type
 * @param {String} type The event type
 */
function stopListener (type) {
	if (!events[type]) return;
	delete events[type];
	document.removeEventListener(type, eventHandler, true);
}

/**
 * Check if listener is already active
 * @param  {String}   type     The event type
 * @param  {Node}     elem     The elem to listen to
 * @param  {Function} callback The callback function to run
 * @return {Boolean}           If true, listener already exists
 */
function getListener (type, elem, callback) {
	return events[type].find(function (listener) {
		return elem === listener.elem && callback === listener.callback;
	});
}

/**
 * Add an event listener
 * @param {Node}        elem     The element to attach the listener to
 * @param {String}      name     The event attribute name
 * @param {String}      value    The event attribute value
 * @param {Constructor} instance The Reef instance the element is in
 */
function addEvent (elem, name, value, instance) {

	// If there are no listeners, do nothing
	if (!instance._listeners) return;

	// Get event details
	let type = name.slice(2);
	let callback = instance._listeners[value.slice(0, -2)];

	// Make sure event is for a valid listener
	if (!callback) return;

	// Start listener for this type if not already running
	startListener(type);

	// If element already has a listener, do nothing
	if (getListener(type, elem, callback)) return;

	// Otherwise, add listener
	events[type].push({elem, callback, instance});

}

/**
 * Remove all events attached to an element
 * @param  {NodeList}    elems    The elements to remove events from
 * @param  {Constructor} instance The Reef instance the elements are in
 */
function removeAllEvents (elems, instance) {
	if (!instance._listeners) return;
	for (let elem of elems) {
		for (let type in events) {
			events[type] = events[type].filter(function (listener) {
				return listener.elem !== elem;
			});
			if (!events[type].length) {
				stopListener(type);
			}
		}
	}
}

export {addEvent, removeAllEvents};