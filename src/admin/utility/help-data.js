// Single source of truth for all help page content

export const gettingStartedData = {
	features: [
		{ title: 'Blazing Fast', description: 'Lightweight 14KB frontend with instant SPA navigation', icon: '🚀' },
		{ title: 'Persistent Players', description: 'Audio/video keeps playing while navigating - perfect for radio & podcast sites', icon: '🎵' },
		{ title: 'Link Prefetch', description: 'Pages load instantly by prefetching content on hover', icon: '⚡' },
		{ title: 'Smooth Transitions', description: 'Fade, slide, scale, and flip animations between pages', icon: '✨' }
	],
	quickStart: [
		{ step: 1, title: 'Enable Instant Navigation', description: 'Turn on AJAX navigation for seamless, app-like page transitions.', icon: '⚡', link: '#/' },
		{ step: 2, title: 'Setup Persistent Player', description: 'Add your audio/video player selector to Preserve Elements.', icon: '🎵', link: '#/advanced' },
		{ step: 3, title: 'Customize Animations', description: 'Style the progress bar, spinner, and page transitions.', icon: '🎨', link: '#/animations' },
		{ step: 4, title: 'Enable Prefetch', description: 'Speed up navigation with hover-based page preloading.', icon: '🔧', link: '#/cache' }
	],
	resources: [
		{ title: 'Documentation', description: 'Complete guide to all features and settings', icon: '📚', link: 'https://www.triumphdigital.co.th' },
		{ title: 'Video Tutorials', description: 'Step-by-step video guides', icon: '🎥', link: 'https://www.youtube.com/watch?v=Sq0b3PVJJfs' },
		{ title: 'Support Forum', description: 'Community help and discussions', icon: '💬', link: 'https://wordpress.org/support/plugin/td-spa/' }
	]
};

export const tutorialsData = {
	videos: [
		{ id: 'Sq0b3PVJJfs', title: 'Getting Started with TD SPA', description: 'Learn how to install and configure TD SPA in under 5 minutes', duration: '4:32', category: 'Basics' },
		{ id: 'Sq0b3PVJJfs', title: 'Setup Persistent Audio/Video Player', description: 'Keep your audio or video player playing while users browse your site', duration: '3:45', category: 'Basics' },
		{ id: 'Sq0b3PVJJfs', title: 'Customizing Page Transitions', description: 'Explore fade, slide, scale and flip animations between pages', duration: '6:15', category: 'Animations' },
		{ id: 'Sq0b3PVJJfs', title: 'Enable Instant Prefetch', description: 'Speed up navigation by preloading pages on hover', duration: '5:20', category: 'Performance' },
		{ id: 'Sq0b3PVJJfs', title: 'Progress Bar & Spinner', description: 'Customize loading indicators for better user experience', duration: '4:10', category: 'Animations' },
		{ id: 'Sq0b3PVJJfs', title: 'Troubleshooting Common Issues', description: 'Fix common problems and conflicts with other plugins', duration: '7:30', category: 'Support' }
	]
};

export const devReferenceData = {
	cssSelectors: [
		{
			category: 'Iframe Container',
			selectors: [
				{ name: '#td-spa-container', description: 'Main iframe displaying current page' },
				{ name: '#td-spa-prefetch', description: 'Hidden iframe for prefetching pages' },
				{ name: '#td-spa-persist', description: 'Container for preserved elements' }
			]
		},
		{
			category: 'Progress Bar',
			selectors: [
				{ name: '.td-spa-progressbar', description: 'The progress bar element' },
				{ name: '.progressbar-wave', description: 'Wave animation effect class' }
			]
		},
		{
			category: 'Loading Spinner',
			selectors: [
				{ name: '.td-spa-spinner', description: 'Main spinner container' },
				{ name: '.td-spa-spinner-overlay', description: 'Background overlay/backdrop' },
				{ name: '.td-spa-spinner-content', description: 'Content wrapper (icon + text)' },
				{ name: '.td-spa-spinner-image', description: 'Spinner icon/image element' },
				{ name: '.td-spa-spinner-text', description: 'Loading message text' }
			]
		},
		{
			category: 'Utility Classes',
			selectors: [
				{ name: '.td-spa-cursor-active', description: 'Applied to body during loading (cursor animation)' },
				{ name: '#td-spa-custom-css', description: 'Style tag for custom CSS injection' }
			]
		},
		{
			category: 'CSS Variables',
			selectors: [
				{ name: '--progressbar-color', description: 'Progress bar color' },
				{ name: '--animation-speed', description: 'Progress bar animation speed' }
			]
		}
	],
	jsEvents: [
		{
			name: 'td-spa:ready',
			description: 'Fired when new page is loaded and ready, after the URL and title are updated. Use this to reinitialize scripts.',
			detail: 'url, title',
			example: `document.addEventListener('td-spa:ready', (e) => {
  // Reinitialize your scripts
  initSlider();
  initLightbox();
});

// jQuery version
jQuery(document).on('td-spa:ready', function() {
  // Your code here
});`
		},
		{
			name: 'td-spa-loading',
			description: 'Fired when navigation starts (link clicked or prefetch begins)',
			detail: 'url, prefetch',
			example: `document.addEventListener('td-spa-loading', (e) => {
  console.log('Loading:', e.detail.url);
  if (e.detail.prefetch) {
    console.log('Prefetching in background');
  }
});`
		},
		{
			name: 'td-spa-complete',
			description: 'Fired when navigation is complete and page is visible',
			detail: 'url, fromPrefetch',
			example: `document.addEventListener('td-spa-complete', (e) => {
  // Track page view
  gtag('event', 'page_view', {
    page_path: window.location.pathname
  });
});`
		},
		{
			name: 'td_spa_page_view (dataLayer)',
			description: 'Pushed to window.dataLayer once per navigation, after the URL and title are committed. Includes measured engagement time for the previous page so GA4 engagement metrics keep working. Use a GTM Custom Event trigger named td_spa_page_view.',
			detail: 'page_location, page_title, engagement_time_msec',
			example: `// GTM setup:
// 1. Trigger: Custom Event "td_spa_page_view"
// 2. Data Layer variables: page_location,
//    page_title, engagement_time_msec
// 3. GA4 Event tag: event name "page_view"
//    sending all three parameters
// 4. Disable GA4 Enhanced Measurement
//    "history events" to avoid double counts`
		}
	]
};

export const troubleshootingData = {
	settingsReference: [
		{
			tab: 'Basic', link: '#/', icon: '🧭',
			settings: [
				{ name: 'Instant Navigation', desc: 'Enable instant SPA navigation' },
				{ name: 'Disable on Mobile', desc: 'Turn off AJAX for mobile devices' },
				{ name: 'Disable for Logged-in Users', desc: 'Standard navigation for admins' },
				{ name: 'Scroll to Top', desc: 'Auto-scroll after page loads' }
			]
		},
		{
			tab: 'Advanced', link: '#/advanced', icon: '🛠️',
			settings: [
				{ name: 'Preserve Elements', desc: 'Keep elements during navigation (audio, video)' },
				{ name: 'Exclude Links', desc: 'URLs/patterns to load normally' },
				{ name: 'Custom CSS', desc: 'Add your own styles for TD SPA elements' },
				{ name: 'Backup/Restore', desc: 'Export and import settings' }
			]
		},
		{
			tab: 'Animations', link: '#/animations', icon: '✨',
			settings: [
				{ name: 'Loader Type', desc: 'Choose progress bar or spinner' },
				{ name: 'Progress Bar', desc: 'Customizable loading bar at top/bottom' },
				{ name: 'Spinner', desc: 'Custom loading spinner overlay' },
				{ name: 'Content Animation', desc: 'Fade, slide, flip, or scale transitions' },
				{ name: 'Cursor Animation', desc: 'Change cursor while loading' }
			]
		},
		{
			tab: 'Cache', link: '#/cache', icon: '⚡',
			settings: [
				{ name: 'Enable Prefetch', desc: 'Preload pages on hover for instant loading' },
				{ name: 'Cache Strategy', desc: 'Configure prefetch caching behavior' }
			]
		}
	],
	issues: [
		{
			title: 'Navigation Issues', icon: '🧭',
			issues: [
				{
					issue: 'Pages not loading with AJAX',
					causes: ['AJAX navigation is disabled in settings', 'JavaScript errors on the page', 'Missing wp_head() or wp_footer() in theme'],
					solutions: ['Go to Basic tab and ensure "Instant Navigation" is turned on', 'Open browser console (F12) and check for JavaScript errors', 'Verify your theme has proper wp_head() in header.php and wp_footer() before </body>', 'Try disabling other plugins to identify conflicts']
				},
				{
					issue: 'Browser back/forward button not working',
					causes: ['History API conflict with other scripts', 'Outdated plugin version'],
					solutions: ['Update TD SPA to the latest version', 'Check for JavaScript errors in console', 'Disable browser extensions that modify history']
				},
				{
					issue: 'Links opening in new tab instead of AJAX loading',
					causes: ['Links have target="_blank" attribute', 'Links are external (different domain)', 'Links match exclusion rules'],
					solutions: ['This is expected behavior for external links and new tab links', 'Check your exclusion rules in the Advanced tab', 'Remove target="_blank" if you want AJAX loading']
				},
				{
					issue: 'Page scrolls to wrong position after navigation',
					causes: ['Scroll to Top is disabled', 'Scroll restoration conflict', 'Lazy-loaded images changing page height'],
					solutions: ['Enable "Scroll to Top" in the Basic tab', 'Ensure images have proper width/height attributes', 'Use Custom CSS in Advanced tab to adjust scroll behavior if needed']
				}
			]
		},
		{
			title: 'Animation Problems', icon: '✨',
			issues: [
				{
					issue: 'Animations not working',
					causes: ['No animation selected', 'Browser cache serving old files', 'CSS conflicts with theme'],
					solutions: ['Select an animation style in the Animations tab', 'Clear browser cache and WordPress cache plugins', 'Check if your OS has reduced motion enabled', 'Try a different animation to rule out CSS conflicts']
				},
				{
					issue: 'Progress bar not visible',
					causes: ['Progress bar is disabled', 'Color blends with background', 'Z-index too low'],
					solutions: ['Enable progress bar in the Animations tab', 'Change progress bar color to contrast with your site header', 'Add custom CSS: .td-spa-progressbar { z-index: 999999 !important; }']
				},
				{
					issue: 'Content flickers during page transition',
					causes: ['Animation duration too short', 'Missing animation styles', 'Iframe transition timing'],
					solutions: ['Increase animation duration in Animations tab', 'Try the "Fade" animation which is smoothest', 'Enable prefetch in Cache tab for instant transitions']
				},
				{
					issue: 'Spinner appears but content never loads',
					causes: ['Network request failing', 'Server timeout', 'Iframe blocked by CSP'],
					solutions: ['Check browser Network tab for failed requests', 'Verify your server isn\'t blocking iframe requests', 'Check Content Security Policy headers']
				}
			]
		},
		{
			title: 'Persistent Player Issues', icon: '🎵',
			issues: [
				{
					issue: 'Audio/video stops when navigating to another page',
					causes: ['Player element not added to Preserve Elements', 'Wrong CSS selector for the player', 'Player is inside the iframe content'],
					solutions: ['Go to Advanced tab and add your player\'s CSS selector to "Preserve Elements"', 'Use browser DevTools to find the correct selector (e.g., #my-player, .audio-player)', 'Common selectors: audio, video, .mejs-container, .wp-audio-shortcode', 'Ensure player element exists in the parent page, not inside iframe']
				},
				{
					issue: 'Player preserved but appears in wrong position',
					causes: ['Player element moves during navigation', 'CSS positioning affected by page change'],
					solutions: ['Ensure your player has fixed or sticky positioning in CSS', 'Place your player in a consistent location (header/footer) across all pages', 'Use Custom CSS in Advanced tab to ensure consistent positioning']
				},
				{
					issue: 'Multiple players - only one stays persistent',
					causes: ['Selector only matches one player', 'Multiple players with same ID'],
					solutions: ['Use a class selector that matches all players (e.g., .audio-player)', 'Ensure each player has a unique ID if using ID selectors', 'Add multiple selectors separated by commas: #player1, #player2']
				},
				{
					issue: 'Player controls stop working after navigation',
					causes: ['JavaScript event listeners lost', 'Player library not reinitialized'],
					solutions: ['Preserved elements keep their state - controls should work', 'If issues persist, reinitialize in td-spa:ready event', 'Some players may need: document.addEventListener(\'td-spa:ready\', () => player.refresh());']
				}
			]
		},
		{
			title: 'Plugin Conflicts', icon: '🔌',
			issues: [
				{
					issue: 'Conflicts with page builders (Elementor, etc.)',
					causes: ['Page builder scripts not reinitializing', 'Dynamic content not loading'],
					solutions: ['Add page builder edit pages to exclusion rules in Advanced tab', 'Exclude admin-bar links from AJAX', 'Listen to td-spa:ready event: window.elementorFrontend?.init();']
				},
				{
					issue: 'Slider/carousel not working after navigation',
					causes: ['Slider library not reinitialized', 'DOM elements replaced during navigation'],
					solutions: ['Reinitialize slider in td-spa:ready event', 'Example for Swiper: document.addEventListener(\'td-spa:ready\', () => new Swiper(\'.swiper\'));', 'Check slider documentation for refresh/destroy methods']
				},
				{
					issue: 'Google Analytics (GA4) not tracking AJAX pages, or engagement time reads zero',
					causes: ['Page views not sent for iframe navigation', 'GA4\'s built-in engagement timer stops once the user interacts inside the navigation frame', 'GA4 Enhanced Measurement "history change" fires with stale titles'],
					solutions: ['Use the td_spa_page_view dataLayer event - it fires once per navigation with page_location, page_title, and a measured engagement_time_msec', 'In GTM: create a Custom Event trigger for "td_spa_page_view", three Data Layer variables (page_location, page_title, engagement_time_msec), and a GA4 Event tag named page_view sending all three parameters', 'Turn OFF "Page changes based on browser history events" in GA4 Enhanced Measurement so views are not double-counted', 'Without GTM: document.addEventListener(\'td-spa:ready\', e => gtag(\'event\', \'page_view\', { page_location: e.detail.url, page_title: e.detail.title }));']
				},
				{
					issue: 'Lazy loading images not working',
					causes: ['Lazy load library not detecting new content'],
					solutions: ['Reinitialize lazy loading after content update', 'For native lazy loading (loading="lazy"), no action needed', 'For libraries, call their refresh method in td-spa:ready']
				}
			]
		},
		{
			title: 'Performance Issues', icon: '⚡',
			issues: [
				{
					issue: 'Navigation slower than expected',
					causes: ['Prefetch disabled', 'Server response time', 'Large page content'],
					solutions: ['Enable "Prefetch" in the Cache tab for instant navigation', 'Optimize server response time', 'Enable caching on your server']
				},
				{
					issue: 'Memory usage increasing over time',
					causes: ['Event listeners not cleaned up', 'Iframes accumulating'],
					solutions: ['This is usually handled automatically', 'Check for plugins adding global event listeners', 'Refresh page periodically if browsing many pages']
				},
				{
					issue: 'Prefetch using too much bandwidth',
					causes: ['Prefetching on every hover'],
					solutions: ['Disable prefetch in Cache tab if bandwidth is a concern', 'Prefetch only triggers on hover with debouncing, impact is minimal']
				}
			]
		}
	]
};

export const changelogData = {
	releases: [
		{
			version: '2.4.0', date: '2026-07-24', highlight: 'Cloudflare Cache Overhaul & Ajax Login',
			changes: [
				'New: Connect to Cloudflare in one click with OAuth - no API token to create or paste (where available for your account; pasting a token still works everywhere)',
				'New: "Don\'t cache this page" toggle in the editor (classic and block), for pages that should always be served fresh',
				'New: Dynamic pages are excluded from edge caching automatically - WooCommerce cart, checkout and account, add-to-cart links, and anything that sets cookies or uses nonces',
				'New: Cache health readout showing how many sampled pages are served from the edge, and a Pause switch to stop edge caching instantly without disconnecting',
				'New: Configurable edge cache lifetime and exclude-URL list in the Cache settings',
				'Improved: Edge page caching now reliably caches HTML and applies setting changes at the edge without redeploying the Cloudflare worker',
				'New: Logging in and registering now work over ajax with no page refresh, including the WooCommerce My Account forms. A failed login shows its error in place',
				'New: The WordPress login screen (wp-login.php) is now part of the SPA. It was previously the one screen TD SPA never ran on. If a login sends you outside the SPA, such as the dashboard, TD SPA hands over to a normal page load',
				'New: Full Page Reload on Login & Registration setting, off by default, for sign-in flows that need a real page load',
				'Fixed: The clicked button\'s value was dropped from intercepted form submissions. WooCommerce relies on it to know a login was submitted, and this also affected contact forms, search filters, and admin save buttons',
				'Fixed: Forms containing a field named action, method, submit, or target broke form handling entirely. Nearly every WordPress admin form uses this pattern, as does any plugin form posting to admin-ajax.php',
				'Fixed: Forms whose own JavaScript submits them, such as the classic WooCommerce checkout and most contact form plugins, could be submitted twice',
				'Fixed: On a freshly loaded or reloaded page, submitting a form could reload the whole page instead of submitting over ajax, while the same form worked after navigating to the page',
				'Fixed: WooCommerce notices were missing after a form submission, so failed logins showed no error',
				'Fixed: A persistent player kept playing on pages that do not include one. Player continuity now follows the page: added when a page has one, kept when the next page has the same one, removed when the next page has none',
				'Fixed: A persistent audio or video player could carry over from the frontend into the dashboard and keep playing there. Moving between the two is always a normal page load',
				'Fixed: Several admin dashboard screens did not save correctly with SPA for Admin Dashboard enabled',
				'Changed: On WordPress 7.0 and newer the settings screen recommends leaving SPA for Admin Dashboard off, since WordPress now navigates the dashboard itself',
			]
		},
		{
			version: '2.3.4', date: '2026-06-28', highlight: 'Block Theme Back Button',
			changes: [
				'Fixed: On block themes (e.g. Twenty Twenty-Five), the browser back button could trigger a full page reload that reset persistent players. TD SPA now switches off WordPress\'s built-in block navigation scripts that competed with its own SPA navigation',
			]
		},
		{
			version: '2.3.3', date: '2026-06-13', highlight: 'Cloudflare Cache & GA4',
			changes: [
				'New: Cloudflare cache integration - purge and manage Cloudflare edge cache directly from the TD SPA settings panel',
				'New: td_spa_page_view dataLayer event for Google Analytics 4 / Tag Manager, with page_location, page_title, and a measured engagement_time_msec, restoring GA4 Average engagement time on SPA sites',
				'New: td-spa-loading and td-spa-complete navigation events',
				'Fixed: Duplicate browser-history entries - each navigation adds exactly one entry and the back button no longer traps visitors in a loop',
				'Fixed: Back/forward navigation that hits a server redirect no longer creates unwanted forward entries',
				'Fixed: The td-spa:ready event now fires after the URL and title are updated so analytics read the correct page',
				'Fixed: Ctrl/Cmd+click and Shift+click on links open a new tab or window instead of navigating in place',
				'Fixed: target="_blank" is matched case-insensitively and a site-wide <base target> is honored',
				'Fixed: Links with a download attribute are no longer intercepted by SPA navigation',
				'Fixed: No more doubled audio with persistent players - the previous page is unloaded after navigation and the hidden original copy is removed once lifted',
				'Fixed: Premium settings are no longer erased when a license check fails or the plugin is re-activated',
				'Fixed: A temporary license-server outage no longer deactivates your license',
				'Security: The license key is no longer printed in the public page source',
			]
		},
		{
			version: '2.3.2', date: '2026-06-07', highlight: 'Licensing & Feedback',
			changes: [
				'New: Rebuilt licensing and activation - faster, more reliable license validation and a smoother activation flow',
				'New: Send feedback directly from the Help page, with a quick happy / neutral / unhappy rating',
				'New: Rating prompt to share your experience, plus a one-click way to leave a review',
				'New: Optional diagnostic sharing (only with your consent) so we can reproduce and fix issues faster',
				'Improved: Deactivation now asks for a quick, optional reason to help us improve the plugin',
				'Update: Minimum required PHP is now 7.4 (PHP 5.6-7.3 are end-of-life)',
				'Update: Tested up to WordPress 7.0',
			]
		},
		{
			version: '2.3.1', date: '2026-01-30', highlight: 'SEO & Meta Sync',
			changes: [
				'Fixed: JSON-LD structured data (Yoast, Rank Math, SEOPress) is replaced cleanly on every navigation, resolving duplicated BreadcrumbList and "Missing field" errors in Google Search Console',
				'Fixed: Canonical, OpenGraph, and Twitter Card meta tags sync on every nav so social previews and search engines see the viewed page',
				'Fixed: Iframe sub-document flagged noindex,nofollow so crawlers do not double-index the same URL',
				'Fixed: External links with target="_blank" open in a new tab instead of replacing the current page',
				'Fixed: Persistent player no longer briefly duplicates on Mobile Safari during scroll-and-hold gestures',
				'Fixed: Persistent elements with sticky child widgets (Elementor) are properly hidden in the iframe source',
				'New: Persistent media (audio, video, radio widgets) is lifted into the parent shell and keeps playing without reload across all navigation',
				'New: td-spa:ready event for re-initializing external scripts after AJAX navigation',
			]
		},
		{
			version: '2.3.0', date: '2025-01-23', highlight: 'Next-Gen Navigation Engine',
			changes: [
				'New: Completely rebuilt navigation engine - fixes all script conflicts and compatibility issues',
				'New: Background prefetch with instant page swap on hover',
				'New: Smooth crossfade transitions between pages using Web Animations API',
				'New: Support for fade, slide, scale, and flip page animations',
				'New: Persistent elements survive navigation (audio, video, widgets)',
				'New: Custom CSS injection and ignore link patterns',
				'Fixed: Scripts not reinitializing after navigation (sliders, animations, widgets)',
				'Fixed: Third-party plugin conflicts (Elementor, WooCommerce, page builders)',
				'Fixed: Form submission issues and broken event listeners',
				'Improved: Simplified admin panel with 4 main tabs: Basic, Advanced, Animations, Cache',
				'Improved: Progress bar with wave animation effect',
				'Improved: Spinner with configurable layout and positioning',
			]
		},
		{
			version: '2.2.5', date: '2025-01-08', highlight: 'Stability & Fixes',
			changes: [
				'Fixed: Modal not reopening after first use (event listener memory leak)',
				'Fixed: Sliders and countdown timers freezing (timer cleanup now preserves third-party timers)',
				'Fixed: Forms, comments, search, and accessibility features breaking after AJAX navigation',
				'Fixed: Search forms not responding on first click after page change',
				'Fixed: CSS breaking on theme pages (expanded protection patterns)',
				'Fixed: Back button issues with hash URLs',
				'Improved: Same-page links now properly AJAX reload',
				'Improved: Prevent Reloads feature uses AJAX reload and only prompts when inputs are modified',
				'Improved: Prefetch properly cancels when mouse leaves link',
			]
		},
		{
			version: '2.2.4', date: '2025-01-07', highlight: 'UI Improvements',
			changes: [
				'Improved: Redesigned preview panel with realistic website mockup',
				'Improved: Simplified Help page - cleaner Getting Started and Troubleshooting sections',
				'Improved: Help search now scrolls to and highlights the selected result',
				'Fixed: Desktop/mobile toggle now works correctly in preview panel',
				'Update: Renamed "Appearance" section to "Customization"',
			]
		},
		{
			version: '2.2.3', date: '2025-12-16', highlight: 'Persistent Players',
			changes: [
				'New: Preserve Elements - keep specific DOM elements intact during navigation (audio, video, iframes, widgets)',
				'New: Persistent Player Support - audio/video players continue playing uninterrupted across page navigation',
				'New: Perfect for radio stations, podcast sites, and music portfolios',
				'Improved: Documentation with troubleshooting FAQs and onboarding guidance'
			]
		},
		{
			version: '2.2.2', date: '2025-12-15', highlight: '',
			changes: [
				'New: Tour guide for features - interactive walkthrough to help users discover and learn about plugin features',
				'New: Help page search - quickly find documentation, troubleshooting guides, and settings with Ctrl/Cmd + /',
				'Improved: Enhanced script re-execution logic for better compatibility',
				'Improved: Added cleanups of previous timer and interval of scripts to prevent memory leaks',
				'Improved: Added mutation observer for better DOM change detection',
				'Improved: Updated admin panel UI to make it cleaner and more polished',
				'Fixed: Other minor issues and improvements'
			]
		},
		{
			version: '2.2.1', date: '2025-12-10', highlight: 'Compatibility Update',
			changes: [
				'New: Script Re-execution - automatically re-runs JavaScript after AJAX navigation for sliders, animations, and dynamic content',
				'New: Exclude Scripts - exclude specific scripts from re-execution by URL or regex pattern (Pro)',
				'Improved: Script re-execution logic for maximum compatibility with third-party plugins',
				'Improved: Now compatible with popular sliders (MetaSlider, Revolution Slider), Elementor widgets, and block editors',
				'Improved: Localized script detection for theme and plugin configurations (OceanWP, Elementor, WooCommerce)',
				'Fixed: Back/forward browser navigation with script re-execution enabled',
				'Fixed: Event listener cleanup prevents memory leaks and duplicate handlers'
			]
		},
		{
			version: '2.2.0', date: '2025-12-05', highlight: 'Major Release',
			changes: [
				'Complete UI redesign with modern, professional interface using SolidJS and Tailwind CSS',
				'Migrated from VueJS to SolidJS for significantly better performance and reactivity',
				'Reduced plugin size from 2MB+ to just 250KB - the lightest AJAX plugin ever!',
				'Rebuilt entire codebase from scratch with high-engineering architecture for scalability',
				'New: Link Prefetch - fetches page content on hover before user clicks for instant loading',
				'New: Disable on Mobile - option to disable AJAX navigation on phones and tablets',
				'New: Disable for Logged-in Users - standard WordPress behavior for admins/editors',
				'New: Form Mode Selection - choose between all forms or selective AJAX submission',
				'New: Form Exclusion/Inclusion - fine-grained control over which forms use AJAX',
				'New: Predefined Spinner Icons - beautiful loading icons with improved control UX',
				'New: Custom CSS field - add your own styles for progress bar, spinner, and modal',
				'New: Execute Script Before Loading - run JavaScript when navigation starts',
				'New: Execute Script When Loading Started - run code during AJAX fetch',
				'New: Execute Script After Loaded - reinitialize scripts after content loads',
				'New: Respect Reduced Motion Preference - accessibility for motion-sensitive users',
				'New: Enhanced Focus Indicators - better keyboard navigation visibility',
				'New: Screen Reader Announcements - audio feedback for blind users during navigation',
				'Improved: Content animations with smoother transitions and better timing',
				'Improved: Progress bar with wave animation and customizable appearance',
				'Improved: Spinner overlay with flexible layout options (icon position, gap, opacity)',
				'Fixed: All content animation issues for seamless page transitions'
			]
		},
		{
			version: '2.1.1', date: '2025-11-08',
			changes: [
				'New: Added translation support (.pot file)',
				'Improved: Caching and CDN compatibility',
				'Improved: Page transition engine for better performance',
				'Fixed: Styles breaking after page loaded via AJAX',
				'Fixed: Some scripts not executing after page loaded'
			]
		},
		{
			version: '2.1.0', date: '2025-10-15',
			changes: [
				'Fixed: JS conflicts with dynamic content',
				'Improved: Compatibility with Elementor and page builders',
				'Improved: Browser history and scroll restoration'
			]
		},
		{
			version: '2.0.0', date: '2025-09-01',
			changes: [
				'New: Major rewrite with new architecture for ultra-fast AJAX navigation',
				'New: Progress bar, cursor animation, and page transitions'
			]
		}
	]
};

export const feedbackData = {
	options: [
		{ id: 'feature_request', label: 'Feature', icon: '💡' },
		{ id: 'bug_report', label: 'Bug', icon: '🐛' },
		{ id: 'performance', label: 'Performance', icon: '⚡' },
		{ id: 'ui_ux', label: 'UI/UX', icon: '🎨' },
		{ id: 'documentation', label: 'Docs', icon: '📚' },
		{ id: 'other', label: 'Other', icon: '💬' }
	]
};

// Build search index from all data sources
export const buildSearchIndex = () => {
	const index = [];

	// Getting Started
	gettingStartedData.features.forEach(f => {
		index.push({ tab: 'getting-started', title: f.title, content: f.description, icon: '🚀' });
	});
	gettingStartedData.quickStart.forEach(q => {
		index.push({ tab: 'getting-started', title: q.title, content: q.description, icon: '🚀' });
	});
	gettingStartedData.resources.forEach(r => {
		index.push({ tab: 'getting-started', title: r.title, content: r.description, icon: '🚀' });
	});
	index.push({ tab: 'getting-started', title: 'Take the Tour', content: 'Interactive walkthrough tutorial quick tour extended tour learn basics', icon: '🚀' });
	index.push({ tab: 'getting-started', title: 'Persistent Player Setup', content: 'Keep audio video player playing music podcast radio streaming preserve elements selector continuous playback uninterrupted Advanced tab', icon: '🎵' });
	index.push({ tab: 'getting-started', title: 'Prefetch Setup', content: 'Enable prefetch preload pages hover instant navigation Cache tab performance', icon: '⚡' });

	// Tutorials
	tutorialsData.videos.forEach(v => {
		index.push({ tab: 'tutorials', title: v.title, content: `${v.description} ${v.category}`, icon: '🎬' });
	});

	// Developer Reference - CSS
	devReferenceData.cssSelectors.forEach(group => {
		const selectors = group.selectors.map(s => s.name).join(' ');
		const descriptions = group.selectors.map(s => s.description).join(' ');
		index.push({ tab: 'dev-reference', title: `${group.category} CSS`, content: `${selectors} ${descriptions}`, icon: '🛠️' });
	});
	// Developer Reference - JS Events
	devReferenceData.jsEvents.forEach(e => {
		index.push({ tab: 'dev-reference', title: `${e.name} Event`, content: `${e.description} ${e.detail}`, icon: '🛠️' });
	});

	// Troubleshooting - Settings
	troubleshootingData.settingsReference.forEach(section => {
		const settings = section.settings.map(s => `${s.name} ${s.desc}`).join(' ');
		index.push({ tab: 'troubleshooting', title: `${section.tab} Settings`, content: settings, icon: '🔧' });
	});
	// Troubleshooting - Issues
	troubleshootingData.issues.forEach(category => {
		category.issues.forEach(item => {
			const content = [...item.causes, ...item.solutions].join(' ');
			index.push({ tab: 'troubleshooting', title: item.issue, content, icon: '🔧' });
		});
	});

	// Changelog
	changelogData.releases.forEach(r => {
		index.push({ tab: 'changelog', title: `Version ${r.version}`, content: `${r.highlight || ''} ${r.changes.join(' ')}`, icon: '📋' });
	});

	// Feedback
	index.push({ tab: 'feedback', title: 'Rate TD SPA', content: 'Leave a 5-star review WordPress.org rating stars', icon: '💬' });
	index.push({ tab: 'feedback', title: 'Support Forum', content: 'Get help from community WordPress support questions answers', icon: '💬' });
	index.push({ tab: 'feedback', title: 'Send Feedback', content: 'Feature request bug report performance UI/UX documentation suggestions', icon: '💬' });
	index.push({ tab: 'feedback', title: 'Diagnostic Data', content: 'Help improve TD SPA anonymous data WP version theme active plugins', icon: '💬' });

	return index;
};
