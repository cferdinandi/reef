import {emit, getElem} from './utilities.js';


// Form fields and attributes that can be modified by users
// They also have implicit values that make it hard to know if they were changed by the user or developer
let formFields = ['input', 'option', 'textarea'];
let formAtts = ['value', 'checked', 'selected'];
let formAttsNoVal = ['checked', 'selected'];

/**
 * Convert a template string into HTML DOM nodes
 * @param  {String} str The template string
 * @return {Node}       The template HTML
 */
function stringToHTML (str) {

    // Create document
    let parser = new DOMParser();
    let doc = parser.parseFromString(str, 'text/html');

    // If there are items in the head, move them to the body
    if (doc.head && doc.head.childNodes.length) {
        Array.from(doc.head.childNodes).reverse().forEach(function (node) {
            doc.body.insertBefore(node, doc.body.firstChild);
        });
    }

    return doc.body || document.createElement('body');

}

/**
 * Check if an attribute string has a stringified falsy value
 * @param  {String}  str The string
 * @return {Boolean}     If true, value is falsy (yea, I know, that's a little confusing)
 */
function isFalsy (str) {
	return ['false', 'null', 'undefined', '0', '-0', 'NaN', '0n', '-0n'].includes(str);
}

/**
 * Check if attribute should be skipped (sanitize properties)
 * @param  {String}  name   The attribute name
 * @param  {String}  value  The attribute value
 * @param  {Boolean} events If true, inline events are allowed
 * @return {Boolean}        If true, skip the attribute
 */
function skipAttribute (name, value, events) {
	let val = value.replace(/\s+/g, '').toLowerCase();
	if (['src', 'href', 'xlink:href'].includes(name)) {
		if (val.includes('javascript:') || val.includes('data:text/html')) return true;
	}
	if (!events && name.startsWith('on')) return true;
}

/**
 * Add an attribute to an element
 * @param {Node}   elem The element
 * @param {String} att  The attribute
 * @param {String} val  The value
 * @param  {Boolean} events If true, inline events are allowed
 */
function addAttribute (elem, att, val, events) {

	// Sanitize dangerous attributes
	if (skipAttribute(att, val, events)) return;

	// If it's a form attribute, set the property directly
	if (formAtts.includes(att)) {
		elem[att] = att === 'value' ? val : ' ';
	}

	// Update the attribute
	elem.setAttribute(att, val);


}

/**
 * Remove an attribute from an element
 * @param {Node}   elem The element
 * @param {String} att  The attribute
 */
function removeAttribute (elem, att) {

	// If it's a form attribute, remove the property directly
	if (formAtts.includes(att)) {
		elem[att] = '';
	}

	// Remove the attribute
	elem.removeAttribute(att);

}

/**
 * Compare the existing node attributes to the template node attributes and make updates
 * @param  {Node}    template The new template
 * @param  {Node}    existing The existing DOM node
 * @param  {Boolean} events   If true, inline events allowed
 */
function diffAttributes (template, existing, events) {

	// If the node is not an element, bail
	if (template.nodeType !== 1) return;

	// Get attributes for the template and existing DOM
	let templateAtts = template.attributes;
	let existingAtts = existing.attributes;

	// Add and update attributes from the template into the DOM
	for (let {name, value} of templateAtts) {

		// Skip [#*] attributes
		if (name.startsWith('#')) continue;

		// Skip user-editable form field attributes
		if (formAtts.includes(name) && formFields.includes(template.tagName.toLowerCase())) continue;

		// Convert [@*] names to their real attribute name
		let attName = name.startsWith('@') ? name.slice(1) : name;

		// If its a no-value property and it's falsy remove it
		if (formAttsNoVal.includes(attName) && isFalsy(value)) {
			removeAttribute(existing, attName);
			continue;
		}

		// Otherwise, add the attribute
		addAttribute(existing, attName, value, events);

	}

	// Remove attributes from the DOM that shouldn't be there
	for (let {name, value} of existingAtts) {

		// If the attribute exists in the template, skip it
		if (templateAtts[name]) continue;

		// Skip user-editable form field attributes
		if (formAtts.includes(name) && formFields.includes(existing.tagName.toLowerCase())) continue;

		// Otherwise, remove it
		removeAttribute(existing, name);

	}

}

/**
 * Add default attributes to a newly created element
 * @param  {Node} elem The element
 */
function addDefaultAtts (elem, events) {

	// Only run on elements
	if (elem.nodeType !== 1) return;

	// Remove [@*] and [#*] attributes and replace them with the plain attributes
	// Remove unsafe HTML attributes
	for (let {name, value} of elem.attributes) {

		// If the attribute should be skipped, remove it
		if (skipAttribute(name, value, events)) {
			removeAttribute(elem, name);
			continue;
		}

		// If the attribute isn't a [@*] or [#*], skip it
		if (!name.startsWith('@') && !name.startsWith('#')) continue;

		// Get the plain attribute name
		let attName = name.slice(1);

		// Remove the [@*] or [#*] attribute
		removeAttribute(elem, name);

		// If it's a no-value attribute and its falsy, skip it
		if (formAttsNoVal.includes(attName) && isFalsy(value)) continue;

		// Add the plain attribute
		addAttribute(elem, attName, value, events);

	}

	// If there are child elems, recursively add defaults to them
	if (elem.childNodes) {
		for (let node of elem.childNodes) {
			addDefaultAtts(node, events);
		}
	}

}

/**
 * Get the content from a node
 * @param  {Node}   node The node
 * @return {String}      The content
 */
function getNodeContent (node) {
	return node.childNodes && node.childNodes.length ? null : node.textContent;
}

/**
 * Check if two nodes are different
 * @param  {Node}  node1 The first node
 * @param  {Node}  node2 The second node
 * @return {Boolean}     If true, they're not the same node
 */
function isDifferentNode (node1, node2) {
	return (
		(typeof node1.nodeType === 'number' && node1.nodeType !== node2.nodeType) ||
		(typeof node1.tagName === 'string' && node1.tagName !== node2.tagName) ||
		(typeof node1.id === 'string' && node1.id !== node2.id) ||
		(typeof node1.src === 'string' && node1.src !== node2.src)
	);
}

/**
 * Check if the desired node is further ahead in the DOM existingNodes
 * @param  {Node}     node           The node to look for
 * @param  {NodeList} existingNodes  The DOM existingNodes
 * @param  {Integer}  index          The indexing index
 * @return {Integer}                 How many nodes ahead the target node is
 */
function aheadInTree (node, existingNodes, index) {
	return Array.from(existingNodes).slice(index + 1).find(function (branch) {
		return !isDifferentNode(node, branch);
	});
}

/**
 * If there are extra elements in DOM, remove them
 * @param  {Array} existingNodes      The existing DOM
 * @param  {Array} templateNodes The template
 */
function trimExtraNodes (existingNodes, templateNodes) {
	let extra = existingNodes.length - templateNodes.length;
	if (extra < 1)  return;
	for (; extra > 0; extra--) {
		existingNodes[existingNodes.length - 1].remove();
	}
}

/**
 * Remove scripts from HTML
 * @param  {Node}    elem The element to remove scripts from
 */
function removeScripts (elem) {
	let scripts = elem.querySelectorAll('script');
	for (let script of scripts) {
		script.remove();
	}
}

/**
 * Diff the existing DOM node versus the template
 * @param  {Array}   template The template HTML
 * @param  {Node}    existing The current DOM HTML
 * @param  {Boolean} events   If true, inline events allowed
 */
function diff (template, existing, events) {

	// Get the nodes in the template and existing UI
	let templateNodes = template.childNodes;
	let existingNodes = existing.childNodes;

	// Don't inject scripts
	if (removeScripts(template)) return;

	// Loop through each node in the template and compare it to the matching element in the UI
	templateNodes.forEach(function (node, index) {

		// If element doesn't exist, create it
		if (!existingNodes[index]) {
			let clone = node.cloneNode(true);
			addDefaultAtts(clone, events);
			existing.append(clone);
			return;
		}

		// If there is, but it's not the same node type, insert the new node before the existing one
		if (isDifferentNode(node, existingNodes[index])) {

			// Check if node exists further in the tree
			let ahead = aheadInTree(node, existingNodes, index);

			// If not, insert the node before the current one
			if (!ahead) {
				let clone = node.cloneNode(true);
				addDefaultAtts(clone, events);
				existingNodes[index].before(clone);
				return;
			}

			// Otherwise, move it to the current spot
			existingNodes[index].before(ahead);

		}

		// If attributes are different, update them
		diffAttributes(node, existingNodes[index], events);

		// Stop diffing if a native web component
		if (node.nodeName.includes('-')) return;

		// If content is different, update it
		let templateContent = getNodeContent(node);
		if (templateContent && templateContent !== getNodeContent(existingNodes[index])) {
			existingNodes[index].textContent = templateContent;
		}

		// If there shouldn't be child nodes but there are, remove them
		if (!node.childNodes.length && existingNodes[index].childNodes.length) {
			existingNodes[index].innerHTML = '';
			return;
		}

		// If DOM is empty and shouldn't be, build it up
		// This uses a document fragment to minimize reflows
		if (!existingNodes[index].childNodes.length && node.childNodes.length) {
			let fragment = document.createDocumentFragment();
			diff(node, fragment, events);
			existingNodes[index].appendChild(fragment);
			return;
		}

		// If there are nodes within it, recursively diff those
		if (node.childNodes.length) {
			diff(node, existingNodes[index], events);
		}

	});

	// If extra elements in DOM, remove them
	trimExtraNodes(existingNodes, templateNodes);

}

/**
 * Render a template into the UI
 * @param  {Node|String} elem     The element or selector to render the template into
 * @param  {String}      template The template to render
 * @param  {Boolean}     events   If true, inline events allowed
 */
function render (elem, template, events) {
	let node = getElem(elem);
	let html = stringToHTML(template);
	diff(html, node, events);
	emit('render', null, node);
}

export default render;