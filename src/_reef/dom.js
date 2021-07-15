import * as _ from './utilities.js';


// Form fields and attributes that can be modified by users
// They also have implicit values that make it hard to know if they were changed by the user or developer
let formFields = ['input', 'option', 'textarea'];
let formAtts = ['value', 'checked', 'selected'];
let formAttsNoVal = ['checked', 'selected'];

// Dynamic field value setters
// These help indicate intent for fields that have implicit properties whether set or not
let reefAtts = ['reef-checked', 'reef-selected', 'reef-value'];
let reefAttsDef = ['reef-default-checked', 'reef-default-selected', 'reef-default-value'];

/**
 * Add an attribute to an element
 * @param {Node}   elem The element
 * @param {String} att  The attribute
 * @param {String} val  The value
 */
function addAttribute (elem, att, val) {

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
 * @param  {Node} template The new template
 * @param  {Node} existing The existing DOM node
 */
function diffAttributes (template, existing) {

	// If the node is not an element, bail
	if (template.nodeType !== 1) return;

	// Get attributes for the template and existing DOM
	let templateAtts = template.attributes;
	let existingAtts = existing.attributes;

	// Add and update attributes from the template into the DOM
	for (let attribute of templateAtts) {

		// Skip [reef-default-*] attributes
		if (attribute.name.slice(0, 13) === 'reef-default-') continue;

		// Skip user-editable form field attributes
		if (formAtts.includes(attribute.name) && formFields.includes(template.tagName.toLowerCase())) continue;

		// Convert [reef-*] names to their real attribute name
		let attName = attribute.name.replace('reef-', '');

		// If its a no-value property and it's falsey remove it
		if (formAttsNoVal.includes(attName) && _.isFalsy(attribute.value)) {
			removeAttribute(existing, attName);
			return;
		}

		// Otherwise, add the attribute
		addAttribute(existing, attName, attribute.value);

	}

	// Remove attributes from the DOM that shouldn't be there
	for (let attribute of existingAtts) {

		// If the attribute exists in the template, skip it
		if (templateAtts[attribute.name]) continue;

		// Skip user-editable form field attributes
		if (formAtts.includes(attribute.name) && formFields.includes(existing.tagName.toLowerCase())) continue;

		// Otherwise, remove it
		removeAttribute(existing, attribute.name);

	}

}

/**
 * Add default attributes to a newly created element
 * @param  {Node} elem The element
 */
function addDefaultAtts (elem) {

	// Only run on elements
	if (elem.nodeType !== 1) return;

	// Remove [reef-default-*] and [reef-*] attributes and replace them with the plain attributes
	for (let attribute of elem.attributes) {

		// If the attribute isn't a [reef-default-*] or [reef-*], skip it
		if (attribute.name.slice(0, 5) !== 'reef-') continue;

		// Get the plain attribute name
		let attName = attribute.name.replace('reef-default-', '').replace('reef-', '');

		// Remove the [reef-default-*] or [reef-*] attribute
		removeAttribute(elem, attribute.name);

		// If it's a no-value attribute and its falsy, skip it
		if (formAttsNoVal.includes(attName) && _.isFalsy(attribute.value)) continue;

		// Add the plain attribute
		addAttribute(elem, attName, attribute.value);

	}

	// If there are child elems, recursively add defaults to them
	if (elem.childNodes) {
		for (let node of elem.childNodes) {
			addDefaultAtts(node);
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
		node1.nodeType !== node2.nodeType ||
		node1.tagName !== node2.tagName ||
		node1.id !== node2.id ||
		node1.src !== node2.src
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
 * Diff the existing DOM node versus the template
 * @param  {Array} template The template HTML
 * @param  {Node}  existing The current DOM HTML
 * @param  {Array} polyps   Attached components for this element
 */
function diff (template, existing, polyps = []) {

	// Get the nodes in the template and existing UI
	let templateNodes = template.childNodes;
	let existingNodes = existing.childNodes;

	// Loop through each node in the template and compare it to the matching element in the UI
	templateNodes.forEach(function (node, index) {

		// If element doesn't exist, create it
		if (!existingNodes[index]) {
			addDefaultAtts(node);
			existing.append(node.cloneNode(true));
			return;
		}

		// If there is, but it's not the same node type, insert the new node before the existing one
		if (isDifferentNode(node, existingNodes[index])) {

			// Check if node exists further in the tree
			let ahead = aheadInTree(node, existingNodes, index);

			// If not, insert the node before the current one
			if (!ahead) {
				addDefaultAtts(node);
				existingNodes[index].before(node.cloneNode(true));
				return;
			}

			// Otherwise, move it to the current spot
			existingNodes[index].before(ahead);

		}

		// If element is an attached component, skip it
		let isPolyp = polyps.filter(function (polyp) {
			return ![3, 8].includes(node.nodeType) && node.matches(polyp);
		});
		if (isPolyp.length > 0) return;

		// If content is different, update it
		let templateContent = getNodeContent(node);
		if (templateContent && templateContent !== getNodeContent(existingNodes[index])) {
			existingNodes[index].textContent = templateContent;
		}

		// If attributes are different, update them
		diffAttributes(node, existingNodes[index]);

		// If there shouldn't be child nodes but there are, remove them
		if (!node.childNodes.length && existingNodes[index].childNodes.length) {
			existingNodes[index].innerHTML = '';
			return;
		}

		// If DOM is empty and shouldn't be, build it up
		// This uses a document fragment to minimize reflows
		if (!existingNodes[index].childNodes.length && node.childNodes.length) {
			let fragment = document.createDocumentFragment();
			diff(node, fragment, polyps);
			existingNodes[index].appendChild(fragment);
			return;
		}

		// If there are nodes within it, recursively diff those
		if (node.childNodes.length) {
			diff(node, existingNodes[index], polyps);
		}

	});

	// If extra elements in DOM, remove them
	trimExtraNodes(existingNodes, templateNodes);

}

/**
 * If there are linked Reefs, render them, too
 * @param  {Array} polyps Attached Reef components
 */
function renderPolyps (polyps, reef) {
	if (!polyps) return;
	for (let coral of polyps) {
		if (coral.attached.includes(reef)) return _.err(`"${reef.elem}" has attached nodes that it is also attached to, creating an infinite loop.`);
		if ('render' in coral) {
			coral.render();
		}
	}
}


export {diff, renderPolyps};