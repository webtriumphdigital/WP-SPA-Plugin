module.exports = {
  prefix: 'ap-',
  content: [
    "./src/frontend/**/*.{js,css}",
    "./templates/*.php",
  ],
  plugins: [
    function ({ addVariant }) {
      addVariant('child', '& > *');
      addVariant('child-hover', '& > *:hover');
      addVariant('last-child', '& > *:last-child');
      addVariant('first-child', '& > *:first-child');
    }
  ],
  important: false,
};
