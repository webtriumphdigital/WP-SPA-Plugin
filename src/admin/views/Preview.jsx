import { createSignal, createMemo, createEffect, Show, onCleanup } from 'solid-js';
import { useSettings } from '@util/context';

export default function Preview() {
	const { state, setState, settings } = useSettings();

	// Calculate progress bar height based on thickness setting
	const progressbarHeight = createMemo(() => {
		const thickness = settings.progressbar_weight;
		if (thickness === 'thin') return '3px';
		if (thickness === 'normal') return '7px';
		if (thickness === 'large') return '12px';
		if (thickness === 'custom') {
			const customValue = settings.progressbar_weight_custom || '7px';
			// Validate custom value
			const validPattern = /^-?\d+(\.\d+)?(px|rem|em|%|vh|vw|vmin|vmax|ch|ex)$/i;
			return validPattern.test(customValue.trim()) ? customValue : '7px';
		}
		// Fallback for old numeric values
		return thickness + 'px';
	});

	// Track animation class for preview
	const [animationClass, setAnimationClass] = createSignal('');
	let animationTimeout = null;
	let animationTimeout2 = null;

	// Get duration value
	const getDuration = () => {
		const duration = settings.content_animation_duration;
		if (duration === 'custom') {
			return parseFloat(settings.content_animation_duration_custom) || 0.3;
		}
		return parseFloat(duration) || 0.3;
	};

	// Function to stop current animation and start new one (out -> in sequence)
	const triggerAnimation = (animationName) => {
		if (!settings.content_animation || !animationName) {
			setAnimationClass('');
			return;
		}

		// Clear any existing timeouts
		if (animationTimeout) {
			clearTimeout(animationTimeout);
			animationTimeout = null;
		}
		if (animationTimeout2) {
			clearTimeout(animationTimeout2);
			animationTimeout2 = null;
		}

		// Reset animation class immediately to stop current animation
		setAnimationClass('');

		const duration = getDuration();
		const halfDuration = (duration / 2) * 1000;

		// Use requestAnimationFrame to ensure DOM update happens before adding new class
		requestAnimationFrame(() => {
			// Phase 1: Out animation
			setAnimationClass(`td-spa-animate-${animationName}-out`);

			// Phase 2: In animation after out completes
			animationTimeout = setTimeout(() => {
				setAnimationClass(`td-spa-animate-${animationName}-in`);

				// Reset after in animation completes
				animationTimeout2 = setTimeout(() => {
					setAnimationClass('');
					animationTimeout = null;
					animationTimeout2 = null;
				}, halfDuration);
			}, halfDuration);
		});
	};

	// Watch for content animation state changes (triggered by preview button)
	createEffect(() => {
		const contentAnimation = state.content_animation;
		if (contentAnimation && settings.content_animation) {
			triggerAnimation(contentAnimation);
		} else {
			// Clear animation if state is reset
			if (animationTimeout) {
				clearTimeout(animationTimeout);
				animationTimeout = null;
			}
			setAnimationClass('');
		}
	});

	// Watch for animation name changes - stop current and start new animation
	createEffect(() => {
		const animationName = settings.content_animation_name;
		if (settings.content_animation && animationName) {
			// Stop current animation and start new one immediately
			triggerAnimation(animationName);
		}
	});

	// Cleanup on unmount
	onCleanup(() => {
		if (animationTimeout) {
			clearTimeout(animationTimeout);
		}
		if (animationTimeout2) {
			clearTimeout(animationTimeout2);
		}
	});

	// Computed class for the preview content
	const contentClass = createMemo(() => {
		// Only show animation when explicitly triggered via preview button
		return animationClass();
	});

	// Computed styles for reactivity
	const contentWrapperStyle = createMemo(() => ({
		cursor: settings.animate_cursor ? settings.cursor_mode : '',
		'--td-spa-animation-duration': (getDuration() / 2) + 's'
	}));

	const progressbarStyle = createMemo(() => ({
		height: progressbarHeight(),
		'background-color': !settings.progressbar_animate ? settings.progressbar_color : undefined,
		'--progressbar-color': settings.progressbar_color,
		'--animation-speed': (settings.progressbar_animation_speed || 1.5) + 's',
		opacity: (settings.progressbar_opacity || 100) / 100
	}));

	const loaderBackdropStyle = createMemo(() => ({
		'background-color': settings.loader_background,
		opacity: (settings.loader_background_opacity || 100) / 100
	}));

	const loaderWrapperStyle = createMemo(() => ({
		gap: settings.loader_gap + 'px'
	}));

	const loaderImageStyle = createMemo(() => ({
		width: settings.loader_image_size + 'px',
		transform: 'rotate(' + settings.loader_image_rotation + 'deg)'
	}));

	const loaderTextStyle = createMemo(() => ({
		color: settings.loader_color,
		'font-family': settings.loader_font_family,
		'font-weight': settings.loader_font_weight,
		'font-size': settings.loader_font_size + 'px',
		'letter-spacing': settings.loader_letter_spacing + 'px'
	}));

	// Custom CSS for preview
	const customCSS = createMemo(() => {
		return settings.custom_css || '';
	});

	return (
		<div class="ap-w-full ap-max-w-md ap-min-w-[320px] ap-relative ap-space-y-8 ap-sticky ap-top-24 ap-self-start ap-mx-auto">
			{/* Inject custom CSS */}
			<Show when={customCSS()}>
				<style>{customCSS()}</style>
			</Show>
			<div class="ap-hidden min-[1080px]:ap-flex ap-items-center ap-justify-between">
				<h3 class="ap-font-medium ap-text-slate-800">How it will look like.</h3>
				<div
					onClick={() => setState('isMobile', !state.isMobile)}
					class="ap-hidden min-[1080px]:ap-flex ap-items-center ap-bg-gray-100 ap-rounded ap-ring-4 ap-h-7 ap-text-sm ap-ring-slate-100 ap-relative ap-cursor-pointer"
				>
					<span
						class="ap-w-7 ap-flex ap-items-center ap-justify-center ap-text-center ap-h-full ap-z-10"
						classList={{ 'ap-text-white': !state.isMobile }}
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="ap-fill-current ap-w-5" viewBox="0 0 16 16">
							<path d="M6 12q0 1-.25 1.5H5a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1h-.75Q10 13 10 12h4c2 0 2-2 2-2V4c0-2-2-2-2-2H2C0 2 0 4 0 4v6c0 2 2 2 2 2z" />
						</svg>
					</span>
					<span
						class="ap-w-7 ap-flex ap-items-center ap-justify-center ap-text-center ap-h-full ap-z-10"
						classList={{ 'ap-text-white': state.isMobile }}
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="ap-fill-current ap-w-5" viewBox="0 0 16 16">
							<path d="M3 2a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zm6 11a1 1 0 1 0-2 0 1 1 0 0 0 2 0" />
						</svg>
					</span>
					<span
						class="ap-absolute ap-w-7 ap-h-full ap-bg-indigo-400 ap-rounded ap-z-0 ap-transition"
						classList={{ 'ap-translate-x-full': state.isMobile }}
					></span>
				</div>
			</div>
			<div
				class="ap-w-full ap-ring-1 ap-ring-slate-200 ap-rounded ap-transition-all ap-mx-auto ap-overflow-hidden"
				style={{ 'max-width': state.isMobile ? '70%' : '100%' }}
			>
				<div class="ap-border-b ap-border-slate-200 ap-py-3 ap-flex ap-items-center ap-gap-2 ap-px-5">
					<span class="ap-w-3 ap-h-3 ap-rounded-full ap-bg-red-500"></span>
					<span class="ap-w-3 ap-h-3 ap-rounded-full ap-bg-yellow-500"></span>
					<span class="ap-w-3 ap-h-3 ap-rounded-full ap-bg-blue-500"></span>
				</div>
				<div
					class={`ap-relative ap-h-full ap-w-full ${contentClass()}`}
					style={contentWrapperStyle()}
				>
					{/* Dummy Website Preview */}
					<div class="ap-bg-white">
						{/* Header */}
						<div class="ap-px-4 ap-py-3 ap-border-b ap-border-slate-100 ap-flex ap-items-center ap-justify-between">
							<div class="ap-flex ap-items-center ap-gap-2">
								<div class="ap-w-6 ap-h-6 ap-bg-slate-300 ap-rounded"></div>
								<div class="ap-w-16 ap-h-2 ap-bg-slate-200 ap-rounded"></div>
							</div>
							<div class="ap-flex ap-items-center ap-gap-3">
								<div class="ap-w-10 ap-h-1.5 ap-bg-slate-200 ap-rounded"></div>
								<div class="ap-w-10 ap-h-1.5 ap-bg-slate-200 ap-rounded"></div>
								<div class="ap-w-10 ap-h-1.5 ap-bg-slate-200 ap-rounded"></div>
							</div>
						</div>

						{/* Hero Section */}
						<div class="ap-px-4 ap-py-5 ap-bg-slate-50">
							<div class="ap-w-3/4 ap-h-2.5 ap-bg-slate-400 ap-rounded ap-mb-2"></div>
							<div class="ap-w-1/2 ap-h-2 ap-bg-slate-300 ap-rounded ap-mb-3"></div>
							<div class="ap-w-16 ap-h-5 ap-bg-slate-400 ap-rounded"></div>
						</div>

						{/* Content */}
						<div class="ap-p-4 ap-space-y-3">
							<div class="ap-flex ap-gap-3">
								<div class="ap-flex-1 ap-p-2.5 ap-border ap-border-slate-100 ap-rounded">
									<div class="ap-w-6 ap-h-6 ap-bg-slate-200 ap-rounded ap-mb-2"></div>
									<div class="ap-w-full ap-h-1.5 ap-bg-slate-200 ap-rounded ap-mb-1"></div>
									<div class="ap-w-2/3 ap-h-1.5 ap-bg-slate-100 ap-rounded"></div>
								</div>
								<div class="ap-flex-1 ap-p-2.5 ap-border ap-border-slate-100 ap-rounded">
									<div class="ap-w-6 ap-h-6 ap-bg-slate-200 ap-rounded ap-mb-2"></div>
									<div class="ap-w-full ap-h-1.5 ap-bg-slate-200 ap-rounded ap-mb-1"></div>
									<div class="ap-w-2/3 ap-h-1.5 ap-bg-slate-100 ap-rounded"></div>
								</div>
							</div>
							<div class="ap-space-y-1.5">
								<div class="ap-w-full ap-h-1.5 ap-bg-slate-100 ap-rounded"></div>
								<div class="ap-w-full ap-h-1.5 ap-bg-slate-100 ap-rounded"></div>
								<div class="ap-w-3/4 ap-h-1.5 ap-bg-slate-100 ap-rounded"></div>
							</div>
						</div>

						{/* Footer */}
						<div class="ap-px-4 ap-py-2.5 ap-bg-slate-100 ap-flex ap-items-center ap-justify-between">
							<div class="ap-w-12 ap-h-1.5 ap-bg-slate-300 ap-rounded"></div>
							<div class="ap-flex ap-gap-1.5">
								<div class="ap-w-3 ap-h-3 ap-bg-slate-300 ap-rounded-full"></div>
								<div class="ap-w-3 ap-h-3 ap-bg-slate-300 ap-rounded-full"></div>
								<div class="ap-w-3 ap-h-3 ap-bg-slate-300 ap-rounded-full"></div>
							</div>
						</div>
					</div>

					{/* progress bar */}
					<Show when={settings.loader_type === 'progressbar'}>
						<div
							class="td-spa-progressbar ap-absolute ap-left-0 ap-z-50 ap-transition-[width]"
							classList={{
								'ap-top-0': settings.progressbar_position !== 'bottom',
								'ap-bottom-0': settings.progressbar_position === 'bottom',
								[settings.progressbar_class]: settings.progressbar_class,
								'ap-w-0 ap-duration-[0s]': !settings.progressbar,
								'ap-w-full ap-duration-1000': settings.progressbar,
								'progressbar-wave': settings.progressbar_animate
							}}
							style={progressbarStyle()}
						></div>
					</Show>

					{/* loader */}
					<Show when={settings.loader_type === 'spinner'}>
						<div
							class="td-spa-spinner ap-absolute ap-left-0 ap-top-0 ap-w-full ap-h-full ap-z-40 ap-flex ap-items-center ap-justify-center"
							classList={{ [settings.loader_class]: settings.loader_class }}
						>
							<div
								class="td-spa-spinner-overlay ap-absolute ap-left-0 ap-top-0 ap-w-full ap-h-full ap-z-30"
								style={loaderBackdropStyle()}
							></div>

							{/* wrapper */}
							<div
								class="td-spa-spinner-content ap-flex ap-items-center ap-justify-center ap-z-40 ap-transition-all"
								classList={{
									'ap-flex-col': settings.loader_layout === 'icon_top' || settings.loader_image_position === 'top',
									'ap-flex-col-reverse': settings.loader_layout === 'icon_bottom' || settings.loader_image_position === 'bottom',
									'ap-flex-row-reverse': settings.loader_layout === 'icon_right' || settings.loader_image_position === 'right'
								}}
								style={loaderWrapperStyle()}
							>
								{/* icon */}
								<Show when={settings.loader_image && settings.loader_layout !== 'text_only'}>
									<img
										src={settings.loader_image}
										class="td-spa-spinner-image ap-transition-all ap-h-auto"
										style={loaderImageStyle()}
									/>
								</Show>

								{/* text */}
								<Show when={settings.loader_message && settings.loader_layout !== 'icon_only'}>
									<span
										class="td-spa-spinner-text ap-transition-all ap-text-center"
										innerHTML={settings.loader_message}
										style={loaderTextStyle()}
									></span>
								</Show>
							</div>
						</div>
					</Show>
				</div>
			</div>
		</div>
	);
}
