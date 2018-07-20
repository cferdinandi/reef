# Reef [![Build Status](https://travis-ci.org/cferdinandi/reef.svg)](https://travis-ci.org/cferdinandi/reef)
A simple, lightweight alternative to React, Vue, and other bloated frameworks.

[Getting Started](#getting-started) | [Demos](#demos) | [Browser Compatibility](#browser-compatibility) | [License](https://github.com/cferdinandi/reef/blob/master/LICENSE.md)

**Features:**

- Weighs under 2kb (minified and gzipped), with zero dependencies.
- Simple templating with JavaScript strings or template literals.
- Load it with a simple `<script>` tag&mdash;no command line or transpiling required.
- Updates only the parts of the DOM that have changed. Keep those form fields in focus!
- Work with native JavaScript method and browser APIs instead of flavor-of-the-month framework methods.

Ditch that bloated framework, and make web development fun and simple again!

<hr>

### Want to learn how to write your own vanilla JS plugins? Check out my [Vanilla JS Pocket Guides](https://vanillajsguides.com/) or join the [Vanilla JS Academy](https://vanillajsacademy.com) and level-up as a web developer. 🚀

<hr>

## Why use Reef?

Reef is an anti-framework.

It does a lot less than the big guys like React and Vue. It doesn't have a Virtual DOM. It doesn't automagically update the UI when state changes. It doesn't provide a bunch of custom methods.

Reef does just one thing: render UI.

Couldn't you just use some template strings and `innerHTML`? Sure. But Reef sanitizes your data before rendering to minimize the risk of XSS scripting attacks. It also only updates things that have changed instead clobbering the DOM and removing focus from your form fields.

If you're craving a more simple, back-to-basics web development experience, Reef is for you.

(*And if not, that's cool too! Carry on.*)



## Getting Started

Compiled and production-ready code can be found in the `dist` directory. The `src` directory contains development code.

### 1. Include Reef on your site.

There are two versions of Reef: the standalone version, and one that comes preloaded with polyfills for `Array.find()`, `Array.from()`, and `Element.remove()`, which are only supported in newer browsers.

If you're including your own polyfills or don't want to support older browsers (you monster!), use the standalone version. Otherwise, use the version with polyfills.

**Direct Download**

You can [download the files directly from GitHub](https://github.com/cferdinandi/reef/archive/master.zip).

```html
<script src="path/to/reef.polyfills.min.js"></script>
```

**CDN**

You can also use the [jsDelivr CDN](https://cdn.jsdelivr.net/gh/cferdinandi/reef/dist/). I recommend linking to a specific version number or version range to prevent major updates from breaking your site. Reef uses semantic versioning.

```html
<!-- Always get the latest version -->
<!-- Not recommended for production sites! -->
<script src="https://cdn.jsdelivr.net/gh/cferdinandi/reef/dist/reef.polyfills.min.js"></script>

<!-- Get minor updates and patch fixes within a major version -->
<script src="https://cdn.jsdelivr.net/gh/cferdinandi/reef@1/dist/reef.polyfills.min.js"></script>

<!-- Get patch fixes within a minor version -->
<script src="https://cdn.jsdelivr.net/gh/cferdinandi/reef@1.0/dist/reef.polyfills.min.js"></script>

<!-- Get a specific version -->
<script src="https://cdn.jsdelivr.net/gh/cferdinandi/reef@1.0.0/dist/reef.polyfills.min.js"></script>
```

### 2. Add an element to render your component/UI into.

This is typically an empty `div` with a targetable selector.

```html
<div id="app"></div>
```

### 3. Create your component

Create a new `Reef()` instance, passing in two arguments.



The first is the selector for the element you want to render the UI into. Alternatively, you pass in the element itself.

```js
// This works
var app = new Reef('#app');

// This does too
var elem = document.querySelector('#app');
var app = new Reef(elem);
```

#### Provide a Template

The second argument is an object of options. It requires a template property, as either a string or a function that returns a string, to render into the DOM.

```js
// Your template can be a string
var app = new Reef('#app', {
    template: '<h1>Hello, world!</h1>'
});

// It can also be a function that returns a string
var app = new Reef('#app', {
    template: function () {
        return '<h1>Hello, world!</h1>'
    }
});
```

*__Note:__ You can use old-school strings, or if you'd prefer, ES6 template literals.*

#### [Optional] Add State/Data

As an optional property of the options argument, you can include state for the component with the `data` property.

The state data is automatically passed into your template function, so that you can use it to customize your template.

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

**[Try it Out!](http://jsfiddle.net/cferdinandi/1r0wyhfg/6/)**



## Updating your state/data

You can update your component's state by directly accessing the `data` property of the component. After updating your state, run the `.render()` method again to update the DOM.

```js
app.data.greeting = 'Hi there';
app.data.name = 'universe';
app.render();
```

**[Try updating the state.](http://jsfiddle.net/cferdinandi/cxbLru32/4/)**



## Custom Events

Whenever Reef updates the DOM, it emits a custom `render` event that you can listen for with `addEventListener()`.

The `render` event is emitted on the element that was update, and bubbles, so you can [use event delegation](https://gomakethings.com/checking-event-target-selectors-with-event-bubbling-in-vanilla-javascript/) if you'd prefer.

```js
document.addEventListener('render', function (event) {
    if (event.target.matches('#app')) {
        // Do something...
    }
}, false);
```

**[Explore the `render` event.](http://jsfiddle.net/cferdinandi/cx8fe42g/5/)**


## Demos

- [Clock](http://jsfiddle.net/cferdinandi/7o5zydvL/4/)
- [Mirror Typing](http://jsfiddle.net/cferdinandi/c1v6fq4a/9/)
- [Pomodoro Timer](http://jsfiddle.net/cferdinandi/xnf83tmw/2/)
- [Todo List](http://jsfiddle.net/cferdinandi/cm0qLyzu/2/)



## ES6 Modules

Reef does not have a default export, but does support CommonJS and can be used with native ES6 module imports.

```js
import('/path/to/reef.polyfills.min.js')
	.then(function () {
		var app = new Reef('a[href*="#"]', {});
	});
```

It uses a UMD pattern, and should also work in most major module bundlers and package managers.



## Browser Compatibility

Reef works in all modern browsers, and IE 9 and above.

### Polyfills

Support back to IE9 requires polyfills for `Array.find()`, `Array.from()`, and `Element.remove()`. Without them, support starts with Edge.

Use the included polyfills version of Reef, or include your own.



## License

The code is available under the [MIT License](LICENSE.md).