import * as _ from './utilities.js';


// Attributes that might be changed dynamically
let dynamicAttributes = ['checked', 'selected', 'value'];

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
 * Get the dynamic attributes for a node
 * @param  {Node}    node       The node
 * @param  {Array}   atts       The static attributes
 * @param  {Boolean} isTemplate If true, these are for the template
 */
function getDynamicAttributes (node, atts, isTemplate) {
	dynamicAttributes.forEach(function (prop) {
		atts.push(getAttribute(prop, node.getAttribute(prop)));
	});
}

/**
 * Get base attributes for a node
 * @param  {Node} node The node
 * @return {Array}     The node's attributes
 */
function getBaseAttributes (node, isTemplate) {
	return Array.from(node.attributes).reduce(function (arr, attribute) {
		if ((!dynamicAttributes.includes(attribute.name) || (isTemplate && attribute.name === 'selected')) && (attribute.name.length > 7 ? attribute.name.slice(0, 7) !== 'default' : true)) {
			arr.push(getAttribute(attribute.name, attribute.value));
		}
		return arr;
	}, []);
}

/**
 * Create an array of the attributes on an element
 * @param  {Node}    node       The node to get attributes from
 * @param  {Boolean} isTemplate If true, the node is in the template and not the DOM
 * @return {Array}              The attributes on an element as an array of key/value pairs
 */
function getAttributes (node, isTemplate) {
	if (node.nodeType !== 1) return [];
	let atts = getBaseAttributes(node, isTemplate);
	getDynamicAttributes(node, atts, isTemplate);
	return atts;
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
		return getAtt === undefined;
	});

	// Get attributes to change
	let change = templateAtts.filter(function (att) {
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
 * Add default attributes to a newly created node
 * @param  {Node}   node The node
 */
function addDefaultAtts (node) {

	// Only run on elements
	if (node.nodeType !== 1) return;

	// Check for default attributes
	// Add/remove as needed
	Array.prototype.forEach.call(node.attributes, function (attribute) {
		if (attribute.name.length < 8 || attribute.name.slice(0, 7) !== 'default') return;
		addAttributes(node, [getAttribute(attribute.name.slice(7).toLowerCase(), attribute.value)]);
		removeAttributes(node, [getAttribute(attribute.name, attribute.value)]);
	});

	// If there are child nodes, recursively check them
	if (node.childNodes) {
		Array.from(node.childNodes).forEach(function (childNode) {
			addDefaultAtts(childNode);
		});
	}

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
		domMap[domMap.length - count].parentNode.removeChild(domMap[domMap.length - count]);
	}
}

/**
 * Diff the existing DOM node versus the template
 * @param  {Array} template The template HTML
 * @param  {Node}  elem     The current DOM HTML
 * @param  {Array} polyps   Attached components for this element
 */
function diff (template, elem, polyps) {

	// Get arrays of child nodes
	let domMap = Array.from(elem.childNodes);
	let templateMap = Array.from(template.childNodes);

	// If extra elements in DOM, remove them
	trimExtraNodes(domMap, templateMap);

	// Diff each item in the templateMap
	templateMap.forEach(function (node, index) {

		// If element doesn't exist, create it
		if (!domMap[index]) {
			addDefaultAtts(node);
			elem.appendChild(node.cloneNode(true));
			return;
		}

		// If element is not the same type, replace it with new element
		if (getNodeType(node) !== getNodeType(domMap[index])) {
			domMap[index].parentNode.replaceChild(node.cloneNode(true), domMap[index]);
			return;
		}

		// If attributes are different, update them
		diffAtts(node, domMap[index]);

		// If element is an attached component, skip it
		let isPolyp = polyps.filter(function (polyp) {
			return node.nodeType !== 3 && node.matches(polyp);
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

}

/**
 * If there are linked Reefs, render them, too
 * @param  {Array} polyps Attached Reef components
 */
function renderPolyps (polyps, reef) {
	if (!polyps) return;
	polyps.forEach(function (coral) {
		if (coral.attached.includes(reef)) return _.err('' + reef.elem + ' has attached nodes that it is also attached to, creating an infinite loop.');
		if ('render' in coral) coral.render();
	});
}


export {diff, renderPolyps};