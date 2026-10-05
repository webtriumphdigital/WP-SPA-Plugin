import { createSignal, createMemo, Show, For, onMount, onCleanup } from 'solid-js';
import { Portal } from 'solid-js/web';
import { Button } from '@components';
import { useLicense } from '@util/context';
import { buildSearchIndex } from '@util/help-data';
import GettingStarted from './help/GettingStarted';
import Tutorials from './help/Tutorials';
import DevReference from './help/DevReference';
import Troubleshooting from './help/Troubleshooting';
import Changelog from './help/Changelog';
import Feedback from './help/Feedback';

// Export search state for header access
export const [helpSearchOpen, setHelpSearchOpen] = createSignal(false);

export default function Help() {
	const { isLocked } = useLicense();
	const pluginVersion = window?.td_spa_admin_vars?.plugin?.version || '2.2.4';
	let searchInputRef;

	// Get initial tab from URL hash (e.g., #/help/changelog)
	const getTabFromHash = () => {
		const hash = window.location.hash;
		const match = hash.match(/#\/help\/(\w+[-\w]*)/);
		return match ? match[1] : 'getting-started';
	};

	const [activeTab, setActiveTab] = createSignal(getTabFromHash());
	const [tabTransition, setTabTransition] = createSignal(false);
	const [searchQuery, setSearchQuery] = createSignal('');
	const [selectedIndex, setSelectedIndex] = createSignal(0);

	// Search index built from centralized help data
	const searchIndex = buildSearchIndex();

	const searchResults = createMemo(() => {
		const query = searchQuery().toLowerCase().trim();
		if (query.length < 2) return [];

		return searchIndex
			.filter(item =>
				item.title.toLowerCase().includes(query) ||
				item.content.toLowerCase().includes(query)
			)
			.slice(0, 8);
	});

	// Update URL when tab changes with animation
	const changeTab = (tabId) => {
		if (tabId === activeTab()) return;
		setTabTransition(true);
		setTimeout(() => {
			setActiveTab(tabId);
			window.history.replaceState(null, '', `#/help/${tabId}`);
			setTabTransition(false);
		}, 50);
	};

	const handleSearchSelect = (item) => {
		changeTab(item.tab);
		setSearchQuery('');
		setHelpSearchOpen(false);

		// Scroll to element after tab change, then highlight after scroll completes
		setTimeout(() => {
			const el = document.querySelector(`[data-search-title="${item.title}"]`);
			if (el) {
				el.scrollIntoView({ behavior: 'smooth', block: 'center' });
				// Wait for scroll to complete before highlighting
				setTimeout(() => {
					el.classList.add('search-highlight');
					setTimeout(() => el.classList.remove('search-highlight'), 2500);
				}, 400);
			}
		}, 150);
	};

	// Listen for hash changes (browser back/forward)
	const handleHashChange = () => {
		setActiveTab(getTabFromHash());
	};

	const closeSearch = () => {
		setHelpSearchOpen(false);
		setSearchQuery('');
		setSelectedIndex(0);
	};

	// Keyboard navigation in search modal
	const handleSearchKeyDown = (e) => {
		const results = searchResults();
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			setSelectedIndex(i => Math.min(i + 1, results.length - 1));
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			setSelectedIndex(i => Math.max(i - 1, 0));
		} else if (e.key === 'Enter' && results.length > 0) {
			e.preventDefault();
			handleSearchSelect(results[selectedIndex()]);
		} else if (e.key === 'Escape') {
			closeSearch();
		}
	};

	// Global keyboard shortcut: Ctrl/Cmd + /
	const handleGlobalKeyDown = (e) => {
		if ((e.ctrlKey || e.metaKey) && e.key === '/') {
			e.preventDefault();
			setHelpSearchOpen(true);
		}
	};

	onMount(() => {
		window.addEventListener('hashchange', handleHashChange);
		document.addEventListener('keydown', handleGlobalKeyDown);
	});

	onCleanup(() => {
		window.removeEventListener('hashchange', handleHashChange);
		document.removeEventListener('keydown', handleGlobalKeyDown);
	});

	// Focus input when modal opens
	const focusInput = (el) => {
		setTimeout(() => el?.focus(), 50);
	};

	const tabs = [
		{ id: 'getting-started', label: 'Getting Started', icon: '🚀' },
		{ id: 'tutorials', label: 'Tutorials', icon: '🎬' },
		{ id: 'dev-reference', label: 'Developer', icon: '🛠️' },
		{ id: 'troubleshooting', label: 'Troubleshooting', icon: '🔧' },
		{ id: 'changelog', label: 'Changelog', icon: '📋' },
		{ id: 'feedback', label: 'Feedback', icon: '💬' }
	];

	const getTabLabel = (tabId) => tabs.find(t => t.id === tabId)?.label || tabId;

	const supportLink = () => isLocked() ? 'https://wordpress.org/support/plugin/td-spa/' : atob('aHR0cHM6Ly9hcnJheXN0b3J5LmNvbS9zdXBwb3J0');

	return (
		<section class="ap-w-full ap-space-y-6">
			{/* Tab Navigation */}
			<div class="ap-inline-flex ap-flex-wrap ap-gap-1.5 ap-p-1.5 ap-bg-slate-100 ap-rounded-lg">
				<For each={tabs}>
					{(tab) => (
						<button
							onClick={() => changeTab(tab.id)}
							class="ap-py-2 ap-px-4 ap-text-sm ap-font-medium ap-transition-all ap-duration-200 ap-rounded-md ap-flex ap-items-center ap-gap-1.5"
							classList={{
								'ap-bg-white ap-text-indigo-600 ap-shadow-sm ap-ring-1 ap-ring-slate-200': activeTab() === tab.id,
								'ap-text-slate-500 hover:ap-text-slate-700 hover:ap-bg-slate-50': activeTab() !== tab.id
							}}
						>
							<span>{tab.icon}</span>
							<span class="ap-hidden sm:ap-inline">{tab.label}</span>
						</button>
					)}
				</For>
			</div>

			{/* Search Modal */}
			<Show when={helpSearchOpen()}>
				<Portal>
					<div class="ap-fixed ap-inset-0 ap-z-[9999] ap-flex ap-items-start ap-justify-center ap-pt-[15vh]">
						{/* Backdrop */}
						<div
							class="ap-absolute ap-inset-0 ap-bg-slate-900/60 ap-backdrop-blur-sm"
							onClick={closeSearch}
						/>

						{/* Modal */}
						<div class="ap-relative ap-w-full ap-max-w-xl ap-mx-4 ap-bg-white ap-rounded-xl ap-shadow-2xl ap-ring-1 ap-ring-slate-200 ap-overflow-hidden ap-animate-pop">
							{/* Search Input */}
							<div class="ap-flex ap-items-center ap-gap-3 ap-px-4 ap-border-b ap-border-slate-200">
								<svg class="ap-w-5 ap-h-5 ap-text-slate-400 ap-flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
								</svg>
								<input
									ref={focusInput}
									type="text"
									placeholder="Search documentation..."
									value={searchQuery()}
									onInput={(e) => { setSearchQuery(e.target.value); setSelectedIndex(0); }}
									onKeyDown={handleSearchKeyDown}
									class="ap-flex-1 ap-py-4 ap-text-base ap-bg-transparent ap-outline-none ap-placeholder-slate-400 ap-border-none ap-shadow-none focus:ap-outline-none focus:ap-ring-0 focus:ap-border-none"
									style={{ 'box-shadow': 'none' }}
								/>
								<kbd class="ap-px-2 ap-py-1 ap-text-xs ap-font-medium ap-text-slate-400 ap-bg-slate-100 ap-rounded ap-border ap-border-slate-200">
									ESC
								</kbd>
							</div>

							{/* Results */}
							<div class="ap-max-h-[50vh] ap-overflow-y-auto">
								<Show when={searchQuery().length < 2}>
									<div class="ap-p-6 ap-text-center">
										<p class="ap-text-sm ap-text-slate-500">Type to search across all help topics</p>
										<div class="ap-flex ap-flex-wrap ap-gap-2 ap-justify-center ap-mt-4">
											<For each={tabs}>
												{(tab) => (
													<button
														onClick={() => handleSearchSelect({ tab: tab.id })}
														class="ap-px-3 ap-py-1.5 ap-text-sm ap-bg-slate-100 ap-text-slate-600 ap-rounded-full hover:ap-bg-slate-200 ap-transition"
													>
														{tab.icon} {tab.label}
													</button>
												)}
											</For>
										</div>
									</div>
								</Show>

								<Show when={searchQuery().length >= 2 && searchResults().length === 0}>
									<div class="ap-p-6 ap-text-center">
										<div class="ap-w-12 ap-h-12 ap-mx-auto ap-mb-3 ap-bg-slate-100 ap-rounded-full ap-flex ap-items-center ap-justify-center">
											<svg class="ap-w-6 ap-h-6 ap-text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
											</svg>
										</div>
										<p class="ap-text-sm ap-text-slate-500">No results found for "{searchQuery()}"</p>
									</div>
								</Show>

								<Show when={searchResults().length > 0}>
									<div class="ap-py-2">
										<For each={searchResults()}>
											{(item, index) => (
												<button
													onClick={() => handleSearchSelect(item)}
													class="ap-w-full ap-px-4 ap-py-3 ap-text-left ap-transition ap-flex ap-items-start ap-gap-3"
													classList={{
														'ap-bg-indigo-50': selectedIndex() === index(),
														'hover:ap-bg-slate-50': selectedIndex() !== index()
													}}
												>
													<span class="ap-text-xl ap-flex-shrink-0 ap-mt-0.5">{item.icon}</span>
													<div class="ap-flex-1 ap-min-w-0">
														<div class="ap-font-medium ap-text-slate-800">{item.title}</div>
														<div class="ap-text-sm ap-text-slate-500 ap-truncate">{item.content}</div>
													</div>
													<span class="ap-text-xs ap-text-indigo-600 ap-bg-indigo-50 ap-px-2 ap-py-1 ap-rounded-full ap-font-medium ap-flex-shrink-0">
														{getTabLabel(item.tab)}
													</span>
												</button>
											)}
										</For>
									</div>
								</Show>
							</div>

							{/* Footer */}
							<div class="ap-px-4 ap-py-3 ap-bg-slate-50 ap-border-t ap-border-slate-200 ap-flex ap-items-center ap-justify-between ap-text-xs ap-text-slate-500">
								<div class="ap-flex ap-items-center ap-gap-3">
									<span class="ap-flex ap-items-center ap-gap-1">
										<kbd class="ap-px-1.5 ap-py-0.5 ap-bg-white ap-rounded ap-border ap-border-slate-200 ap-font-mono">↑</kbd>
										<kbd class="ap-px-1.5 ap-py-0.5 ap-bg-white ap-rounded ap-border ap-border-slate-200 ap-font-mono">↓</kbd>
										navigate
									</span>
									<span class="ap-flex ap-items-center ap-gap-1">
										<kbd class="ap-px-1.5 ap-py-0.5 ap-bg-white ap-rounded ap-border ap-border-slate-200 ap-font-mono">↵</kbd>
										select
									</span>
								</div>
								<span class="ap-flex ap-items-center ap-gap-1">
									<kbd class="ap-px-1.5 ap-py-0.5 ap-bg-white ap-rounded ap-border ap-border-slate-200 ap-font-mono">{navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}</kbd>
									<kbd class="ap-px-1.5 ap-py-0.5 ap-bg-white ap-rounded ap-border ap-border-slate-200 ap-font-mono">/</kbd>
									to open
								</span>
							</div>
						</div>
					</div>
				</Portal>
			</Show>

			{/* Tab Content */}
			<div class="page-content-transition" classList={{ 'page-content-enter': tabTransition() }}>
				<Show when={activeTab() === 'getting-started'}>
					<GettingStarted version={pluginVersion} />
				</Show>

				<Show when={activeTab() === 'tutorials'}>
					<Tutorials />
				</Show>

				<Show when={activeTab() === 'dev-reference'}>
					<DevReference />
				</Show>

				<Show when={activeTab() === 'troubleshooting'}>
					<Troubleshooting />
				</Show>

				<Show when={activeTab() === 'changelog'}>
					<Changelog />
				</Show>

				<Show when={activeTab() === 'feedback'}>
					<Feedback />
				</Show>
			</div>
		</section>
	);
}
