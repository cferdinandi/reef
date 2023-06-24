#!/usr/bin/env node

import * as esbuild from 'esbuild';
import pkg from './package.json';


// Configs
let configs = {
	name: 'reef',
	files: ['reef.js'],
	formats: ['iife', 'esm', 'cjs'],
	default: 'iife',
	pathIn: 'src',
	pathOut: 'dist',
	minify: true,
	sourceMap: true
};

// Banner
function banner (filename) {
	return `/*! ${configs.name} v${pkg.version} | (c) ${new Date().getFullYear()} ${pkg.author.name} | ${pkg.license} License | ${pkg.repository.url} */`;
}

for (let file of configs.files) {
	let filename = file.replace('.js', '');
	for (let format of configs.formats) {
		await esbuild.build({
			entryPoints: [`src/${filename}.js`],
			bundle: true,
			// minify: true,
			// sourcemap: true,
			outfile: `dist/${filename}${filename}${format === configs.default ? '' : `.${format}`}.js`,
		});
	}
}
