import * as _ from './utilities.js';


// Attributes that might be changed dynamically
var dynamicAttributes = ['checked', 'selected', 'value'];

/**
 * Create an array map of style names and values
 * @param  {String} styles The styles
 * @return {Array}         The styles
 */
var getStyleMap = function (styles) {
	return styles.split(';').reduce(function (arr, style) {
		var col = style.indexOf(':');
		if (col) {
			arr.push({
				name: style.slice(0, col).trim(),
				value: style.slice(col + 1).trim()
			});
		}
		return arr;
	}, []);
};

/**
 * Remove styles from an element
 * @param  {Node}  elem   The element
 * @param  {Array} styles The styles to remove
 */
var removeStyles = function (elem, styles) {
	styles.forEach(function (style) {
		elem.style[style] = '';
	});
};

/**
 * Add or updates styles on an element
 * @param  {Node}  elem   The element
 * @param  {Array} styles The styles to add or update
 */
var changeStyles = function (elem, styles) {
	styles.forEach(function (style) {
		elem.style[style.name] = style.value;
	});
};

/**
 * Diff existing styles from new ones
 * @param  {Node}   elem   The element
 * @param  {String} styles The styles the element should have
 */
var diffStyles = function (elem, styles) {

	// Get style map
	var styleMap = getStyleMap(styles);

	// Get styles to remove
	var remove = Array.prototype.filter.call(elem.style, function (style) {
		var findStyle = _.find(styleMap, function (newStyle) {
			return newStyle.name === style && newStyle.value === elem.style[style];
		});
		return findStyle === null;
	});

	// Add and remove styles
	removeStyles(elem, remove);
	changeStyles(elem, styleMap);

};

/**
 * Add attributes to an element
 * @param {Node}  elem The element
 * @param {Array} atts The attributes to add
 */
var addAttributes = function (elem, atts) {
	atts.forEach(function (attribute) {
		// If the attribute is a class, use className
		// Else if it's style, diff and update styles
		// Otherwise, set the attribute
		if (attribute.att === 'class') {
			elem.className = attribute.value;
		} else if (attribute.att === 'style') {
			diffStyles(elem, attribute.value);
		} else {
			if (attribute.att in elem) {
				try {
					elem[attribute.att] = attribute.value;
					if (!elem[attribute.att] && elem[attribute.att] !== 0) {
						elem[attribute.att] = true;
					}
				} catch (e) {}
			}
			try {
				elem.setAttribute(attribute.att, attribute.value);
			} catch (e) {}
		}
	});
};

/**
 * Remove attributes from an element
 * @param {Node}  elem The element
 * @param {Array} atts The attributes to remove
 */
var removeAttributes = function (elem, atts) {
	atts.forEach(function (attribute) {
		// If the attribute is a class, use className
		// Else if it's style, remove all styles
		// Otherwise, use removeAttribute()
		if (attribute.att === 'class') {
			elem.className = '';
		} else if (attribute.att === 'style') {
			removeStyles(elem, _.arrayFrom(elem.style));
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
};

/**
 * Create an object with the attribute name and value
 * @param  {String} name  The attribute name
 * @param  {*}      value The attribute value
 * @return {Object}       The object of attribute details
 */
var getAttribute = function (name, value) {
	return {
		att: name,
		value: value
	};
};

/**
 * Get the dynamic attributes for a node
 * @param  {Node}    node       The node
 * @param  {Array}   atts       The static attributes
 * @param  {Boolean} isTemplate If true, these are for the template
 */
var getDynamicAttributes = function (node, atts, isTemplate) {
	dynamicAttributes.forEach(function (prop) {
		if ((!node[prop] && node[prop] !== 0) || (isTemplate && node.tagName.toLowerCase() === 'option' && prop === 'selected') || (isTemplate && node.tagName.toLowerCase() === 'select' && prop === 'value')) return;
		atts.push(getAttribute(prop, node[prop]));
	});
};

/**
 * Get base attributes for a node
 * @param  {Node} node The node
 * @return {Array}     The node's attributes
 */
var getBaseAttributes = function (node, isTemplate) {
	return Array.prototype.reduce.call(node.attributes, function (arr, attribute) {
		if ((dynamicAttributes.indexOf(attribute.name) < 0 || (isTemplate && attribute.name === 'selected')) && (attribute.name.length > 7 ? attribute.name.slice(0, 7) !== 'default' : true)) {
			arr.push(getAttribute(attribute.name, attribute.value));
		}
		return arr;
	}, []);
};

/**
 * Create an array of the attributes on an element
 * @param  {Node}    node       The node to get attributes from
 * @return {Array}              The attributes on an element as an array of key/value pairs
 */
var getAttributes = function (node, isTemplate) {
	if (node.nodeType !== 1) return [];
	var atts = getBaseAttributes(node, isTemplate);
	getDynamicAttributes(node, atts, isTemplate);
	return atts;
};

/**
 * Diff the attributes on an existing element versus the template
 * @param  {Object} template The new template
 * @param  {Object} elem     The existing DOM node
 */
var diffAtts = function (template, elem) {

	var templateAtts = getAttributes(template, true);
	var elemAtts = getAttributes(elem);

	// Get attributes to remove
	var remove = elemAtts.filter(function (att) {
		if (dynamicAttributes.indexOf(att.att) > -1) return false;
		var getAtt = _.find(templateAtts, function (newAtt) {
			return att.att === newAtt.att;
		});
		return getAtt === null;
	});

	// Get attributes to change
	var change = templateAtts.filter(function (att) {
		var getAtt = _.find(elemAtts, function (elemAtt) {
			return att.att === elemAtt.att;
		});
		return getAtt === null || getAtt.value !== att.value;
	});

	// Add/remove any required attributes
	addAttributes(elem, change);
	removeAttributes(elem, remove);

};

/**
 * Get the type for a node
 * @param  {Node}   node The node
 * @return {String}      The type
 */
var getNodeType = function (node) {
	return node.nodeType === 3 ? 'text' : (node.nodeType === 8 ? 'comment' : node.tagName.toLowerCase());
};

/**
 * Get the content from a node
 * @param  {Node}   node The node
 * @return {String}      The type
 */
var getNodeContent = function (node) {
	return node.childNodes && node.childNodes.length > 0 ? null : node.textContent;
};

/**
 * Add default attributes to a newly created node
 * @param  {Node}   node The node
 */
var addDefaultAtts = function (node) {

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
		Array.prototype.forEach.call(node.childNodes, function (childNode) {
			addDefaultAtts(childNode);
		});
	}

};

/**
 * Diff the existing DOM node versus the template
 * @param  {Array} template The template HTML
 * @param  {Node}  elem     The current DOM HTML
 * @param  {Array} polyps   Attached components for this element
 */
var diff = function (template, elem, polyps) {

	// Get arrays of child nodes
	var domMap = _.arrayFrom(elem.childNodes);
	var templateMap = _.arrayFrom(template.childNodes);

	// If extra elements in DOM, remove them
	var count = domMap.length - templateMap.length;
	if (count > 0) {
		for (; count > 0; count--) {
			domMap[domMap.length - count].parentNode.removeChild(domMap[domMap.length - count]);
		}
	}

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
		var isPolyp = polyps.filter(function (polyp) {
			return node.nodeType !== 3 && _.matches(node, polyp);
		});
		if (isPolyp.length > 0) return;

		// If content is different, update it
		var templateContent = getNodeContent(node);
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
			var fragment = document.createDocumentFragment();
			diff(node, fragment, polyps);
			domMap[index].appendChild(fragment);
			return;
		}

		// If there are existing child elements that need to be modified, diff them
		if (node.childNodes.length > 0) {
			diff(node, domMap[index], polyps);
		}

	});

};

/**
 * If there are linked Reefs, render them, too
 * @param  {Array} polyps Attached Reef components
 */
var renderPolyps = function (polyps, reef) {
	if (!polyps) return;
	polyps.forEach(function (coral) {
		if (coral.attached.indexOf(reef) > -1) return _.err('' + reef.elem + ' has attached nodes that it is also attached to, creating an infinite loop.');
		if ('render' in coral) coral.render();
	});
};


export {diff, renderPolyps};