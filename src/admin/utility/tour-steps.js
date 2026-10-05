export const TOUR_MODES = {
	QUICK: 'quick',
	EXTENDED: 'extended'
};

export const quickTourSteps = [
	{
		id: 'welcome',
		route: '/',
		selector: null,
		title: 'Welcome to TD SPA!',
		content: 'Transform your WordPress site into a blazing-fast, app-like experience. Let us show you around.',
		position: 'center'
	},
	{
		id: 'navigation-toggle',
		route: '/',
		selector: '[data-tour="instant-navigation"]',
		title: 'Instant Navigation',
		content: 'Turn this on to enable iframe-based SPA navigation. Pages load without full reloads.',
		position: 'right'
	},
	{
		id: 'loader-type',
		route: '/animations',
		selector: '[data-tour="loader-type"]',
		title: 'Loading Style',
		content: 'Choose your preferred loading indicator: progress bar or spinner.',
		position: 'right'
	},
	{
		id: 'content-animation',
		route: '/animations',
		selector: '[data-tour="content-animation"]',
		title: 'Page Transitions',
		content: 'Add smooth fade, slide, scale, or flip animations between pages.',
		position: 'right'
	},
	{
		id: 'preserve-elements',
		route: '/advanced',
		selector: '[data-tour="exclude-elements"]',
		title: 'Preserve Audio & Video',
		content: 'Keep audio players, radios, and videos playing during navigation. Perfect for music sites!',
		position: 'right'
	},
	{
		id: 'prefetch',
		route: '/cache',
		selector: '[data-tour="prefetch-toggle"]',
		title: 'Enable Prefetch',
		content: 'Pages load instantly by prefetching content when users hover over links.',
		position: 'right'
	},
	{
		id: 'help',
		route: '/help',
		selector: '[data-tour="help-resources"]',
		title: 'Need Help?',
		content: 'Documentation, tutorials, and support are just a click away. You can restart this tour anytime from here!',
		position: 'top'
	}
];

export const extendedTourSteps = [
	{
		id: 'welcome',
		route: '/',
		selector: null,
		title: 'Welcome to TD SPA!',
		content: 'Transform your WordPress site into a blazing-fast, app-like experience. Let us show you around.',
		position: 'center'
	},
	{
		id: 'navigation-toggle',
		route: '/',
		selector: '[data-tour="instant-navigation"]',
		title: 'Instant Navigation',
		content: 'Turn this on to enable iframe-based SPA navigation. This is the core feature.',
		position: 'right'
	},
	{
		id: 'disable-admins',
		route: '/',
		selector: '[data-tour="disable-admins"]',
		title: 'Admin Override',
		content: 'Optionally disable SPA navigation for logged-in admins on the frontend.',
		position: 'right'
	},
	{
		id: 'scroll-to-top',
		route: '/',
		selector: '[data-tour="scroll-to-top"]',
		title: 'Scroll to Top',
		content: 'Automatically scroll to the top of the page after navigation.',
		position: 'right'
	},
	{
		id: 'preserve-elements',
		route: '/advanced',
		selector: '[data-tour="exclude-elements"]',
		title: 'Preserve Elements',
		content: 'Keep audio players, videos, and widgets persistent during navigation.',
		position: 'right'
	},
	{
		id: 'exclude-links',
		route: '/advanced',
		selector: '[data-tour="exclude-links"]',
		title: 'Exclude Links',
		content: 'URLs or patterns to exclude from AJAX navigation (admin pages, external links).',
		position: 'right'
	},
	{
		id: 'custom-css',
		route: '/advanced',
		selector: '[data-tour="custom-css"]',
		title: 'Custom CSS',
		content: 'Add your own styles to customize progress bar, spinner, and more.',
		position: 'right'
	},
	{
		id: 'loader-type',
		route: '/animations',
		selector: '[data-tour="loader-type"]',
		title: 'Loading Style',
		content: 'Choose your preferred loading indicator: progress bar or spinner.',
		position: 'right'
	},
	{
		id: 'progressbar',
		route: '/animations',
		selector: '[data-tour="progressbar"]',
		title: 'Progress Bar',
		content: 'Customize color, position, thickness, and wave animation for the progress bar.',
		position: 'right'
	},
	{
		id: 'content-animation',
		route: '/animations',
		selector: '[data-tour="content-animation"]',
		title: 'Page Transitions',
		content: 'Add smooth fade, slide, scale, or flip animations between pages.',
		position: 'right'
	},
	{
		id: 'prefetch',
		route: '/cache',
		selector: '[data-tour="prefetch-toggle"]',
		title: 'Enable Prefetch',
		content: 'Pages load instantly by prefetching content when users hover over links.',
		position: 'right'
	},
	{
		id: 'help',
		route: '/help',
		selector: '[data-tour="help-resources"]',
		title: 'Need Help?',
		content: 'Documentation, tutorials, and support are just a click away. You can restart this tour anytime from here!',
		position: 'top'
	}
];

export function getTourSteps(mode) {
	return mode === TOUR_MODES.EXTENDED ? extendedTourSteps : quickTourSteps;
}
