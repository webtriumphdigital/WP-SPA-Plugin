import { createSignal, createEffect, Show, onCleanup } from 'solid-js';

export default function TourTooltip(props) {
	const [position, setPosition] = createSignal({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });

	const tooltipWidth = 320;
	const tooltipHeight = 180;

	const calculatePosition = () => {
		const step = props.step;
		if (!step?.selector || step.position === 'center') {
			setPosition({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
			return;
		}

		const element = document.querySelector(step.selector);
		if (!element) {
			setPosition({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
			return;
		}

		const rect = element.getBoundingClientRect();
		const padding = 16;

		let top, left;

		switch (step.position) {
			case 'top':
				top = rect.top - tooltipHeight - padding;
				left = rect.left + rect.width / 2 - tooltipWidth / 2;
				break;
			case 'bottom':
				top = rect.bottom + padding;
				left = rect.left + rect.width / 2 - tooltipWidth / 2;
				break;
			case 'left':
				top = rect.top + rect.height / 2 - tooltipHeight / 2;
				left = rect.left - tooltipWidth - padding;
				break;
			case 'right':
			default:
				top = rect.top + rect.height / 2 - tooltipHeight / 2;
				left = rect.right + padding;
				break;
		}

		if (left < padding) left = padding;
		if (left + tooltipWidth > window.innerWidth - padding) {
			left = window.innerWidth - tooltipWidth - padding;
		}
		if (top < padding) top = padding;
		if (top + tooltipHeight > window.innerHeight - padding) {
			top = window.innerHeight - tooltipHeight - padding;
		}

		setPosition({ top: `${top}px`, left: `${left}px`, transform: 'none' });
	};

	createEffect(() => {
		const step = props.step;

		// For centered steps, calculate immediately
		if (!step?.selector || step.position === 'center') {
			setPosition({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
		} else {
			// For element-targeted steps, wait for DOM
			setTimeout(calculatePosition, 150);
		}

		window.addEventListener('resize', calculatePosition);
		window.addEventListener('scroll', calculatePosition, true);

		onCleanup(() => {
			window.removeEventListener('resize', calculatePosition);
			window.removeEventListener('scroll', calculatePosition, true);
		});
	});

	return (
		<div
			class="ap-fixed ap-z-[99999] ap-bg-white ap-rounded-lg ap-shadow-2xl tour-tooltip-enter"
			style={{
				...position(),
				width: `${tooltipWidth}px`,
				'max-width': 'calc(100vw - 32px)',
				'transition': 'top 0.3s ease-out, left 0.3s ease-out, transform 0.3s ease-out'
			}}
		>
			<div class="ap-p-4">
				<Show when={!props.isFirst}>
					<div class="ap-flex ap-items-center ap-justify-between ap-mb-2">
						<span class="ap-text-xs ap-font-medium ap-text-slate-400">
							{props.stepIndex + 1} / {props.totalSteps}
						</span>
						<button
							onClick={props.onSkip}
							class="ap-text-xs ap-text-slate-400 hover:ap-text-slate-600 ap-transition"
						>
							Skip
						</button>
					</div>
				</Show>

				<h3 class="ap-font-semibold ap-text-sm ap-text-slate-900 ap-mb-1.5">
					{props.step.title}
				</h3>
				<p class="ap-text-[13px] ap-text-slate-500 ap-leading-relaxed">
					{props.step.content}
				</p>
			</div>

			<div class="ap-flex ap-items-center ap-justify-end ap-gap-2 ap-px-4 ap-py-2.5 ap-border-t ap-border-slate-100 ap-bg-slate-50/80 ap-rounded-b-lg">
				<Show when={!props.isFirst}>
					<button
						onClick={props.onPrev}
						class="ap-px-3 ap-py-1.5 ap-text-xs ap-font-medium ap-text-slate-500 hover:ap-text-slate-700 ap-transition"
					>
						Back
					</button>
				</Show>
				<button
					onClick={props.onNext}
					class="ap-px-4 ap-py-1.5 ap-text-xs ap-font-medium ap-text-white ap-bg-indigo-600 ap-rounded hover:ap-bg-indigo-700 ap-transition"
				>
					{props.isLast ? 'Finish' : props.isFirst ? 'Start Tour' : 'Next'}
				</button>
			</div>
		</div>
	);
}
