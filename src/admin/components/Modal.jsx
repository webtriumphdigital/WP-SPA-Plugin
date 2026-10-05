import { Show, onMount, onCleanup, createEffect, createSignal } from 'solid-js';
import { Portal } from 'solid-js/web';

/**
 * Overlay dialog covering the plugin's settings area.
 *
 * It deliberately stops at WordPress' own admin bar and menu — a plugin
 * dialog has no business blacking those out — but covers everything the
 * plugin owns.
 *
 * The region is measured from WordPress' chrome rather than from the plugin
 * wrapper: `.td-spa-layout` positions all of its children `fixed`, so the
 * wrapper itself collapses to zero height and is useless as a containing
 * block. Offsets are re-measured on open and on resize, since the admin menu
 * folds at narrow widths and the admin bar changes height on mobile.
 *
 * Positioning is inline rather than utility classes on purpose: arbitrary
 * Tailwind values (z-[100000] and friends) are not in the generated
 * stylesheet, so a class-based overlay silently has no z-index.
 *
 * Props: open, onClose (omit to make it non-dismissable), children
 */
export default function Modal(props) {
	const [box, setBox] = createSignal({ top: 0, left: 0 });

	const measure = () => {
		const bar = document.getElementById('wpadminbar');
		const menu = document.getElementById('adminmenuwrap');

		setBox({
			top: bar ? bar.getBoundingClientRect().height : 0,
			// Right edge of the admin menu, so the overlay starts where the
			// plugin's own area does. Collapsed/folded menus report a
			// smaller width, which is exactly what we want.
			left: menu ? menu.getBoundingClientRect().right : 0,
		});
	};

	const onKey = (e) => {
		if (e.key === 'Escape' && props.open) props.onClose?.();
	};

	// Re-measure whenever it opens, not during render.
	createEffect(() => {
		if (props.open) measure();
	});

	onMount(() => {
		measure();
		document.addEventListener('keydown', onKey);
		window.addEventListener('resize', measure);
		onCleanup(() => {
			document.removeEventListener('keydown', onKey);
			window.removeEventListener('resize', measure);
		});
	});

	return (
		<Show when={props.open}>
			<Portal mount={document.body}>
				<div
					style={{
						position: 'fixed',
						top: box().top + 'px',
						left: box().left + 'px',
						right: '0',
						bottom: '0',
						'z-index': '9999',
						display: 'flex',
						'align-items': 'center',
						'justify-content': 'center',
						padding: '1rem',
						background: 'rgba(15, 23, 42, 0.55)',
					}}
					onClick={() => props.onClose?.()}
				>
					<div
						class="ap-bg-white ap-rounded-lg ap-shadow-xl ap-p-5 ap-space-y-4"
						style={{ 'max-width': '26rem', width: '100%' }}
						role="dialog"
						aria-modal="true"
						onClick={(e) => e.stopPropagation()}
					>
						{props.children}
					</div>
				</div>
			</Portal>
		</Show>
	);
}
