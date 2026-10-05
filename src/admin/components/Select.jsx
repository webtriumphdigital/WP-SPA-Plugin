import { createSignal, createMemo, onMount, onCleanup, For, Show, splitProps, mergeProps } from 'solid-js';

export default function Select(props) {
	const merged = mergeProps(
		{
			value: '',
			options: [],
			placeholder: 'Select',
		},
		props
	);

	const [local, others] = splitProps(merged, [
		'value',
		'options',
		'placeholder',
		'onInput',
		'onChange',
		'class',
		'classList',
	]);

	const [isOpen, setIsOpen] = createSignal(false);
	const [openUpward, setOpenUpward] = createSignal(false);
	let containerRef;

	const normalizedOptions = createMemo(() => {
		if (!local.options) return [];
		return local.options.map((op) => ({
			value: op.value || op,
			label: op.label || op,
			placeholder: op.placeholder || op.label || op,
			style: op.style || null,
		}));
	});

	const displayValue = createMemo(() => {
		const opts = normalizedOptions();
		const selected = opts.find((o) => o.value === local.value);
		if (selected) {
			return selected.placeholder || selected.label || selected.value;
		}
		return local.placeholder;
	});

	const checkPosition = () => {
		if (!containerRef) return;
		const rect = containerRef.getBoundingClientRect();
		const viewportHeight = window.innerHeight;
		const spaceBelow = viewportHeight - rect.bottom;
		const spaceAbove = rect.top;
		const dropdownHeight = 288; // max-h-72 = 18rem = 288px
		
		// If not enough space below but enough space above, open upward
		setOpenUpward(spaceBelow < dropdownHeight && spaceAbove > spaceBelow);
	};

	const select = (value) => {
		if (local.value !== value) {
			local.onChange?.(value);
		}
		local.onInput?.(value);
		setIsOpen(false);
	};

	const handleClickOutside = (e) => {
		if (containerRef && !containerRef.contains(e.target)) {
			setIsOpen(false);
		}
	};

	const toggleOpen = (e) => {
		e.stopPropagation();
		if (!isOpen()) {
			checkPosition();
		}
		setIsOpen(!isOpen());
	};

	onMount(() => {
		document.addEventListener('click', handleClickOutside);
	});

	onCleanup(() => {
		document.removeEventListener('click', handleClickOutside);
	});

	return (
		<div
			ref={containerRef}
			class={`ap-relative ap-w-full ap-td-spa-select ${local.class || ''}`}
			classList={{ 'ap-z-20': isOpen(), ...(local.classList || {}) }}
			{...others}
		>
			<button
				type="button"
				onClick={toggleOpen}
				class="ap-w-full ap-px-3 ap-py-2 ap-flex ap-items-center ap-justify-between ap-gap-2 ap-text-sm ap-rounded-lg ap-border ap-bg-white ap-text-slate-900 ap-cursor-pointer ap-transition-all ap-duration-150 ap-focus:ap-outline-none ap-focus:ap-ring-2 ap-focus:ap-ring-offset-1 disabled:ap-opacity-50 disabled:ap-cursor-not-allowed"
				classList={{
					'ap-border-slate-300 ap-focus:ap-border-indigo-500 ap-focus:ap-ring-indigo-500':
						!isOpen(),
					'ap-border-indigo-500 ap-ring-2 ap-ring-indigo-500 ap-ring-offset-1': isOpen(),
				}}
			>
				<span class="ap-flex-1 ap-text-left ap-capitalize" innerHTML={displayValue()} />
				<svg
					classList={{ 'ap-rotate-180': isOpen() }}
					xmlns="http://www.w3.org/2000/svg"
					class="ap-fill-current ap-w-4 ap-h-4 ap-text-slate-400 ap-transition-transform ap-duration-200"
					viewBox="0 0 16 16"
				>
					<path
						fill-rule="evenodd"
						d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708"
					/>
				</svg>
			</button>
			<Show when={isOpen()}>
				<div
					onClick={(e) => e.stopPropagation()}
					class="ap-absolute ap-z-[9999] ap-bg-white ap-flex ap-flex-col ap-min-w-full ap-max-h-72 ap-overflow-y-auto ap-w-full ap-left-0 ap-shadow-lg ap-ring-1 ap-ring-slate-200 ap-rounded-lg ap-py-1 ap-border ap-border-slate-200 dropdown-animation"
					classList={{
						'ap-top-full ap-mt-1': !openUpward(),
						'ap-bottom-full ap-mb-1': openUpward(),
					}}
				>
					<For each={normalizedOptions()}>
						{(option) => (
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									select(option.value);
								}}
								class="ap-px-3 ap-py-2 ap-text-sm ap-text-left ap-cursor-pointer ap-transition-colors ap-duration-150 ap-capitalize ap-whitespace-nowrap"
								classList={{
									'ap-bg-indigo-50 ap-text-indigo-600 ap-font-medium':
										option.value === local.value,
									'ap-text-slate-700 hover:ap-bg-slate-50':
										option.value !== local.value,
								}}
								style={option.style}
								innerHTML={option.label}
							/>
						)}
					</For>
				</div>
			</Show>
		</div>
	);
}
