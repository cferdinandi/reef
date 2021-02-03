// The Reef Constructor
let _Reef;

/**
 * Store constructor
 * @param {Object} options The data store options
 */
function ReefStore (options) {
	options.lagoon = true;
	return new _Reef(null, options);
}

/**
 * Define the Reef instance and attach the ReefStore to it
 * @param  {Constructor} Reef The Reef instance
 */
ReefStore.install = function (Reef) {
	_Reef = Reef;
};

// Auto-install when used as a global script
if (typeof window !== 'undefined' && window.Reef) {
	ReefStore.install(window.Reef);
}


export default ReefStore;