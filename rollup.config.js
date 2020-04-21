// Plugins
import { terser } from "rollup-plugin-terser";
import pkg from './package.json';

// Banner
var banner = `/*! ${pkg.config.name} v${pkg.version} | (c) ${new Date().getFullYear()} ${pkg.author.name} | ${pkg.license} License | ${pkg.repository.url} */`;

export default {
	input: `src/${pkg.config.filename}.js`,
	output: [
		{
			file: `dist/${pkg.config.filename}.js`,
			format: 'iife',
			name: pkg.config.name,
			banner: banner
		},
		{
			file: `dist/${pkg.config.filename}.min.js`,
			format: 'iife',
			name: pkg.config.name,
			banner: banner,
			plugins: [terser()]
		},
		{
			file: `dist/${pkg.config.filename}.es.js`,
			format: 'es',
			banner: banner
		},
		{
			file: `dist/${pkg.config.filename}.es.min.js`,
			format: 'es',
			banner: banner,
			plugins: [terser()]
		},
		{
			file: `dist/${pkg.config.filename}.amd.js`,
			format: 'amd',
			banner: banner
		},
		{
			file: `dist/${pkg.config.filename}.amd.min.js`,
			format: 'amd',
			banner: banner,
			plugins: [terser()]
		},
		{
			file: `dist/${pkg.config.filename}.cjs.js`,
			format: 'cjs',
			banner: banner
		},
		{
			file: `dist/${pkg.config.filename}.cjs.min.js`,
			format: 'cjs',
			banner: banner,
			plugins: [terser()]
		}
	]
};