import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	plugins: [solidPlugin()],
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
			entry: path.resolve(__dirname, 'index.jsx'),
			name: 'TDSPAAdmin',
			fileName: () => 'js/admin.min.js',
			formats: ['iife'],
		},
		rollupOptions: {
			output: {
				assetFileNames: 'css/admin.min.[ext]',
			},
		},
		outDir: path.resolve(__dirname, '../../public'),
		sourcemap: true,
		minify: true,
		cssMinify: true,
		emptyOutDir: false,
		target: 'esnext',
	},
	resolve: {
		alias: {
			'@components': path.resolve(__dirname, 'components'),
			'@': path.resolve(__dirname, 'views'),
			'@util': path.resolve(__dirname, 'utility'),
		},
	},
});
