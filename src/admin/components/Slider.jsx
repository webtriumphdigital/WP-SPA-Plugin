import { Show, splitProps, mergeProps, createMemo } from 'solid-js';
import { useLicense } from '@util/context';

export default function Slider(props) {
	const { shakePromo } = useLicense();
	const merged = mergeProps(
		{
			value: 1,
			unit: 'px',
			min: 0,
			max: 100,
			step: 1,
			fill: true,
			locked: false,
		},
		props
	);

	const [local, others] = splitProps(merged, [
		'value',
		'unit',
		'min',
		'max',
		'step',
		'fill',
		'onInput',
		'class',
		'disabled',
		'locked',
	]);

	const filled = createMemo(() => {
		const percentage = ((local.value - local.min) / (local.max - local.min)) * 100;
		return `linear-gradient(90deg, rgba(99, 102, 241, 1) ${percentage}%, #e2e8f0 ${percentage}%)`;
	});

	const isDisabled = () => local.disabled || local.locked;

	const select = (value) => {
		if (isDisabled()) {
			if (local.locked) shakePromo();
			return;
		}
		const numValue = parseFloat(value);
		if (!isNaN(numValue)) {
			local.onInput?.(numValue);
		}
	};

	const decrease = () => {
		if (isDisabled() || local.value <= local.min) return;
		select(Math.max(local.value - local.step, local.min));
	};

	const increase = () => {
		if (isDisabled() || local.value >= local.max) return;
		select(Math.min(local.value + local.step, local.max));
	};

	const handleLockedClick = () => {
		if (local.locked) shakePromo();
	};

	return (
		<div class={`ap-flex ap-items-center ap-gap-3 ap-w-full ${local.class || ''}`} onClick={handleLockedClick}>
			<div class="ap-relative ap-flex-1 ap-py-2 ap-w-96" classList={{ 'ap-cursor-pointer': local.locked }}>
				<Show when={local.fill}>
					<div
						class="ap-absolute ap-h-1 ap-w-full ap-rounded-full ap-left-0 ap-top-1/2 ap--translate-y-1/2 ap-z-0 ap-pointer-events-none"
						style={{ background: filled() }}
					/>
				</Show>
				<Show when={!local.fill}>
					<div class="ap-absolute ap-h-1 ap-w-full ap-rounded-full ap-left-0 ap-top-1/2 ap--translate-y-1/2 ap-z-0 ap-bg-slate-200 ap-pointer-events-none" />
				</Show>
				<input
					type="range"
					class="td-spa-slider-input ap-relative ap-w-full ap-z-10 ap-h-4 ap-appearance-none ap-bg-transparent"
					classList={{ 'ap-cursor-pointer': !local.locked, 'ap-pointer-events-none': local.locked }}
					min={local.min}
					max={local.max}
					step={local.step}
					value={local.value}
					onInput={(e) => select(e.target.value)}
					{...others}
				/>
			</div>
			<Show when={local.unit}>
				<span
					class="ap-inline-flex ap-overflow-scroll ap-items-center ap-justify-center ap-text-sm ap-min-w-[4.5rem] ap-py-2 ap-px-3 ap-outline-none ap-ring-1 ap-ring-slate-200 ap-rounded-md focus:ap-ring-[2px] focus:ap-ring-indigo-500 ap-text-center ap-transition ap-bg-white ap-font-medium slider-hints"
					classList={{
						'ap-cursor-text': !isDisabled(),
						'ap-cursor-not-allowed': local.disabled,
						'ap-cursor-pointer': local.locked
					}}
					contentEditable={!isDisabled()}
					data-unit={local.unit}
					onClick={() => local.locked && shakePromo()}
					onKeyDown={(e) => {
						if (isDisabled()) {
							e.preventDefault();
							return;
						}
						if (e.key === 'ArrowUp') {
							e.preventDefault();
							increase();
						} else if (e.key === 'ArrowDown') {
							e.preventDefault();
							decrease();
						} else if (e.key === 'Enter') {
							e.preventDefault();
						}
					}}
					onInput={(e) => {
						if (!isDisabled()) {
							select(e.target.innerText);
						}
					}}
					onKeyPress={(e) => {
						if (isDisabled()) {
							e.preventDefault();
						}
					}}
				>
					{local.value}
				</span>
			</Show>
		</div>
	);
}
