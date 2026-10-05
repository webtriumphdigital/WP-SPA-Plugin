import { For, Show, createSignal } from 'solid-js';
import { troubleshootingData } from '@util/help-data';

export default function Troubleshooting() {
	const [openIndex, setOpenIndex] = createSignal(null);

	const { issues: categories } = troubleshootingData;

	const toggleItem = (catIndex, issueIndex) => {
		const key = `${catIndex}-${issueIndex}`;
		setOpenIndex(openIndex() === key ? null : key);
	};

	return (
		<div class="ap-space-y-6">
			{/* Troubleshooting Guide */}
			<div class="ap-space-y-1">
				<h3 class="ap-font-semibold ap-text-lg ap-text-slate-800">Common Issues & Solutions</h3>
				<p class="ap-text-sm ap-text-slate-500">Click an issue to see causes and fixes</p>
			</div>

			<For each={categories}>
				{(category, catIndex) => (
					<div class="ap-space-y-3">
						<h4 class="ap-flex ap-items-center ap-gap-2 ap-font-medium ap-text-slate-700">
							<span class="ap-text-lg">{category.icon}</span>
							{category.title}
						</h4>
						<div class="ap-space-y-2">
							<For each={category.issues}>
								{(item, issueIndex) => {
									const key = `${catIndex()}-${issueIndex()}`;
									const isOpen = () => openIndex() === key;
									return (
										<div data-search-title={item.issue} class="ap-bg-white ap-ring-1 ap-ring-slate-200 ap-rounded-lg ap-overflow-hidden">
											<button
												onClick={() => toggleItem(catIndex(), issueIndex())}
												class="ap-w-full ap-px-4 ap-py-3 ap-flex ap-items-center ap-justify-between ap-text-left hover:ap-bg-slate-50 ap-transition"
											>
												<div class="ap-flex ap-items-center ap-gap-3">
													<div class="ap-flex-shrink-0 ap-w-6 ap-h-6 ap-bg-amber-100 ap-text-amber-600 ap-rounded-full ap-flex ap-items-center ap-justify-center">
														<svg class="ap-w-3.5 ap-h-3.5" fill="currentColor" viewBox="0 0 20 20">
															<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
														</svg>
													</div>
													<span class="ap-font-medium ap-text-slate-800">{item.issue}</span>
												</div>
												<svg
													class="ap-w-5 ap-h-5 ap-text-slate-400 ap-transition-transform ap-duration-200 ap-flex-shrink-0"
													classList={{ 'ap-rotate-180': isOpen() }}
													fill="none"
													stroke="currentColor"
													stroke-width="2"
													viewBox="0 0 24 24"
												>
													<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
												</svg>
											</button>

											<Show when={isOpen()}>
												<div class="ap-px-4 ap-pb-4 ap-space-y-4 ap-border-t ap-border-slate-100">
													{/* Causes */}
													<div class="ap-pt-3">
														<h5 class="ap-text-[11px] ap-font-semibold ap-uppercase ap-tracking-wide ap-text-slate-500 ap-mb-2">Possible Causes</h5>
														<ul class="ap-space-y-1">
															<For each={item.causes}>
																{(cause) => (
																	<li class="ap-flex ap-items-start ap-gap-2 ap-text-sm ap-text-slate-600">
																		<span class="ap-text-red-400 ap-mt-1">•</span>
																		{cause}
																	</li>
																)}
															</For>
														</ul>
													</div>

													{/* Solutions */}
													<div>
														<h5 class="ap-text-[11px] ap-font-semibold ap-uppercase ap-tracking-wide ap-text-slate-500 ap-mb-2">Solutions</h5>
														<ul class="ap-space-y-2">
															<For each={item.solutions}>
																{(solution, idx) => (
																	<li class="ap-flex ap-items-start ap-gap-2 ap-text-sm ap-text-slate-600">
																		<span class="ap-flex-shrink-0 ap-w-5 ap-h-5 ap-bg-emerald-100 ap-text-emerald-600 ap-rounded-full ap-flex ap-items-center ap-justify-center ap-text-xs ap-font-medium ap-mt-0.5">
																			{idx() + 1}
																		</span>
																		<span class="ap-leading-relaxed">{solution}</span>
																	</li>
																)}
															</For>
														</ul>
													</div>
												</div>
											</Show>
										</div>
									);
								}}
							</For>
						</div>
					</div>
				)}
			</For>

			{/* Still need help */}
			<div class="ap-bg-gradient-to-r ap-from-indigo-50 ap-to-purple-50 ap-rounded-lg ap-p-5 ap-text-center ap-space-y-3">
				<div class="ap-text-2xl">💡</div>
				<h4 class="ap-font-semibold ap-text-slate-800">Still having issues?</h4>
				<p class="ap-text-sm ap-text-slate-600">
					Check browser console for errors, try disabling other plugins one by one, or contact support with details.
				</p>
			</div>
		</div>
	);
}
