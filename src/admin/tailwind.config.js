module.exports = {
	prefix: 'ap-',
	content: [
		'./src/admin/components/*.jsx',
		'./src/admin/views/*.jsx',
		'./src/admin/views/**/*.jsx',
		'./src/admin/index.jsx',
	],
	theme: {
		extend: {
			animation: {
				'pop': 'pop 0.2s ease-out',
			},
			keyframes: {
				pop: {
					'0%': { opacity: '0', transform: 'scale(0.9)' },
					'100%': { opacity: '1', transform: 'scale(1)' },
				},
			},
		},
	},
	plugins: [
		function ({ addVariant }) {
			addVariant('child', '& > *');
			addVariant('child-hover', '& > *:hover');
			addVariant('last-child', '& > *:last-child');
			addVariant('first-child', '& > *:first-child');
		},
	],
	important: true,
};
