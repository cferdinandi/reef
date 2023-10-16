// Hold the selector for the element to focus on
let focusOn;

/**
 * Set focus on the element
 * 1ms delay prevents odd bugs from browser-native focus shifts
 */
function setFocus () {
	setTimeout(function () {

		// Find target element in the DOM
		let elem = document.querySelector(focusOn);
		focusOn = null;
		if (!elem) return;

		// Try to focus element
		elem.focus();
		if (document.activeElement === elem) return;

		// If element could not be focused, set a tabindex and try again
		elem.setAttribute('tabindex', -1);
		elem.focus();

	}, 1);
}

/**
 * Shift focus to trigger a screen reader announcement after content is loaded
 */
function focus (selector) {
	if (!selector || typeof selector !== 'string') return;
	focusOn = selector;
	document.addEventListener('reef:render', setFocus, {once: true});
}


export default focus;