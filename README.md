# Reef [![Build Status](https://travis-ci.org/cferdinandi/reef.svg)](https://travis-ci.org/cferdinandi/reef)
A vanilla JS helper for creating state-based components and UI.

*Coming soon...*

<hr>

### Want to learn how to write your own vanilla JS plugins? Check out my [Vanilla JS Pocket Guides](https://vanillajsguides.com/) or join the [Vanilla JS Academy](https://vanillajsacademy.com) and level-up as a web developer. 🚀

<hr>



## Getting Started

Compiled and production-ready code can be found in the `dist` directory. The `src` directory contains development code.

### 1. Include Reef on your site.

There are two versions of Reef: the standalone version, and one that comes preloaded with polyfills for `Array.find()`, `Array.from()`, and `Element.remove()`, which are only supported in newer browsers.

If you're including your own polyfills or don't want to enable this feature for older browsers, use the standalone version. Otherwise, use the version with polyfills.

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

**[Try it Out!](http://jsfiddle.net/cferdinandi/1r0wyhfg/1/)**

## Updating your state/data

You can update your component's state by directly accessing the `data` property of the component. After updating your state, run the `.render()` method again to update the DOM.

```js
app.data.greeting = 'Hi there';
app.data.name = 'universe';
app.render();
```

**[Try updating the state.](http://jsfiddle.net/cferdinandi/cxbLru32/)**

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

## ES6 Modules

Reef does not have a default export, but does support CommonJS and can be used with native ES6 module imports.

```js
import('/path/to/reef.polyfills.min.js')
	.then(function () {
		var app = new Reef('a[href*="#"]', {});
	});
```

It uses a UMD pattern, and should also work in most major module bundlers and package managers.

## Working with the Source Files

If you would prefer, you can work with the development code in the `src` directory using the included [Gulp build system](http://gulpjs.com/). This compiles, lints, and minifies code.

### Dependencies
Make sure these are installed first.

* [Node.js](http://nodejs.org)
* [Gulp](http://gulpjs.com) `sudo npm install -g gulp`

### Quick Start

1. In bash/terminal/command line, `cd` into your project directory.
2. Run `npm install` to install required files.
3. When it's done installing, run one of the task runners to get going:
	* `gulp` manually compiles files.
	* `gulp watch` automatically compiles files when changes are made and applies changes using [LiveReload](http://livereload.com/).

## Browser Compatibility

Smooth Scroll works in all modern browsers, and IE 9 and above.

Smooth Scroll is built with modern JavaScript APIs, and uses progressive enhancement. If the JavaScript file fails to load, or if your site is viewed on older and less capable browsers, anchor links will jump the way they normally would.

### Polyfills

Support back to IE9 requires polyfills for `closest()`, `requestAnimationFrame()`, and `CustomEvent()`. Without them, support starts with Edge.

Use the included polyfills version of Smooth Scroll, or include your own.



## Known Issues

### `<body>` styling

If the `<body>` element has been assigned a height of `100%` or `overflow: hidden`, Smooth Scroll is unable to properly calculate page distances and will not scroll to the right location. The `<body>` element can have a fixed, non-percentage based height (ex. `500px`), or a height of `auto`, and an `overflow` of `visible`.

### Animating from the bottom

Animated scrolling links at the very bottom of the page (example: a "scroll to top" link) will stop animated almost immediately after they start when using certain easing patterns. This is an issue that's been around for a while and I've yet to find a good fix for it. I've found that `easeOut*` easing patterns work as expected, but other patterns can cause issues. [See this discussion for more details.](https://github.com/cferdinandi/smooth-scroll/issues/49)

### Scrolling to an anchor link on another page

This, unfortunately, cannot be done well.

Most browsers instantly jump you to the anchor location when you load a page. You could use `scrollTo(0, 0)` to pull users back up to the top, and then manually use the `animateScroll()` method, but in my experience, it results in a visible jump on the page that's a worse experience than the default browser behavior.



## License

The code is available under the [MIT License](LICENSE.md).