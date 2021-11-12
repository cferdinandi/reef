// Is debugging enabled
let on = false;

/**
 * Turn debugging on or off
 * @param  {Boolean} val If true, enables debugging
 */
function debug (val) {
	on = !!val;
}

/**
 * Show an error message in the console if debugging is enabled
 * @param  {String} msg The message to log
 */
function err (msg) {
	if (on) {
		console.warn('[Reef] ' + msg);
	}
}

export {debug, err};