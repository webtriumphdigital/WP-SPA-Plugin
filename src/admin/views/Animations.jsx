import { createSignal, Show, createEffect, on, onMount, onCleanup } from 'solid-js';
import { Switch, Label, SegmentedControl, Spin, Select } from '@components';
import { useSettings, useLicense } from '@util/context';
import Preview from './Preview';
import ProgressBar from './pages/ProgressBar';
import Spinner from './pages/Spinner';

export default function Animations() {
	const { settings, state, setState, state: settingsState } = useSettings();
	const { isLocked, shakePromo } = useLicense();
	const [showMobilePreview, setShowMobilePreview] = createSignal(false);

	// Sync loader_type with individual enable settings
	createEffect(on(
		() => settings.loader_type,
		(type) => {
			settings.progressbar = type === 'progressbar';
			settings.loader = type === 'spinner';
		},
		{ defer: true }
	));

	const loaderTypes = [
		{ value: 'progressbar', label: 'Progress Bar', icon: 'M2 12h6m4 0h10M2 12a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v0a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v0z' },
		{ value: 'spinner', label: 'Spinner', icon: 'M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364-1.414 1.414M7.05 16.95l-1.414 1.414m12.728 0-1.414-1.414M7.05 7.05 5.636 5.636' },
		{ value: 'none', label: 'None', icon: 'M6 18L18 6M6 6l12 12' }
	];

	// Content animation state
	const animations = ['fade', 'slide', 'flip', 'scale'];
	const [previewAnimation, setPreviewAnimation] = createSignal(settings.content_animation_name || 'fade');
	const [isSelectOpen, setIsSelectOpen] = createSignal(false);
	const [openUpward, setOpenUpward] = createSignal(false);

	const durationOptions = [
		{ value: '0.2', label: 'Fast' },
		{ value: '0.3', label: 'Normal' },
		{ value: '0.5', label: 'Slow' }
	];

	let animatingTimeout;
	let selectContainerRef;

	const animate_content = () => {
		clearTimeout(animatingTimeout);
		setState('content_animation', '');

		requestAnimationFrame(() => {
			const animToUse = previewAnimation();
			setState('content_animation', animToUse);

			const duration = Number(settings.content_animation_duration || 0.3);
			animatingTimeout = setTimeout(() => {
				setState('content_animation', '');
			}, duration * 1000);
		});
	};

	const handleAnimationSelect = (value) => {
		setPreviewAnimation(value);
		animate_content();

		if (isLocked() && value !== 'fade') {
			shakePromo();
		} else {
			settings.content_animation_name = value;
		}
		setIsSelectOpen(false);
	};

	const handleClickOutside = (e) => {
		if (selectContainerRef && !selectContainerRef.contains(e.target)) {
			setIsSelectOpen(false);
		}
	};

	const checkPosition = () => {
		if (!selectContainerRef) return;
		const rect = selectContainerRef.getBoundingClientRect();
		const viewportHeight = window.innerHeight;
		const spaceBelow = viewportHeight - rect.bottom;
		const spaceAbove = rect.top;
		const dropdownHeight = 288;
		setOpenUpward(spaceBelow < dropdownHeight && spaceAbove > spaceBelow);
	};

	createEffect(() => {
		if (isLocked() && settings.content_animation_name && settings.content_animation_name !== 'fade') {
			if (settingsState.saving || previewAnimation() === settings.content_animation_name) {
				settings.content_animation_name = 'fade';
				if (settingsState.saving) {
					setPreviewAnimation('fade');
				}
			}
		}
	});

	createEffect(() => {
		const savedAnim = settings.content_animation_name || 'fade';
		if (!settingsState.saving && (!isLocked() || savedAnim === 'fade' || previewAnimation() === savedAnim)) {
			if (!isLocked() || savedAnim === 'fade' || previewAnimation() === savedAnim) {
				setPreviewAnimation(savedAnim);
			}
		}
	});

	onMount(() => {
		document.addEventListener('click', handleClickOutside);
	});

	onCleanup(() => {
		document.removeEventListener('click', handleClickOutside);
	});

	return (
		<section class="ap-flex ap-flex-col min-[1080px]:ap-flex-row ap-gap-6 sm:ap-gap-10 ap-justify-between">
			<div class="ap-flex-1 ap-min-w-0 ap-space-y-8">
				{/* Loader Section */}
				<div class="ap-space-y-6">
					<h3 class="ap-text-lg ap-font-semibold ap-text-slate-900">Loader</h3>

					{/* Loader Type Selector */}
					<div data-tour="loader-type" class="ap-bg-white ap-border ap-border-slate-200 ap-rounded-lg ap-p-6 ap-space-y-3">
						<Label>Select Loader</Label>
						<div class="ap-flex ap-flex-wrap ap-justify-start ap-gap-3">
							{loaderTypes.map((type) => (
								<button
									type="button"
									onClick={() => settings.loader_type = type.value}
									class="ap-relative ap-flex ap-flex-col ap-items-center ap-justify-center ap-text-center ap-p-3 ap-rounded-lg ap-border-2 ap-transition-all ap-group ap-w-[100px] ap-h-[88px] ap-box-border"
									classList={{
										'ap-bg-indigo-50 ap-border-indigo-500': settings.loader_type === type.value,
										'ap-bg-white ap-border-slate-200 hover:ap-border-slate-300': settings.loader_type !== type.value
									}}
								>
									<div
										class="ap-w-11 ap-h-11 ap-rounded-lg ap-flex ap-items-center ap-justify-center ap-mb-2 ap-transition-colors"
										classList={{
											'ap-bg-indigo-500 ap-text-white': settings.loader_type === type.value,
											'ap-bg-slate-100 ap-text-slate-500 group-hover:ap-bg-slate-200': settings.loader_type !== type.value
										}}
									>
										<svg class="ap-w-5 ap-h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" d={type.icon} />
										</svg>
									</div>
									<span
										class="ap-text-sm ap-font-medium ap-transition-colors ap-whitespace-nowrap"
										classList={{
											'ap-text-indigo-700': settings.loader_type === type.value,
											'ap-text-slate-700': settings.loader_type !== type.value
										}}
									>
										{type.label}
									</span>
								</button>
							))}
						</div>
					</div>

					{/* Progress Bar Settings */}
					<Show when={settings.loader_type === 'progressbar'}>
						<div data-tour="progressbar">
							<ProgressBar />
						</div>
					</Show>

					{/* Spinner Settings */}
					<Show when={settings.loader_type === 'spinner'}>
						<Spinner />
					</Show>

					{/* Cursor Card - always visible */}
					<div class="ap-bg-white ap-border ap-border-slate-200 ap-rounded-lg ap-p-6 ap-space-y-6">
						<div class="ap-flex ap-items-center ap-justify-between">
							<h4 class="ap-font-semibold ap-text-base ap-text-slate-900">Cursor</h4>
							
						</div>

						<Switch
							value={settings.animate_cursor}
							onChange={(v) => isLocked() ? shakePromo() : settings.animate_cursor = v}
							plain={true}
							size="sm"
							locked={isLocked()}
							tooltip={
								<>
									<strong>Change cursor style</strong> while loading.<br /><br />
									Shows a loading cursor to indicate the page is loading.
								</>
							}
						>
							Animate Cursor
						</Switch>

						<Show when={settings.animate_cursor}>
							<hr class="ap-border-0 ap-h-px ap-bg-slate-100" />
							<div class="ap-flex ap-flex-col sm:ap-flex-row sm:ap-items-center sm:ap-justify-between ap-gap-2 sm:ap-gap-4">
								<Label size="sm" class="ap-whitespace-nowrap">Cursor Style</Label>
								<Select
									value={settings.cursor_mode}
									onChange={(v) => isLocked() ? shakePromo() : settings.cursor_mode = v}
									options={[
										{ value: 'wait', label: 'Wait' },
										{ value: 'progress', label: 'Progress' },
										{ value: 'not-allowed', label: 'Not Allowed' }
									]}
									classList={{ 'ap-opacity-60': isLocked() }}
									class="ap-max-w-[200px]"
								/>
							</div>
						</Show>
					</div>
				</div>

				{/* Transition Section */}
				<div class="ap-space-y-6 ap-pt-4 ap-border-t ap-border-slate-200">
					<h3 class="ap-text-lg ap-font-semibold ap-text-slate-900">Transition</h3>

					{/* Scroll to Top Smoothly Card */}
					<div class="ap-bg-white ap-border ap-border-slate-200 ap-rounded-lg ap-p-6">
						<Switch
							data-tour="scroll-to-top"
							value={settings.scroll_to_top}
							onChange={(v) => isLocked() ? shakePromo() : settings.scroll_to_top = v}
							plain={true}
							size="sm"
							locked={isLocked()}
							tooltip={
								<>
									<strong>Smooth scroll to top</strong> after each page navigation.<br /><br />
									When enabled, the page will smoothly scroll to the top when navigating to a new page.
								</>
							}
						>
							Scroll to Top Smoothly
						</Switch>
					</div>

					{/* Content Animation Card */}
					<div data-tour="content-animation" class="ap-bg-white ap-border ap-border-slate-200 ap-rounded-lg ap-p-6 ap-space-y-6">
						<div class="ap-flex ap-items-center ap-justify-between">
							<h4 class="ap-font-semibold ap-text-base ap-text-slate-900">Content Animation</h4>
							
						</div>

						<Switch
							value={settings.content_animation}
							onChange={(v) => {
								if (isLocked()) {
									shakePromo();
									return;
								}
								settings.content_animation = v;
								if (v && isLocked() && settings.content_animation_name && settings.content_animation_name !== 'fade') {
									settings.content_animation_name = 'fade';
									setPreviewAnimation('fade');
								} else if (v) {
									setPreviewAnimation(settings.content_animation_name || 'fade');
								}
							}}
							plain={true}
							size="sm"
							locked={isLocked()}
							tooltip={
								<>
									<strong>Add entrance animations</strong> when new content appears on the page.<br /><br />
									Choose from fade, slide, flip, or scale effects to make content transitions smooth and engaging.
								</>
							}
						>
							Enable Animation
						</Switch>

						<Show when={settings.content_animation}>
							<hr class="ap-border-0 ap-h-px ap-bg-slate-100" />

							{/* Animation Style */}
							<div class="ap-flex ap-items-center ap-justify-between ap-gap-4">
								<div class="ap-flex ap-items-center ap-gap-3">
									<Label size="sm" class="ap-whitespace-nowrap">Style</Label>
									<button
										class="ap-text-xs ap-ring-1 ap-ring-slate-200 ap-rounded ap-h-6 ap-px-3 hover:ap-bg-slate-50 ap-transition ap-cursor-pointer"
										onClick={animate_content}
									>
										<Show when={state.content_animation} fallback={<span>Preview</span>}>
											<Spin class="ap-text-indigo-500 ap-w-3 ap-h-3" />
										</Show>
									</button>
								</div>
								<div
									ref={selectContainerRef}
									class="ap-relative ap-w-full ap-max-w-[200px]"
									classList={{ 'ap-z-20': isSelectOpen() }}
								>
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											if (!isSelectOpen()) {
												checkPosition();
											}
											setIsSelectOpen(!isSelectOpen());
										}}
										class="ap-w-full ap-px-3 ap-py-2 ap-flex ap-items-center ap-justify-between ap-gap-2 ap-text-sm ap-rounded-lg ap-border ap-bg-white ap-text-slate-900 ap-cursor-pointer ap-transition-all ap-duration-150"
										classList={{
											'ap-border-slate-300': !isSelectOpen(),
											'ap-border-indigo-500 ap-ring-2 ap-ring-indigo-500 ap-ring-offset-1': isSelectOpen(),
										}}
									>
										<span class="ap-flex-1 ap-text-left ap-capitalize">{previewAnimation()}</span>
										<svg
											classList={{ 'ap-rotate-180': isSelectOpen() }}
											class="ap-fill-current ap-w-4 ap-h-4 ap-text-slate-400 ap-transition-transform ap-duration-200"
											viewBox="0 0 16 16"
										>
											<path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708" />
										</svg>
									</button>
									<Show when={isSelectOpen()}>
										<div
											onClick={(e) => e.stopPropagation()}
											class="ap-absolute ap-z-[9999] ap-bg-white ap-flex ap-flex-col ap-min-w-full ap-max-h-72 ap-overflow-y-auto ap-w-full ap-left-0 ap-shadow-lg ap-ring-1 ap-ring-slate-200 ap-rounded-lg ap-py-1 ap-border ap-border-slate-200"
											classList={{
												'ap-top-full ap-mt-1': !openUpward(),
												'ap-bottom-full ap-mb-1': openUpward(),
											}}
										>
											{animations.map((anim) => (
												<button
													type="button"
													onClick={(e) => {
														e.stopPropagation();
														handleAnimationSelect(anim);
													}}
													class="ap-px-3 ap-py-2 ap-text-sm ap-text-left ap-cursor-pointer ap-transition-colors ap-duration-150 ap-capitalize ap-whitespace-nowrap ap-flex ap-items-center ap-justify-between ap-gap-2"
													classList={{
														'ap-bg-indigo-50 ap-text-indigo-600 ap-font-medium': anim === previewAnimation(),
														'ap-text-slate-700 hover:ap-bg-slate-50': anim !== previewAnimation(),
													}}
												>
													<span>{anim}</span>
													
												</button>
											))}
										</div>
									</Show>
								</div>
							</div>

							<hr class="ap-border-0 ap-h-px ap-bg-slate-100" />

							{/* Duration */}
							<div class="ap-flex ap-flex-col sm:ap-flex-row sm:ap-items-center sm:ap-justify-between ap-gap-2 sm:ap-gap-4">
								<Label size="sm">Duration</Label>
								<SegmentedControl
									value={settings.content_animation_duration}
									onChange={(v) => {
										if (isLocked()) {
											shakePromo();
											return;
										}
										settings.content_animation_duration = v;
										animate_content();
									}}
									options={durationOptions}
									classList={{ 'ap-opacity-60': isLocked() }}
								/>
							</div>
						</Show>
					</div>
				</div>
			</div>

			{/* Desktop/Tablet preview */}
			<div class="ap-hidden min-[500px]:ap-block ap-w-full min-[1080px]:ap-w-auto min-[1080px]:ap-max-w-sm min-[1080px]:ap-min-w-[280px] ap-flex-shrink-0">
				<div class="min-[1080px]:ap-sticky min-[1080px]:ap-top-24">
					<Preview />
				</div>
			</div>

			{/* Mobile preview toggle button */}
			<button
				onClick={() => setShowMobilePreview(true)}
				class="min-[500px]:ap-hidden ap-fixed ap-bottom-28 ap-right-4 ap-z-[90] ap-flex ap-items-center ap-gap-1.5 ap-bg-white ap-text-slate-500 ap-px-2.5 ap-py-1.5 ap-rounded-full ap-shadow ap-border ap-border-slate-200 hover:ap-bg-slate-50 hover:ap-text-slate-700 ap-transition"
			>
				<svg class="ap-w-4 ap-h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
				</svg>
				<span class="ap-text-xs ap-font-medium">Preview</span>
			</button>

			{/* Mobile preview modal */}
			<Show when={showMobilePreview()}>
				<div class="min-[500px]:ap-hidden ap-fixed ap-inset-0 ap-z-[200] ap-bg-black/50 ap-backdrop-blur-sm" onClick={() => setShowMobilePreview(false)} />
				<div class="min-[500px]:ap-hidden ap-fixed ap-inset-x-4 ap-top-1/2 ap--translate-y-1/2 ap-z-[201] ap-bg-white ap-rounded-xl ap-shadow-2xl ap-p-4 ap-max-h-[80vh] ap-overflow-y-auto">
					<div class="ap-flex ap-items-center ap-justify-between ap-mb-4">
						<h3 class="ap-font-medium ap-text-slate-800">Preview</h3>
						<button
							onClick={() => setShowMobilePreview(false)}
							class="ap-w-8 ap-h-8 ap-flex ap-items-center ap-justify-center ap-rounded-full ap-text-slate-400 hover:ap-text-slate-600 hover:ap-bg-slate-100 ap-transition"
						>
							<svg class="ap-w-5 ap-h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>
					<Preview />
				</div>
			</Show>
		</section>
	);
}
