function Constructor (el, fn) {
	Object.defineProperties(this, {
		el: {value: typeof el === 'string' ? document.querySelector(el) : el},
		fn: {value: fn},
		props: {value: []}
	});
}

Constructor.prototype.add = function (props) {
	this.props.push(props);
};

Constructor.prototype.rm = function (props) {
	let index = this.props.indexOf(props);
	if (index < 0) return;
	this.props.splice(index, 1);
};

function clone (el, fn) {
	function Clone (el, fn) {
		Constructor.call(this, el, fn);
	}
	Clone.prototype = Object.create(Constructor.prototype);
	return Clone;
}

export {clone};