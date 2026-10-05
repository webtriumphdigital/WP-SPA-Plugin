import { createSignal, onMount, onCleanup, Show, splitProps, mergeProps } from 'solid-js';
import { Portal } from 'solid-js/web';

export default function Tooltip(props) {
	const merged = mergeProps(
		{
			placement: 'bottom',
			maxWidth: '400px',
			minWidth: '280px',
		},
		props
	);

	const [local, others] = splitProps(merged, [
		'placement',
		'maxWidth',
		'minWidth',
		'children',
		'content',
		'class',
	]);

	let iconRef;
	let tooltipContentRef;
	const [isVisible, setIsVisible] = createSignal(false);
	const [position, setPosition] = createSignal({ top: 0, left: 0, ready: false });
	const [isMobile, setIsMobile] = createSignal(window.innerWidth < 640);
	let timeoutId = null;

	const checkMobile = () => {
		setIsMobile(window.innerWidth < 640);
	};

	const updatePosition = () => {
		if (!iconRef || !isVisible() || isMobile()) return;

		// Wait for tooltip to render
		requestAnimationFrame(() => {
			if (!iconRef || !tooltipContentRef) return;

			const iconRect = iconRef.getBoundingClientRect();
			const tooltipRect = tooltipContentRef.getBoundingClientRect();

			if (tooltipRect.width === 0 || tooltipRect.height === 0) {
				setTimeout(updatePosition, 10);
				return;
			}

			const viewportWidth = window.innerWidth;
			const viewportHeight = window.innerHeight;
			const padding = 12;

			// Position below icon, centered horizontally relative to icon
			const iconCenterX = iconRect.left + iconRect.width / 2;
			let top = iconRect.bottom + 8;
			let left = iconCenterX - tooltipRect.width / 2;

			// Flip to top if not enough space below
			if (top + tooltipRect.height > viewportHeight - padding) {
				top = iconRect.top - tooltipRect.height - 8;
			}

			// Keep within viewport horizontally
			if (left < padding) {
				left = padding;
			} else if (left + tooltipRect.width > viewportWidth - padding) {
				left = viewportWidth - tooltipRect.width - padding;
			}

			// Keep within viewport vertically
			if (top < padding) {
				top = padding;
			}

			setPosition({ top, left, ready: true });
		});
	};

	const showTooltip = () => {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => {
			setIsVisible(true);
			if (!isMobile()) {
				setPosition({ top: 0, left: 0, ready: false });
				updatePosition();
			}
		}, isMobile() ? 0 : 300);
	};

	const hideTooltip = () => {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => {
			setIsVisible(false);
			setPosition({ top: 0, left: 0, ready: false });
		}, isMobile() ? 0 : 200);
	};

	const toggleTooltip = (e) => {
		e.stopPropagation();
		if (isVisible()) {
			hideTooltip();
		} else {
			showTooltip();
		}
	};

	const handleTooltipMouseEnter = () => {
		if (!isMobile()) clearTimeout(timeoutId);
	};

	const handleTooltipMouseLeave = () => {
		if (!isMobile()) hideTooltip();
	};

	onMount(() => {
		if (iconRef) {
			iconRef.addEventListener('mouseenter', () => !isMobile() && showTooltip());
			iconRef.addEventListener('mouseleave', () => !isMobile() && hideTooltip());
			iconRef.addEventListener('click', toggleTooltip);
		}
		window.addEventListener('scroll', updatePosition, true);
		window.addEventListener('resize', () => {
			checkMobile();
			updatePosition();
		});
	});

	onCleanup(() => {
		if (iconRef) {
			iconRef.removeEventListener('mouseenter', showTooltip);
			iconRef.removeEventListener('mouseleave', hideTooltip);
			iconRef.removeEventListener('click', toggleTooltip);
		}
		window.removeEventListener('scroll', updatePosition, true);
		window.removeEventListener('resize', checkMobile);
		clearTimeout(timeoutId);
	});

	return (
		<span class={`ap-inline-flex ap-items-center ${local.class || ''}`} {...others}>
			<Show
				when={local.content}
				fallback={
					<svg
						ref={iconRef}
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
						class="ap-w-4 ap-h-4 ap-text-slate-400 hover:ap-text-slate-600 ap-cursor-help ap-transition-colors"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
						/>
					</svg>
				}
			>
				<span ref={iconRef}>{local.content}</span>
			</Show>

			<Portal mount={document.body}>
				<Show when={isVisible()}>
					{/* Mobile: Bottom Drawer */}
					<Show when={isMobile()}>
						{/* Backdrop */}
						<div
							class="ap-fixed ap-inset-0 ap-bg-black/50 ap-backdrop-blur-sm"
							style={{ 'z-index': 99999998 }}
							onClick={hideTooltip}
						/>
						{/* Drawer */}
						<div
							class="ap-fixed ap-bottom-0 ap-left-0 ap-right-0 ap-bg-white ap-rounded-t-2xl ap-shadow-2xl ap-animate-slide-up"
							style={{ 'z-index': 99999999 }}
						>
							{/* Handle */}
							<div class="ap-flex ap-justify-center ap-pt-3 ap-pb-2">
								<div class="ap-w-10 ap-h-1 ap-bg-slate-300 ap-rounded-full" />
							</div>
							{/* Header */}
							<div class="ap-flex ap-items-center ap-justify-between ap-px-5 ap-pb-3 ap-border-b ap-border-slate-100">
								<span class="ap-text-sm ap-font-medium ap-text-slate-500">Info</span>
								<button
									onClick={hideTooltip}
									class="ap-p-1.5 ap-rounded-full ap-bg-slate-100 hover:ap-bg-slate-200 ap-transition-colors"
								>
									<svg class="ap-w-4 ap-h-4 ap-text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
									</svg>
								</button>
							</div>
							{/* Content */}
							<div class="ap-p-5 ap-pb-8 ap-max-h-[60vh] ap-overflow-y-auto">
								<div class="ap-text-sm ap-text-slate-700 ap-leading-relaxed ap-prose ap-prose-sm ap-max-w-none">
									{local.children}
								</div>
							</div>
						</div>
					</Show>

					{/* Desktop: Floating Tooltip */}
					<Show when={!isMobile()}>
						<div
							ref={tooltipContentRef}
							class="ap-fixed ap-shadow-xl ap-bg-white ap-border ap-border-slate-200 ap-rounded-lg ap-p-3 sm:ap-p-4 ap-whitespace-normal tooltip-content"
							style={{
								position: 'fixed',
								top: `${position().top}px`,
								left: `${position().left}px`,
								'z-index': 99999999,
								'max-width': local.maxWidth,
								'min-width': local.minWidth,
								visibility: position().ready ? 'visible' : 'hidden',
							}}
							onMouseEnter={handleTooltipMouseEnter}
							onMouseLeave={handleTooltipMouseLeave}
						>
							<div class="ap-text-sm ap-text-slate-700 ap-leading-relaxed ap-prose ap-prose-sm ap-max-w-none ap-w-full">
								{local.children}
							</div>
						</div>
					</Show>
				</Show>
			</Portal>
		</span>
	);
}
