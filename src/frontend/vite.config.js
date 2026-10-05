import { defineConfig } from 'vite';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	css: {
		postcss: {
			plugins: [
				tailwindcss(path.resolve(__dirname, 'tailwind.config.js')),
				autoprefixer(),
			],
		},
	},
	build: {
		lib: {
			entry: path.resolve(__dirname, 'index.js'),
			name: 'TDSPA',
			fileName: () => 'js/td-spa.min.js',
			formats: ['iife'],
		},
		rollupOptions: {
			output: {
				assetFileNames: 'css/td-spa.min.[ext]',
			},
		},
		outDir: path.resolve(__dirname, '../../public'),
		sourcemap: true,
		minify: true,
		cssMinify: true,
		emptyOutDir: false,
	},
	resolve: {
		alias: {
			'@features': path.resolve(__dirname, 'features'),
		},
	},
});
