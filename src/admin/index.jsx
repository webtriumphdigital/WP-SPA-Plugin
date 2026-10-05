import { render } from 'solid-js/web';
import { HashRouter, Route } from '@solidjs/router';
import { AppProvider } from '@util/context';
import { routes } from '@util/routes';
import Layout from '@/Layout';

import './styles.css';


const Image = (name = '') => {
	const baseUrl = window?.td_spa_admin_vars?.plugin?.url || '';
	return baseUrl + 'public/images/' + name;
};

window.tdSpaImage = Image;

// Prevent SolidJS router from intercepting external navigation links
document.addEventListener('click', (e) => {
	// If click is inside TD SPA app, let router handle it
	if (e.target.closest('#td-spa-app')) return;

	const link = e.target.closest('a');
	if (!link) return; // Non-link clicks pass through

	const href = link.getAttribute('href');

	// Only stop propagation for real navigation links (not JS-handled links like menu toggles)
	// JS-handled links typically have href="#", "javascript:", or no href
	if (href && href !== '#' && !href.startsWith('#') && !href.startsWith('javascript:')) {
		e.stopImmediatePropagation();
	}
}, true); // Capture phase - runs first

const App = () => {
	return (
		<HashRouter root={(props) => (
			<AppProvider>
				<Layout>{props.children}</Layout>
			</AppProvider>
		)}>
			{routes.map((route) => (
				<Route path={route.path} component={route.component} />
			))}
		</HashRouter>
	);
};

document.addEventListener('DOMContentLoaded', () => {
	const root = document.getElementById('td-spa-app');
	if (root) {
		render(() => <App />, root);
	}
});
