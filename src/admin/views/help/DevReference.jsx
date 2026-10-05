import { For, Show, createSignal } from 'solid-js';
import { devReferenceData } from '@util/help-data';

export default function DevReference() {
	const [cssOpen, setCssOpen] = createSignal(true);
	const [jsOpen, setJsOpen] = createSignal(false);

	const { cssSelectors, jsEvents } = devReferenceData;

	return (
		<div class="ap-space-y-4">
			{/* CSS Accordion */}
			<div class="ap-bg-white ap-ring-1 ap-ring-slate-200 ap-rounded-lg ap-overflow-hidden">
				<button
					onClick={() => setCssOpen(!cssOpen())}
					class="ap-w-full ap-px-5 ap-py-4 ap-flex ap-items-center ap-justify-between ap-bg-slate-50 hover:ap-bg-slate-100 ap-transition"
				>
					<div class="ap-flex ap-items-center ap-gap-3">
						<span class="ap-w-8 ap-h-8 ap-bg-indigo-100 ap-text-indigo-600 ap-rounded-lg ap-flex ap-items-center ap-justify-center ap-text-xs ap-font-bold">CSS</span>
						<div class="ap-text-left">
							<h3 class="ap-font-semibold ap-text-slate-800">CSS Selectors</h3>
							<p class="ap-text-sm ap-text-slate-500">Style TD SPA elements with custom CSS</p>
						</div>
					</div>
					<svg
						class="ap-w-5 ap-h-5 ap-text-slate-400 ap-transition-transform ap-duration-200"
						classList={{ 'ap-rotate-180': cssOpen() }}
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
					</svg>
				</button>

				<Show when={cssOpen()}>
					<div class="ap-p-5 ap-space-y-5 ap-border-t ap-border-slate-200">
						<For each={cssSelectors}>
							{(group) => (
								<div data-search-title={`${group.category} CSS`} class="ap-space-y-2">
									<h4 class="ap-font-medium ap-text-slate-700 ap-text-[11px] ap-uppercase ap-tracking-wide">{group.category}</h4>
									<div class="ap-bg-slate-50 ap-rounded-lg ap-overflow-hidden ap-ring-1 ap-ring-slate-100">
										<table class="ap-w-full ap-text-sm">
											<tbody>
												<For each={group.selectors}>
													{(selector, index) => (
														<tr classList={{ 'ap-border-t ap-border-slate-200': index() > 0 }}>
															<td class="ap-px-3 ap-py-2 ap-font-mono ap-text-xs ap-text-indigo-600 ap-whitespace-nowrap">{selector.name}</td>
															<td class="ap-px-3 ap-py-2 ap-text-sm ap-text-slate-600">{selector.description}</td>
														</tr>
													)}
												</For>
											</tbody>
										</table>
									</div>
								</div>
							)}
						</For>
					</div>
				</Show>
			</div>

			{/* JavaScript Accordion */}
			<div class="ap-bg-white ap-ring-1 ap-ring-slate-200 ap-rounded-lg ap-overflow-hidden">
				<button
					onClick={() => setJsOpen(!jsOpen())}
					class="ap-w-full ap-px-5 ap-py-4 ap-flex ap-items-center ap-justify-between ap-bg-slate-50 hover:ap-bg-slate-100 ap-transition"
				>
					<div class="ap-flex ap-items-center ap-gap-3">
						<span class="ap-w-8 ap-h-8 ap-bg-amber-100 ap-text-amber-600 ap-rounded-lg ap-flex ap-items-center ap-justify-center ap-text-xs ap-font-bold">JS</span>
						<div class="ap-text-left">
							<h3 class="ap-font-semibold ap-text-slate-800">JavaScript Events</h3>
							<p class="ap-text-sm ap-text-slate-500">Hook into TD SPA navigation lifecycle</p>
						</div>
					</div>
					<svg
						class="ap-w-5 ap-h-5 ap-text-slate-400 ap-transition-transform ap-duration-200"
						classList={{ 'ap-rotate-180': jsOpen() }}
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
					</svg>
				</button>

				<Show when={jsOpen()}>
					<div class="ap-p-5 ap-space-y-4 ap-border-t ap-border-slate-200">
						<For each={jsEvents}>
							{(event) => (
								<div data-search-title={`${event.name} Event`} class="ap-bg-slate-50 ap-ring-1 ap-ring-slate-100 ap-rounded-lg ap-overflow-hidden">
									<div class="ap-px-4 ap-py-3 ap-border-b ap-border-slate-200">
										<div class="ap-flex ap-items-center ap-justify-between ap-gap-4 ap-flex-wrap">
											<code class="ap-font-mono ap-text-sm ap-text-amber-600 ap-font-medium">{event.name}</code>
											<span class="ap-text-[10px] ap-text-slate-500 ap-bg-slate-200 ap-px-2 ap-py-0.5 ap-rounded ap-font-mono">detail: {event.detail}</span>
										</div>
										<p class="ap-text-sm ap-text-slate-600 ap-mt-1">{event.description}</p>
									</div>
									<pre class="ap-p-3 ap-text-xs ap-font-mono ap-overflow-x-auto ap-bg-slate-900 ap-text-slate-100">{event.example}</pre>
								</div>
							)}
						</For>
					</div>
				</Show>
			</div>
		</div>
	);
}
