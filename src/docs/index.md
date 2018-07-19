<h2>Clock</h2>

<div id="clock"></div>

<script class="code-sample">
// Markup:
// &lt;div id="clock"&gt;&lt;/div&gt;

// Create the clock component
var clock = new Reef('#clock', {
	data: {
		time: new Date().toLocaleTimeString()
	},
	template: function (props) {
		return '<strong>The time is:</strong> <span> ' + props.time + '</span>';
	}
});

// Render the clock
clock.render();

// Update the clock once a second
window.setInterval(function () {
	clock.data.time = new Date().toLocaleTimeString();
	clock.render();
}, 1000);
</script>