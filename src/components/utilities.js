/**
 * Emit a custom event
 * @param  {String} type   The event type
 * @param  {*}      detail Any details to pass along with the event
 * @param  {Node}   elem   The element to emit the event on
 */
function emit (type, detail, elem = document) {

	// Create a new event
	let event = new CustomEvent(`reef:${type}`, {
		bubbles: true,
		cancelable: true,
		detail: detail
	});

	// Dispatch the event
	return elem.dispatchEvent(event);

}

/**
 * Get the element from the UI
 * @param  {String|Node} elem The element or selector string
 * @return {Node}             The element
 */
function getElem (elem) {
	return typeof elem === 'string' ? document.querySelector(elem) : elem;
}

/**
 * Get an object's type
 * @param  {*}      obj The object
 * @return {String}     The type
 */
function getType (obj) {
	return Object.prototype.toString.call(obj).slice(8, -1).toLowerCase();
}

/**
 * Create an immutable clone of data
 * @param  {*} obj The data object to copy
 * @return {*}     The clone of the array or object
 */
function copy (obj) {

	/**
	 * Create an immutable copy of an object
	 * @return {Object}
	 */
	function cloneObj () {
		let clone = {};
		for (let key in obj) {
			if (Object.prototype.hasOwnProperty.call(obj, key)) {
				clone[key] = copy(obj[key]);
			}
		}
		return clone;
	}

	/**
	 * Create an immutable copy of an array
	 * @return {Array}
	 */
	function cloneArr () {
		return obj.map(function (item) {
			return copy(item);
		});
	}

	// Get object type
	let type = getType(obj);

	// Return a clone based on the object type
	if (type === 'object') return cloneObj();
	if (type === 'array') return cloneArr();
	return obj;

}


export {emit, getElem, getType, copy};