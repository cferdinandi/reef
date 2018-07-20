# Reef.js

Reef if a simple, lightweight alternative to React, Vue, and other bloated frameworks.

<a class="btn" href="setup.html">Getting Started</a>

## Features

- Weighs under 2kb (minified and gzipped), with zero dependencies.
- Simple templating with JavaScript strings or template literals.
- Load it with a simple `<script>` tag&mdash;no command line or transpiling required.
- Updates only the parts of the DOM that have changed. Keep those form fields in focus!
- Work with native JavaScript method and browser APIs instead of flavor-of-the-month framework methods.

Ditch that bloated framework, and make web development fun and simple again!

## Why use Reef?

Reef is an anti-framework.

It does a lot less than the big guys like React and Vue. It doesn't have a Virtual DOM. It doesn't automagically update the UI when state changes. It doesn't provide a bunch of custom methods.

Reef does just one thing: render UI.

Couldn't you just use some template strings and `innerHTML`? Sure. But Reef sanitizes your data before rendering to minimize the risk of XSS scripting attacks. It also only updates things that have changed instead clobbering the DOM and removing focus from your form fields.

If you're craving a more simple, back-to-basics web development experience, Reef is for you.

(*And if not, that's cool too! Carry on.*)