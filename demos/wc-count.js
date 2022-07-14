/**
 * A native web component for counting up
 */
class CountUp extends HTMLElement {

	/**
	 * The class constructor object
	 */
	constructor () {

		// Always call super first in constructor
		super();

		// Define count property
		this.count = 0;

		// Render HTML
		this.innerHTML =
			`<p>
				<button aria-live="polite">Activated ${this.count} times</button>
			</p>`;

	}

	/**
	 * Handle click events
	 * @param  {Event} event The event object
	 */
	clickHandler (event) {

		// Get the host component
		let host = event.target.closest('count-up');

		// Get the message element
		let target = host.querySelector('button');
		if (!target) return;

		// Increase count
		host.count++;
		target.textContent = `Activated ${host.count} times`;

	}

	/**
	 * Runs each time the element is appended to or moved in the DOM
	 */
	connectedCallback () {

		// Attach a click event listener to the button
		let btn = this.querySelector('button');
		if (!btn) return;
		btn.addEventListener('click', this.clickHandler);

	}

	/**
	 * Runs when the element is removed from the DOM
	 */
	disconnectedCallback () {

		// Remove the click event listener from the button
		let btn = this.querySelector('button');
		if (!btn) return;
		btn.removeEventListener('click', this.clickHandler);

	}

}

// Define the new web component
if ('customElements' in window) {
	customElements.define('count-up', CountUp);
}