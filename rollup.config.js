// Plugins
import { terser } from 'rollup-plugin-terser';
import pkg from './package.json';


// Configs
let configs = {
	name: 'Reef',
	files: ['reef.js', 'router.js'],
	formats: ['iife', 'es', 'amd', 'cjs'],
	default: 'iife',
	pathIn: 'src',
	pathOut: 'dist',
	minify: true
};

// Filename mapping
let filenames = {
	reef: 'Reef',
	router: 'ReefRouter'
};

// Banner
function banner (filename) {
	return `/*! ${filenames[filename]} v${pkg.version} | (c) ${new Date().getFullYear()} ${pkg.author.name} | ${pkg.license} License | ${pkg.repository.url} */`;
}

function createOutput (filename, minify) {
	return configs.formats.map(function (format) {
		let output = {
			file: `${configs.pathOut}/${filename}${format === configs.default ? '' : `.${format}`}${minify ? '.min' : ''}.js`,
			format: format,
			banner: banner(filename)
		};
		if (format === 'iife') {
			output.name = filenames[filename];
		}
		if (minify) {
			output.plugins = [terser()];
		}
		return output;
	});
}

/**
 * Create output formats
 * @param  {String} filename The filename
 * @return {Array}           The outputs array
 */
function createOutputs (filename) {

	// Create base outputs
	let outputs = createOutput(filename);

	// If not minifying, return outputs
	if (!configs.minify) return outputs;

	// Otherwise, ceate second set of outputs
	let outputsMin = createOutput(filename, true);

	// Merge and return the two arrays
	return outputs.concat(outputsMin);

}

/**
 * Create export object
 * @return {Array} The export object
 */
function createExport (file) {
	return configs.files.map(function (file) {
		let filename = file.replace('.js', '');
		return {
			input: `${configs.pathIn}/${file}`,
			output: createOutputs(filename)
		};
	});
}


export default createExport();