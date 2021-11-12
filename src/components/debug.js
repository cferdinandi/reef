let on = false;

function debug (val) {
	on = !!val;
}

function err (msg) {
	if (on) {
		console.warn('[Reef] ' + msg);
	}
}

export {debug, err};