# Reef [![Build Status](https://travis-ci.org/cferdinandi/reef.svg)](https://travis-ci.org/cferdinandi/reef)
A lightweight library for creating reactive, state-based components and UI. Reef is a simpler alternative to React, Vue, and other large frameworks.

[Getting Started](#getting-started) | [State Management](#state-management) | [Advanced Components](#advanced-components) | [Demos](#demos) | [What's New?](#whats-new) | [Browser Compatibility](#browser-compatibility) | [License](#license)

**Features:**

- Weighs just 2.5kb (minified and gzipped) with zero dependencies.
- Simple templating with JavaScript strings or template literals.
- Load it with a `<script>` element&mdash;no command line or transpiling required.
- Updates only the parts of the DOM that have changed. Keep those form fields in focus!
- Automatically encodes markup in your data to protect you from cross-site scripting (XSS) attacks.
- Work with native JavaScript methods and browser APIs instead of custom methods and pseudo-languages.
- Supported all the way back to IE9.

Ditch that bloated framework, and make web development fun and simple again!

<hr>

### Want to learn how to write your own vanilla JS plugins? Check out my [Vanilla JS Pocket Guides](https://vanillajsguides.com/) or join the [Vanilla JS Academy](https://vanillajsacademy.com) and level-up as a web developer. 🚀

<hr>


## Why use Reef?

Reef is an anti-framework.

It does a lot less than the big guys like React and Vue. It doesn't have a Virtual DOM. It doesn't require you to learn a custom templating syntax. It doesn't provide a bunch of custom methods.

**Reef does just one thing: render UI.**

Couldn't you just use some template strings and `innerHTML`? Sure. But Reef only updates things that have changed instead clobbering the DOM and removing focus from your form fields. It also automatically renders a new UI when your data updates, and helps protect you from XSS attacks.

If you're craving a simpler, back-to-basics web development experience, Reef is for you.

(*And if not, that's cool too! Carry on.*)



## Getting Started

### 1. Include Reef on your site.

**Direct Download**

You can [download the files directly from GitHub](https://github.com/cferdinandi/reef/archive/master.zip).

Compiled and production-ready code can be found in the `dist` directory. The `src` directory contains development code.

```html
<script src="path/to/reef.min.js"></script>
```

**CDN**

You can also use the [jsDelivr CDN](https://www.jsdelivr.com/package/gh/cferdinandi/reef?path=dist). I recommend linking to a specific version number or version range to prevent major updates from breaking your site. Reef uses semantic versioning.

```html
<!-- Always get the latest version -->
<!-- Not recommended for production sites! -->
<script src="https://cdn.jsdelivr.net/gh/cferdinandi/reef/dist/reef.min.js"></script>

<!-- Get minor updates and patch fixes within a major version -->
<script src="https://cdn.jsdelivr.net/gh/cferdinandi/reef@4/dist/reef.min.js"></script>

<!-- Get patch fixes within a minor version -->
<script src="https://cdn.jsdelivr.net/gh/cferdinandi/reef@4.0/dist/reef.min.js"></script>

<!-- Get a specific version -->
<script src="https://cdn.jsdelivr.net/gh/cferdinandi/reef@4.0.0/dist/reef.min.js"></script>
```

**NPM**

You can also use NPM (or your favorite package manager).

```bash
npm install reefjs
```

### 2. Add an element to render your component/UI into.

This is typically an empty `div` with a targetable selector.

```html
<div id="app"></div>
```

### 3. Create your component

Create a new `Reef()` instance, passing in two arguments: your selector, and your options.

#### Provide a selector

The first argument is the selector for the element you want to render the UI into. Alternatively, you can pass in the element itself.

```js
// This works
var app = new Reef('#app');

// This does too
var elem = document.querySelector('#app');
var app = new Reef(elem);
```

#### Provide a Template

The second argument is an object of options. It requires a template property, as either a string or a function that returns a string, to render into the DOM.

You can use old-school strings, or if you'd prefer, ES6 template literals.

```js
// Your template can be a string
var app = new Reef('#app', {
	template: '<h1>Hello, world!</h1>'
});

// It can also be a function that returns a string
var app = new Reef('#app', {
	template: function () {
		return '<h1>Hello, world!</h1>';
	}
});
```

#### [Optional] Add State/Data

As an optional property of the options argument, you can include state for your component with the `data` property.

The state data is automatically passed into your template function, so that you can use it to customize your template. Reef also encodes any markup in your data before passing it into your template to reduce your risk of cross-site scripting (XSS) attacks.

```js
// Some data
var app = new Reef('#app', {
	data: {
		greeting: 'Hello',
		name: 'world'
	},
	template: function (props) {
		return '<h1>' + props.greeting + ', ' + props.name + '!</h1>';
	}
});
```

### 4. Render your component

You can render your component by calling the `.render()` method on it.

```js
app.render();
```

**[Try the demo on CodePen &rarr;](https://codepen.io/cferdinandi/pen/qeJZro)**



## State Management

Reef provides two different ways to manage your state: reactive and manual.

### Data Reactivity

Data reactivity means that the UI "reacts" to changes in your data. Update your data, and the UI automatically renders any required updates based on the new state.

You can get an immutable clone of your current state using the `getData()` method. This lets you make any updates or changes you want without affecting the actual state of your component.

```js
var data = app.getData();
data.greeting = 'Hi there';
```

When you're ready to update your state, use the `setData()` method to update the state *and* cause the UI to render (if anything has changed).

The `setData()` method accepts an object with your changed state as an argument. You don't need to pass in the whole state again---only what's changed.

```js
// Pass in an entirely new state
app.setData({
	greeting: 'Hi there',
	name: 'universe'
});

// Or update just one key
app.setData({greeting: 'Hi there'});
```

**[Try data reactivity on CodePen &rarr;](https://codepen.io/cferdinandi/pen/RXeapE)**

### Manual State

Sometimes, you want more manual control over when your UI renders again.

You can update your component's state by directly accessing the `data` property of the component. After updating your state, run the `.render()` method again to update the DOM.

```js
app.data.greeting = 'Hi there';
app.data.name = 'universe';
app.render();
```

**[Try manual state management on CodePen &rarr;](https://codepen.io/cferdinandi/pen/GVYZWe)**



## Advanced Components

### HTML in your data

Reef automatically encodes any markup in your data before passing it into your template to reduce your risk of cross-site scripting (XSS) attacks.

You can disable this feature by setting the `allowHTML` option to `true`.

*__Important!__ Do NOT do this with third-party or user-provided data. This exposes you to the risk of cross-site scripting (XSS) attacks.*

```js
var app = new Reef('#app', {
	data: {
		greeting: '<strong>Hello</strong>',
		name: 'world'
	},
	template: function (props) {
		return '<h1>' + props.greeting + ', ' + props.name + '!</h1>';
	},
	allowHTML: true // Do NOT use with third-party/user-supplied data
});
```

**[Try allowing HTML in your data on CodePen &rarr;](https://codepen.io/cferdinandi/pen/LwgNyr)**


### Nested Components

If you're managing a bigger app, you may have components inside components.

Reef provides you with a way to attach nested components to their parent components. When the parent component is updated, it will automatically update the UI of its nested components if needed.

Associate a nested component with its parent using the `attachTo` key in your options. This accepts an array of components to attach your nested component to. You only need to render the parent component. It's nested components will render automatically.

You can access a parent component's state from a nested component by assigning the parent component `data` property to the `data` key in your nested component's options.

```js
// Parent component
var app = new Reef('#app', {
	data: {
		greeting: 'Hello, world!',
		todos: [
			'Buy milk',
			'Bake a birthday cake',
			'Go apple picking'
		]
	},
	template: function (props) {
		var html =
			'<h1>' + props.greeting + '</h1>' +
			'<div id="todos"></div>';
		return html;
	}
});

// Nested component
var todos = new Reef('#todos', {
	data: app.data,
	template: function (props) {
		var html = '<h2>Todo List</h2><ul>';
		props.todos.forEach(function (todo) {
			html += '<li>' + todo + '</li>';
		});
		html += '</ul>';
		return html;
	},
	attachTo: [app]
});

app.render();
```

**[Try nested components on CodePen &rarr;](https://codepen.io/cferdinandi/pen/BXqKWX)**

### Attaching and Detaching Nested Components

You can attach or detach nested components at any time using the `attach()` and `detach()` methods. Both methods accept both individual components or arrays of components as arguments.

```js
// Attach components
app.attach(todos);
app.attach([todos]);

// Detach components
app.detach(todos);
app.detach([todos]);
```

**[Try attaching nested components on CodePen &rarr;](https://codepen.io/cferdinandi/pen/KOGzmz)**

### Shared State

There are two ways to handle shared state with Reef when your components (in addition to the [nested component/parent component relationship](#nested-components) documented above).

#### Source of Truth Object

You can associate a named data object with multiple components.

The biggest downside to this approach is that it's non-reactive. You need to [manually run the `render()` method](#manual-state) on any component that needs to be updated when you update the state.

```js
var sourceOfTruth = {
	greeting: 'Hello, world!',
	todos: [
		'Buy milk',
		'Bake a birthday cake',
		'Go apple picking'
	]
};

// Parent component
var app = new Reef('#app', {
	data: sourceOfTruth,
	template: function (props) {
		var html =
			'<h1>' + props.greeting + '</h1>' +
			'<div id="todos"></div>';
		return html;
	}
});

// Nested component
var todos = new Reef('#todos', {
	data: sourceOfTruth,
	template: function (props) {
		var html = '<h2>Todo List</h2><ul>';
		props.todos.forEach(function (todo) {
			html += '<li>' + todo + '</li>';
		});
		html += '</ul>';
		return html;
	},
	attachTo: [app]
});

// Initial render
app.render();

// Update the state
sourceOfTruth.greeting = 'Hi, universe';

// Re-render the DOM
app.render();
```

**[Try working with a single source of truth on CodePen &rarr;](https://codepen.io/cferdinandi/pen/pMxyPb)**

#### Create a Lagoon

A *lagoon* is a Reef instance that's only purpose is to store shared data.

It doesn't render any UI in the DOM, but allows you to reactively update state using the `setData()` method. You can automatically trigger renders in other components by attaching them to your lagoon.

Create a lagoon by setting the `lagoon` option to `true` when creating your Reef instance.

```js
var sourceOfTruth = new Reef(null, {
	data: {
		greeting: 'Hello, world!',
		todos: [
			'Buy milk',
			'Bake a birthday cake',
			'Go apple picking'
		]
	},
	lagoon: true
});

// Parent component
var app = new Reef('#app', {
	data: sourceOfTruth.data,
	template: function (props) {
		var html =
			'<h1>' + props.greeting + '</h1>' +
			'<div id="todos"></div>';
		return html;
	},
	attachTo: [sourceOfTruth]
});

// Nested component
var todos = new Reef('#todos', {
	data: sourceOfTruth.data,
	template: function (props) {
		var html = '<h2>Todo List</h2><ul>';
		props.todos.forEach(function (todo) {
			html += '<li>' + todo + '</li>';
		});
		html += '</ul>';
		return html;
	},
	attachTo: [sourceOfTruth, app]
});

// Initial render
app.render();

// Reactively update state
sourceOfTruth.setData({greeting: 'Hi, universe'});
```

**[Try creating a lagoon on CodePen &rarr;](https://codepen.io/cferdinandi/pen/MNPymb)**

### Custom Events

Whenever Reef updates the DOM, it emits a custom `render` event that you can listen for with `addEventListener()`.

The `render` event is emitted on the element that was update, and bubbles, so you can [use event delegation](https://gomakethings.com/checking-event-target-selectors-with-event-bubbling-in-vanilla-javascript/) if you'd prefer.

```js
document.addEventListener('render', function (event) {
	if (event.target.matches('#app')) {
		// Do something...
	}
}, false);
```

**[Try the `render` event on CodePen &rarr;](https://codepen.io/cferdinandi/pen/XvxdRa)**

### Debugging

By default, Reef fails silently. You can put Reef into debugging mode to expose helpful error message in the Console tab of your browser's Developer Tools.

Turn debugging mode on or off with the `Reef.debug()` method. Pass in `true` to turn it on, and `false` to turn it off.

```js
// Turns debugging mode on
Reef.debug(true);

// Turns debugging mode off
Reef.debug(false);
```



## Demos

- [Clock](https://codepen.io/cferdinandi/pen/xvygVm)
- [Mirror Typing](https://codepen.io/cferdinandi/pen/qeJRZv)
- [Pomodoro Timer](https://codepen.io/cferdinandi/pen/dxgNMB)
- [Stopwatch](https://codepen.io/cferdinandi/pen/pGRzWM)
- [Todo List](https://codepen.io/cferdinandi/pen/GVYrqp)
- [Whack-a-Mole Game](https://codepen.io/cferdinandi/pen/wvvMKwB)



## What's new?

**Version 4.0 adds better performance and XSS protection:**

- Data is once again automatically encoded to help protect you from cross-site scripting (XSS) attacks.
- Changes to diffing and rendering reduce reflows and improve performance.
- Support pushed back even further to IE9.
- *Deprecated:* Custom sanitizer methods were removed in favor of built-in, automated HTML encoding. You can still add custom sanitization within template functions.

**Version 3.0 removes built-in sanitization:**

- Automatic sanitization has been removed. *HTML templates are unsanitized by default.*
- Two new hooks to add sanitization to your components have been added. This provides more developer flexibility and keeps Reef as lightweight as possible.

**Version 2.0 adds a better sanitizing engine and markup support:**

- [DOMPurify](https://github.com/cure53/DOMPurify) is now the template sanitizing engine.
- The *attribute exceptions* feature has been removed in favor of DOMPurify's configuration options. The `addAttributes()` and `removeAttributes()` methods no longer exist.
- Reef now offers a smaller *unsafe* version for UIs that don't use any third-party or user-provided content. It does *not* sanitize templates before rendering, so use with caution.
- SVGs are now properly supported and will render correctly.

**Version 1.0 removed polyfill dependencies:**

- All polyfills have been removed and are no longer needed. This is a breaking change, as the `.polyfill` versions of scripts no longer exist.

**Version 0.2 introduced some big new features:**

- Data reactivity and automatically updating UI
- Support for nested components
- Shared state support (with data reactivity!)
- Custom attribute exceptions for your templates



## Browser Compatibility

Reef works in all modern browsers, and IE 9 and above.



## License

The code is available under the [MIT License](LICENSE.md).