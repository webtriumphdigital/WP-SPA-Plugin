import { lazy } from 'solid-js';

export const routes = [
	{
		path: '/',
		name: 'basic',
		meta: {
			title: 'Basic',
			icon: 'navigation',
			pageTitle: 'Basic - Essential settings to get started',
		},
		component: lazy(() => import('@/Basic.jsx')),
	},
	{
		path: '/advanced',
		name: 'advanced',
		meta: {
			title: 'Advanced',
			icon: 'advanced',
			pageTitle: 'Advanced - Exclusions, custom CSS, and tools',
		},
		component: lazy(() => import('@/Advanced.jsx')),
	},
	{
		path: '/animations',
		name: 'animations',
		meta: {
			title: 'Animations',
			icon: 'content',
			pageTitle: 'Animations - Loader and transition settings',
		},
		component: lazy(() => import('@/Animations.jsx')),
	},
	{
		path: '/cache',
		name: 'cache',
		meta: {
			title: 'Cache',
			icon: 'cache',
			pageTitle: 'Super Cache by Cloudflare - your pages in under 10ms, anywhere in the world',
			badge: 'New',
		},
		component: lazy(() => import('@/Cache.jsx')),
	},

	{
		path: '/help',
		name: 'help',
		meta: {
			title: 'Help',
			icon: 'help',
			pageTitle: 'Help - Documentation, tutorials, and support',
		},
		component: lazy(() => import('@/Help.jsx')),
	},
	{
		path: '/help/:tab',
		name: 'help-tab',
		meta: {
			title: 'Help',
			icon: 'help',
			pageTitle: 'Help - Documentation, tutorials, and support',
			hidden: true,
		},
		component: lazy(() => import('@/Help.jsx')),
	},
	{
		path: '*',
		name: 'not-found',
		meta: {
			title: 'Page Not Found',
			hidden: true,
		},
		component: lazy(() => import('@/NotFound.jsx')),
	},
];

export const navigationIcons = {
	navigation:
		'M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5M5.625 6.75h.008v.008H5.625V6.75zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0zm-.375 5.25h.008v.008H5.625v-.008zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0zm-.375 5.25h.008v.008H5.625v-.008zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0z',
	cache:
		'M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125',
	content:
		'M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z',
	advanced:
		'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.355-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281Z',
	license:
		'M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z',
	help:
		'M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z',
};
