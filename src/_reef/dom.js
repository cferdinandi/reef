import * as _ from './utilities.js';


// Attributes that might be changed by users
// They also have implicit properties that make it hard to know if they were changed by the user or developer
let dynamicAttributes = ['checked', 'selected', 'value'];

// Attributes that are dynamic but have no required value
let dynamicAttributesNoValue = ['checked', 'selected'];

// Elements that have dynamic attributes
let dynamicFields = ['input', 'option', 'textarea'];

// Dynamic field value setters
// These help indicate intent for fields that have implicit properties whether set or not
let reefAttributes = ['reef-checked', 'reef-selected', 'reef-value'];
let reefAttributeDefaults = ['reef-default-checked', 'reef-default-selected', 'reef-default-value'];

/**
 * Add attributes to an element
 * @param {Node}  elem The element
 * @param {Array} atts The attributes to add
 */
function addAttributes (elem, atts) {
	atts.forEach(function (attribute) {
		// If the attribute is a class, use className
		// Else if it's style, add the styles
		// Otherwise, set the attribute
		if (attribute.att === 'class') {
			elem.className = attribute.value;
		} else if (attribute.att === 'style') {
			elem.style.cssText = attribute.value;
		} else {
			if (attribute.att in elem) {
				try {
					elem[attribute.att] = attribute.value;
					if (!elem[attribute.att] && elem[attribute.att] !== 0) {
						elem[attribute.att] = attribute.att === 'value' ? attribute.value : true;
					}
				} catch (e) {}
			}
			try {
				elem.setAttribute(attribute.att, attribute.value);
			} catch (e) {}
		}
	});
}

/**
 * Remove attributes from an element
 * @param {Node}  elem The element
 * @param {Array} atts The attributes to remove
 */
function removeAttributes (elem, atts) {
	atts.forEach(function (attribute) {
		// If the attribute is a class, use className
		// Else if it's style, remove all styles
		// Otherwise, use removeAttribute()
		if (attribute.att === 'class') {
			elem.className = '';
		} else if (attribute.att === 'style') {
			elem.style.cssText = '';
		} else {
			if (attribute.att in elem) {
				try {
					elem[attribute.att] = '';
				} catch (e) {}
			}
			try {
				elem.removeAttribute(attribute.att);
			} catch (e) {}
		}
	});
}

/**
 * Create an object with the attribute name and value
 * @param  {String} name  The attribute name
 * @param  {*}      value The attribute value
 * @return {Object}       The object of attribute details
 */
function getAttribute (name, value) {
	return {
		att: name,
		value: value
	};
}

/**
 * Create an array of the attributes on an element
 * @param  {Node}    node       The node to get attributes from
 * @param  {Boolean} isTemplate If true, the node is in the template and not the DOM
 * @return {Array}              The attributes on an element as an array of key/value pairs
 */
function getAttributes (node, isTemplate) {

	// If the node is not an element, return a empty array
	if (node.nodeType !== 1) return [];

	// Otherwise, get an array of attributes
	return Array.from(node.attributes).map(function (attribute) {

		// If the node is a template with a dynamic attribute/field, skip it
		if (isTemplate && dynamicAttributes.includes(attribute.name) && dynamicFields.includes(node.tagName.toLowerCase())) return;

		// If the node is in the DOM with a dynamic field, get it
		if (!isTemplate && dynamicAttributes.includes(attribute.name)) {
			return getAttribute(attribute.name, node[attribute.name]);
		}

		// If the attribute is a [reef-default-*] attribute, skip it
		if (reefAttributeDefaults.includes(attribute.name)) return;

		// If it's a template node with a [reef-*] attribute, get the attribute from the reef att
		if (isTemplate && reefAttributes.includes(attribute.name)) {
			let attName = attribute.name.replace('reef-', '');
			return dynamicAttributesNoValue.includes(attName) ? getAttribute(attName, _.isFalsy(attribute.value) ? null : attName) : getAttribute(attName, attribute.value);
		}

		// Otherwise, get the value as-is
		return getAttribute(attribute.name, attribute.value);

	}).filter(function (attribute) {
		return !!attribute;
	});

}

/**
 * Diff the attributes on an existing element versus the template
 * @param  {Object} template The new template
 * @param  {Object} elem     The existing DOM node
 */
function diffAtts (template, elem) {

	let templateAtts = getAttributes(template, true);
	let elemAtts = getAttributes(elem);

	// Get attributes to remove
	let remove = elemAtts.filter(function (att) {
		let getAtt = templateAtts.find(function (newAtt) {
			return att.att === newAtt.att;
		});
		return (getAtt === undefined && !dynamicAttributes.includes(att.att)) || (getAtt && dynamicAttributesNoValue.includes(getAtt.att) && getAtt.value === null);
	});

	// Get attributes to change
	let change = templateAtts.filter(function (att) {
		if (dynamicAttributesNoValue.includes(att.att) && att.value === null) return false;
		let getAtt = elemAtts.find(function (elemAtt) {
			return att.att === elemAtt.att;
		});
		return getAtt === undefined || getAtt.value !== att.value;
	});

	// Add/remove any required attributes
	addAttributes(elem, change);
	removeAttributes(elem, remove);

}

/**
 * Add default attributes to a newly created node
 * @param  {Node}   node The node
 */
function addDefaultAtts (node) {

	// Only run on elements
	if (node.nodeType !== 1) return;

	// Remove [reef-*] attributes and replace with proper values
	Array.from(node.attributes).forEach(function (attribute) {
		if (!reefAttributes.includes(attribute.name) && !reefAttributeDefaults.includes(attribute.name)) return;
		let attName = attribute.name.replace('reef-default-', '').replace('reef-', '');
		let isNoVal = dynamicAttributesNoValue.includes(attName);
		removeAttributes(node, [getAttribute(attribute.name, attribute.value)]);
		if (isNoVal && _.isFalsy(attribute.value)) return;
		addAttributes(node, [isNoVal ? getAttribute(attName, attName) : getAttribute(attName, attribute.value)]);
	});

	// If there are child nodes, recursively check them
	if (node.childNodes) {
		Array.from(node.childNodes).forEach(function (childNode) {
			addDefaultAtts(childNode);
		});
	}

}

/**
 * Get the type for a node
 * @param  {Node}   node The node
 * @return {String}      The type
 */
function getNodeType (node) {
	return node.nodeType === 3 ? 'text' : (node.nodeType === 8 ? 'comment' : node.tagName.toLowerCase());
}

/**
 * Get the content from a node
 * @param  {Node}   node The node
 * @return {String}      The content
 */
function getNodeContent (node) {
	return node.childNodes && node.childNodes.length > 0 ? null : node.textContent;
}

/**
 * Check if two nodes are different
 * @param  {Node}  node1 The first node
 * @param  {Node}  node2 The second node
 * @return {Boolean}     If true, they're not the same node
 */
function isDifferentNode (node1, node2) {
	return getNodeType(node1) !== getNodeType(node2) || node1.id !== node2.id || node1.src !== node1.src;
}

/**
 * Check if the desired node is further ahead in the DOM tree
 * @param  {Node}     node  The node to look for
 * @param  {NodeList} tree  The DOM tree
 * @param  {Integer}  start The starting index
 * @return {Integer}        How many nodes ahead the target node is
 */
function aheadInTree (node, tree, start) {
	return Array.from(tree).slice(start + 1).find(function (branch) {
		return !isDifferentNode(node, branch);
	});
}

/**
 * If there are extra elements in DOM, remove them
 * @param  {Array} domMap      The existing DOM
 * @param  {Array} templateMap The template
 */
function trimExtraNodes (domMap, templateMap) {
	let count = domMap.length - templateMap.length;
	if (count < 1)  return;
	for (; count > 0; count--) {
		domMap[domMap.length - count].remove(domMap[domMap.length - count]);
	}
}

/**
 * Diff the existing DOM node versus the template
 * @param  {Array} template The template HTML
 * @param  {Node}  elem     The current DOM HTML
 * @param  {Array} polyps   Attached components for this element
 */
function diff (template, elem, polyps = []) {

	// Get arrays of child nodes
	let domMap = elem.childNodes;
	let templateMap = template.childNodes;

	// Diff each item in the templateMap
	templateMap.forEach(function (node, index) {

		// If element doesn't exist, create it
		if (!domMap[index]) {
			addDefaultAtts(node);
			elem.append(node.cloneNode(true));
			return;
		}

		// If element is not the same type, update the DOM accordingly
		if (isDifferentNode(node, domMap[index])) {

			// Check if node exists further in the tree
			let ahead = aheadInTree(node, domMap, index);

			// If not, insert the node before the current one
			if (!ahead) {
				addDefaultAtts(node);
				domMap[index].before(node.cloneNode(true));
				return;
			}

			// Otherwise, move it to the current spot
			domMap[index].before(ahead);

		}

		// If attributes are different, update them
		diffAtts(node, domMap[index]);

		// If element is an attached component, skip it
		let isPolyp = polyps.filter(function (polyp) {
			return ![3, 8].includes(node.nodeType) && node.matches(polyp);
		});
		if (isPolyp.length > 0) return;

		// If content is different, update it
		let templateContent = getNodeContent(node);
		if (templateContent && templateContent !== getNodeContent(domMap[index])) {
			domMap[index].textContent = templateContent;
		}

		// If target element should be empty, wipe it
		if (domMap[index].childNodes.length > 0 && node.childNodes.length < 1) {
			domMap[index].innerHTML = '';
			return;
		}

		// If element is empty and shouldn't be, build it up
		// This uses a document fragment to minimize reflows
		if (domMap[index].childNodes.length < 1 && node.childNodes.length > 0) {
			let fragment = document.createDocumentFragment();
			diff(node, fragment, polyps);
			domMap[index].appendChild(fragment);
			return;
		}

		// If there are existing child elements that need to be modified, diff them
		if (node.childNodes.length > 0) {
			diff(node, domMap[index], polyps);
		}

	});

	// If extra elements in DOM, remove them
	trimExtraNodes(domMap, templateMap);

}

/**
 * If there are linked Reefs, render them, too
 * @param  {Array} polyps Attached Reef components
 */
function renderPolyps (polyps, reef) {
	if (!polyps) return;
	polyps.forEach(function (coral) {
		if (coral.attached.includes(reef)) return _.err(`"${reef.elem}" has attached nodes that it is also attached to, creating an infinite loop.`);
		if ('render' in coral) coral.render();
	});
}


export {diff, renderPolyps};