import { createSignal, createEffect, onCleanup, Show } from 'solid-js';

export default function TourSpotlight(props) {
	const [rect, setRect] = createSignal(null);
	let resizeObserver = null;

	const updateRect = () => {
		if (!props.selector) {
			setRect(null);
			return;
		}

		const element = document.querySelector(props.selector);
		if (element) {
			const elementRect = element.getBoundingClientRect();
			const padding = 6;
			setRect({
				top: elementRect.top - padding,
				left: elementRect.left - padding,
				width: elementRect.width + padding * 2,
				height: elementRect.height + padding * 2
			});
		} else {
			setRect(null);
		}
	};

	createEffect(() => {
		props.selector;

		const timeout = setTimeout(updateRect, 100);

		if (props.selector) {
			const element = document.querySelector(props.selector);
			if (element) {
				resizeObserver = new ResizeObserver(updateRect);
				resizeObserver.observe(element);
			}
		}

		window.addEventListener('scroll', updateRect, true);
		window.addEventListener('resize', updateRect);

		onCleanup(() => {
			clearTimeout(timeout);
			if (resizeObserver) resizeObserver.disconnect();
			window.removeEventListener('scroll', updateRect, true);
			window.removeEventListener('resize', updateRect);
		});
	});

	return (
		<>
			<Show
				when={rect()}
				fallback={
					/* Full overlay when no element to highlight (center modal) */
					<div
						class="ap-fixed ap-inset-0 ap-z-[99997]"
						style={{
							'pointer-events': 'auto',
							'background-color': 'rgba(0, 0, 0, 0.65)'
						}}
						onClick={props.onOverlayClick}
					/>
				}
			>
				{/* Spotlight with cutout - element is fully visible */}
				<div
					class="ap-fixed ap-z-[99997] ap-rounded"
					style={{
						top: `${rect().top}px`,
						left: `${rect().left}px`,
						width: `${rect().width}px`,
						height: `${rect().height}px`,
						'pointer-events': 'none',
						'box-shadow': '0 0 0 3px rgba(99, 102, 241, 1), 0 0 0 9999px rgba(0, 0, 0, 0.65)'
					}}
				/>
				{/* Clickable overlay areas around the spotlight */}
				<div
					class="ap-fixed ap-inset-0 ap-z-[99996]"
					style={{ 'pointer-events': 'auto' }}
					onClick={props.onOverlayClick}
				/>
			</Show>
		</>
	);
}
