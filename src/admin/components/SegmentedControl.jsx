import { For, splitProps, createMemo, createSignal, createEffect } from 'solid-js';

export default function SegmentedControl(props) {
	const [local, others] = splitProps(props, ['value', 'options', 'onInput', 'onChange', 'class']);
	const [isAnimating, setIsAnimating] = createSignal(false);
	const [prevIndex, setPrevIndex] = createSignal(-1);

	const selectedIndex = createMemo(() => {
		return local.options.findIndex((opt) => opt.value === local.value);
	});

	// Trigger animation on index change
	createEffect(() => {
		const current = selectedIndex();
		if (prevIndex() !== -1 && prevIndex() !== current) {
			setIsAnimating(true);
			setTimeout(() => setIsAnimating(false), 300);
		}
		setPrevIndex(current);
	});

	const slideStyles = createMemo(() => {
		const widthPercentage = 100 / local.options.length;
		const isLast = selectedIndex() === local.options.length - 1;
		const translateAmount = selectedIndex() * 100;

		return {
			width: `${widthPercentage}%`,
			transform: isLast
				? `translateX(calc(${translateAmount}% - 0.5rem))`
				: `translateX(${translateAmount}%)`,
		};
	});

	const select = (value) => {
		local.onInput?.(value);
		local.onChange?.(value);
	};

	return (
		<div
			class={`ap-relative ap-inline-flex ap-items-center ap-p-1 ap-bg-slate-100 ap-rounded-lg ap-border ap-border-slate-200 ap-w-fit ${local.class || ''}`}
			{...others}
		>
			<div
				class="ap-absolute ap-inset-y-1 ap-left-1 ap-bg-indigo-500 ap-rounded-md ap-shadow-sm segmented-slider"
				classList={{ 'segmented-slider-animate': isAnimating() }}
				style={slideStyles()}
			/>

			<For each={local.options}>
				{(option) => (
					<button
						type="button"
						onClick={() => select(option.value)}
						class={`ap-relative ap-flex-1 ap-px-3 ap-py-1.5 ap-text-sm ap-font-medium ap-rounded-md ap-transition-all ap-duration-150 ap-ease-in-out ap-focus:ap-outline-none ap-focus:ap-ring-2 ap-focus:ap-ring-indigo-500 ap-focus:ap-ring-offset-1 ap-whitespace-nowrap ap-min-w-[50px] sm:ap-min-w-[80px] ${
							local.value === option.value
								? 'ap-text-white'
								: 'ap-text-slate-600 hover:ap-text-slate-900'
						}`}
					>
						{option.label}
					</button>
				)}
			</For>
		</div>
	);
}
