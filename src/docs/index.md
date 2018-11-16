<div id="app"></div>

<script>
	var sourceOfTruth = new Reef(null, {
		data: {
			heading: 'Hello, world!',
			items: {
				todos: [
					'Buy milk',
					'Bake a birthday cake',
					'Go apple picking'
				],
				heading: 'Things'
			}
		},
		lagoon: true
	});

	var wrapper = new Reef('#app', {
		data: sourceOfTruth.data,
		template: function (props) {
			return '<h1 sandwich="tuna">' + (props.items.heading.length > 0 ? props.items.heading : 'Hello, world!') + '</h1><div id="content"></div>';
		},
		attachTo: [sourceOfTruth]
	});

	var app = new Reef('#content', {
		data: sourceOfTruth.data,
		template: function (props) {
			var html = '<h1>Todos</h1><ul sandwich="tuna">';
			props.items.todos.forEach(function (todo) {
				html += '<li>' + todo + '</li>';
			});
			html += '<input type="text" id="heading"><br>';
			html += '<strong>The title is:</strong> ' + (props.heading.length > 0 ? props.heading : 'Hello, world!');
			html += '</ul>';
			return html;
		},
		attachTo: [wrapper]
	});

	// app.attach(wrapper);
	wrapper.render();

	// Update state on input change
	document.addEventListener('input', function (event) {
		if (!event.target.matches('#heading')) return;
		sourceOfTruth.setData({heading: event.target.value});
	}, false);
</script>