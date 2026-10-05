import { createSignal, Show, For } from 'solid-js';
import { Button } from '@components';
import API from '@util/api';
import { feedbackData } from '@util/help-data';


export default function Feedback() {
	const currentPermission = window?.td_spa_admin_vars?.diagnostic_permission;
	const [optedIn, setOptedIn] = createSignal(currentPermission === 'allowed');
	const [saving, setSaving] = createSignal(false);

	const feedbackOptions = feedbackData.options;
	const [selectedOptions, setSelectedOptions] = createSignal([]);
	const [feedbackText, setFeedbackText] = createSignal('');
	const [sentiment, setSentiment] = createSignal('');
	const [submitting, setSubmitting] = createSignal(false);
	const [submitted, setSubmitted] = createSignal(false);
	const [showForm, setShowForm] = createSignal(false);

	// Sentiment options sent to PackEdge (happy/neutral/unhappy).
	const SENTIMENTS = [
		{ id: 'happy', icon: '😊', label: 'Good' },
		{ id: 'neutral', icon: '😐', label: 'Okay' },
		{ id: 'unhappy', icon: '😞', label: 'Bad' },
	];

	// Interactive Rate Us - mirrors the popup: 4-5 stars opens the wordpress.org
	// review form, 1-3 shows a thank-you (no redirect).
	const REVIEW_URL = 'https://wordpress.org/support/plugin/td-spa/reviews/#new-post';
	const [ratingHover, setRatingHover] = createSignal(0);
	const [ratingThanks, setRatingThanks] = createSignal(false);

	const handleRate = (value) => {
		if (value >= 4) {
			window.open(REVIEW_URL, '_blank', 'noopener');
		} else {
			setRatingThanks(true);
		}
	};

	const handleOptin = async (allowed) => {
		setSaving(true);
		try {
			await API.post('diagnostic-permission', { allowed });
			setOptedIn(allowed);
			// Reflect immediately so client-side gating (track) picks it up
			// without a reload.
			if (window?.td_spa_admin_vars) {
				window.td_spa_admin_vars.diagnostic_permission = allowed ? 'allowed' : 'denied';
			}
			if (allowed) sendDiagnosticData();
		} catch (error) {
			console.error('Failed to save diagnostic permission:', error);
		} finally {
			setSaving(false);
		}
	};

	// On opt-in, send a one-time environment snapshot to PackEdge. Marked
	// lifecycle so it sends immediately on consent (the window flag may not have
	// refreshed yet). Sheet/site content is never included.
	const sendDiagnosticData = () => {
		// Telemetry removed
	};

	const toggleOption = (optionId) => {
		setSelectedOptions(prev =>
			prev.includes(optionId) ? prev.filter(id => id !== optionId) : [...prev, optionId]
		);
	};

	const submitFeedback = async () => {
		// Feedback removed
	};

	const resetForm = () => {
		setShowForm(false);
		setSubmitted(false);
		setSelectedOptions([]);
		setFeedbackText('');
		setSentiment('');
	};

	return (
		<div class="ap-space-y-6">
			{/* Action Cards - 3 columns */}
			<div class="ap-grid ap-grid-cols-1 sm:ap-grid-cols-3 ap-gap-4">
				{/* Rate - interactive stars: 4-5 opens the review form, 1-3 thanks */}
				<div
					data-search-title="Rate TD SPA"
					class="ap-bg-white ap-rounded-xl ap-p-5 ap-ring-1 ap-ring-slate-200 ap-text-center ap-transition-all"
				>
					<div class="ap-w-12 ap-h-12 ap-mx-auto ap-mb-3 ap-bg-amber-50 ap-rounded-xl ap-flex ap-items-center ap-justify-center">
						<span class="ap-text-2xl">⭐</span>
					</div>
					<h4 class="ap-font-semibold ap-text-slate-800 ap-mb-1">Rate Us</h4>
					<Show
						when={!ratingThanks()}
						fallback={<p class="ap-text-sm ap-text-emerald-600 ap-font-medium">Thanks for your feedback! 💚</p>}
					>
						<p class="ap-text-sm ap-text-slate-500 ap-mb-2">How would you rate it?</p>
						<div class="ap-flex ap-items-center ap-justify-center ap-gap-1" onMouseLeave={() => setRatingHover(0)}>
							<For each={[1, 2, 3, 4, 5]}>
								{(i) => (
									<button
										type="button"
										aria-label={`${i} star${i > 1 ? 's' : ''}`}
										onMouseEnter={() => setRatingHover(i)}
										onClick={() => handleRate(i)}
										class={`ap-text-2xl ap-leading-none ap-transition-colors ap-cursor-pointer ${ratingHover() >= i ? 'ap-text-amber-400' : 'ap-text-slate-300'}`}
									>
										★
									</button>
								)}
							</For>
						</div>
					</Show>
				</div>

				{/* Forum */}
				<a
					href="https://wordpress.org/support/plugin/td-spa/"
					target="_blank"
					data-search-title="Support Forum"
					class="ap-bg-white ap-rounded-xl ap-p-5 ap-ring-1 ap-ring-slate-200 ap-text-center hover:ap-ring-indigo-300 hover:ap-shadow-md ap-transition-all ap-group"
				>
					<div class="ap-w-12 ap-h-12 ap-mx-auto ap-mb-3 ap-bg-blue-50 ap-rounded-xl ap-flex ap-items-center ap-justify-center group-hover:ap-scale-110 ap-transition-transform">
						<span class="ap-text-2xl">💬</span>
					</div>
					<h4 class="ap-font-semibold ap-text-slate-800 ap-mb-1">Support Forum</h4>
					<p class="ap-text-sm ap-text-slate-500">Get help from community</p>
				</a>

				{/* Feedback */}
				<button
					onClick={() => setShowForm(true)}
					data-search-title="Send Feedback"
					class="ap-bg-white ap-rounded-xl ap-p-5 ap-ring-1 ap-ring-slate-200 ap-text-center hover:ap-ring-indigo-300 hover:ap-shadow-md ap-transition-all ap-group"
				>
					<div class="ap-w-12 ap-h-12 ap-mx-auto ap-mb-3 ap-bg-indigo-50 ap-rounded-xl ap-flex ap-items-center ap-justify-center group-hover:ap-scale-110 ap-transition-transform">
						<span class="ap-text-2xl">📝</span>
					</div>
					<h4 class="ap-font-semibold ap-text-slate-800 ap-mb-1">Send Feedback</h4>
					<p class="ap-text-sm ap-text-slate-500">Share ideas or report bugs</p>
				</button>
			</div>

			{/* Inline Feedback Form */}
			<Show when={showForm()}>
				<div class="ap-bg-white ap-rounded-xl ap-ring-1 ap-ring-slate-200 ap-overflow-hidden">
					<div class="ap-p-4 ap-border-b ap-border-slate-100 ap-flex ap-items-center ap-justify-between">
						<h4 class="ap-font-semibold ap-text-slate-800">Send Feedback</h4>
						<button onClick={resetForm} class="ap-p-1.5 ap-rounded-lg hover:ap-bg-slate-100 ap-text-slate-400 hover:ap-text-slate-600 ap-transition">
							<svg class="ap-w-4 ap-h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>

					<Show when={submitted()}>
						<div class="ap-p-4 ap-bg-emerald-50 ap-flex ap-items-center ap-gap-3">
							<div class="ap-w-8 ap-h-8 ap-bg-emerald-100 ap-text-emerald-600 ap-rounded-full ap-flex ap-items-center ap-justify-center ap-flex-shrink-0">
								<svg class="ap-w-4 ap-h-4" fill="currentColor" viewBox="0 0 20 20">
									<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
								</svg>
							</div>
							<p class="ap-text-emerald-800 ap-font-medium">Thank you for your feedback!</p>
						</div>
					</Show>

					<Show when={!submitted()}>
						<div class="ap-p-4 ap-space-y-4">
							{/* Sentiment */}
							<div>
								<label class="ap-block ap-text-sm ap-font-medium ap-text-slate-700 ap-mb-2">How's your experience?</label>
								<div class="ap-flex ap-gap-2">
									<For each={SENTIMENTS}>
										{(s) => (
											<button
												type="button"
												onClick={() => setSentiment(s.id)}
												class="ap-flex ap-flex-col ap-items-center ap-gap-1 ap-px-4 ap-py-2 ap-rounded-lg ap-border ap-transition-all"
												classList={{
													'ap-border-indigo-500 ap-bg-indigo-50': sentiment() === s.id,
													'ap-border-slate-200 hover:ap-border-slate-300 hover:ap-bg-slate-50': sentiment() !== s.id,
												}}
											>
												<span class="ap-text-2xl ap-leading-none">{s.icon}</span>
												<span class="ap-text-xs ap-text-slate-600">{s.label}</span>
											</button>
										)}
									</For>
								</div>
							</div>

							{/* Category Selection (sent as tags) */}
							<div>
								<label class="ap-block ap-text-sm ap-font-medium ap-text-slate-700 ap-mb-2">Tags</label>
								<div class="ap-flex ap-flex-wrap ap-gap-2">
									<For each={feedbackOptions}>
										{(option) => (
											<button
												type="button"
												onClick={() => toggleOption(option.id)}
												class="ap-inline-flex ap-items-center ap-gap-1.5 ap-px-3 ap-py-1.5 ap-text-sm ap-font-medium ap-rounded-full ap-border ap-transition-all"
												classList={{
													'ap-border-indigo-500 ap-bg-indigo-50 ap-text-indigo-700': selectedOptions().includes(option.id),
													'ap-border-slate-200 ap-text-slate-600 hover:ap-border-slate-300 hover:ap-bg-slate-50': !selectedOptions().includes(option.id)
												}}
											>
												<span>{option.icon}</span>
												<span>{option.label}</span>
											</button>
										)}
									</For>
								</div>
							</div>

							{/* Message */}
							<div>
								<label class="ap-block ap-text-sm ap-font-medium ap-text-slate-700 ap-mb-2">Message</label>
								<textarea
									value={feedbackText()}
									onInput={(e) => setFeedbackText(e.target.value)}
									placeholder="Describe your feedback..."
									rows="3"
									class="ap-w-full ap-px-3 ap-py-2 ap-border ap-border-slate-200 ap-rounded-lg ap-text-sm ap-placeholder-slate-400 focus:ap-outline-none focus:ap-ring-2 focus:ap-ring-indigo-500 focus:ap-border-transparent ap-resize-none"
								/>
							</div>

							{/* Submit */}
							<div class="ap-flex ap-justify-end ap-gap-2">
								<Button onClick={resetForm} variant="secondary" size="sm">Cancel</Button>
								<Button
									onClick={submitFeedback}
									disabled={submitting() || (!sentiment() && selectedOptions().length === 0 && !feedbackText().trim())}
									loading={submitting()}
									size="sm"
								>
									{submitting() ? 'Sending...' : 'Send'}
								</Button>
							</div>
						</div>
					</Show>
				</div>
			</Show>

			{/* Diagnostic data sharing - persistent on/off setting */}
			<div data-search-title="Diagnostic Data Sharing" class="ap-bg-slate-50 ap-rounded-xl ap-p-5 ap-ring-1 ap-ring-slate-200">
				<div class="ap-flex ap-items-start ap-gap-4">
					<div class="ap-flex-shrink-0 ap-w-10 ap-h-10 ap-bg-indigo-100 ap-text-indigo-600 ap-rounded-lg ap-flex ap-items-center ap-justify-center">
						<svg class="ap-w-5 ap-h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
						</svg>
					</div>
					<div class="ap-flex-1">
						<h4 class="ap-font-semibold ap-text-slate-800 ap-mb-1">Share usage &amp; diagnostic data</h4>
						<p class="ap-text-sm ap-text-slate-600">
							Share which features you use plus a one-time snapshot of your site environment (WordPress/PHP versions, active theme, plugin count, locale, timezone) to help us improve TD SPA. No page content is ever sent. Basic install counts are always collected.
						</p>
						<Show when={optedIn()}>
							<p class="ap-text-xs ap-text-emerald-600 ap-mt-2 ap-font-medium">✓ Sharing is on - thanks for helping improve TD SPA.</p>
						</Show>
					</div>
					<button
						type="button"
						role="switch"
						aria-checked={optedIn()}
						disabled={saving()}
						onClick={() => handleOptin(!optedIn())}
						class={`ap-relative ap-inline-flex ap-h-6 ap-w-11 ap-flex-shrink-0 ap-items-center ap-rounded-full ap-transition-colors disabled:ap-opacity-50 ap-cursor-pointer ${optedIn() ? 'ap-bg-indigo-600' : 'ap-bg-slate-300'}`}
					>
						<span class={`ap-inline-block ap-h-4 ap-w-4 ap-transform ap-rounded-full ap-bg-white ap-shadow ap-transition-transform ${optedIn() ? 'ap-translate-x-6' : 'ap-translate-x-1'}`} />
					</button>
				</div>
			</div>
		</div>
	);
}
