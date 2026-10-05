import { For, splitProps, mergeProps, createMemo } from 'solid-js';

export default function ColorPicker(props) {
	const merged = mergeProps({ value: '', colors: ['#6366f1', '#10b981', '#f59e0b', '#1f2937'] }, props);

	const [local, others] = splitProps(merged, ['value', 'onInput', 'class', 'colors']);

	const colors = local.colors;

	const isCustomColor = createMemo(() => {
		return !colors.includes(local.value?.toLowerCase());
	});

	const select = (color) => {
		local.onInput?.(color);
	};

	return (
		<div class={`ap-flex ap-items-center ap-gap-3 ${local.class || ''}`} {...others}>
			<For each={colors}>
				{(color) => (
					<span
						onClick={() => select(color)}
						style={{ background: color }}
						class={`ap-w-8 ap-h-8 ap-rounded-full ap-cursor-pointer ap-transition-all ap-ring-1 ${
							color === local.value
								? 'ap-ring-2 ap-ring-indigo-500 ap--translate-y-0.5'
								: 'ap-ring-slate-300 hover:ap-ring-indigo-200 hover:ap--translate-y-0.5'
						}`}
					/>
				)}
			</For>

			<label
				class={`ap-w-8 ap-h-8 ap-rounded-full ap-cursor-pointer ap-transition-all ap-ring-1 ap-relative ap-flex ap-items-center ap-justify-center ${
					isCustomColor()
						? 'ap-ring-2 ap-ring-indigo-500 ap--translate-y-0.5'
						: 'ap-ring-slate-300 hover:ap-ring-indigo-200 hover:ap--translate-y-0.5'
				}`}
				style={{ background: local.value }}
			>
				<input
					type="color"
					value={local.value}
					onInput={(e) => select(e.target.value)}
					class="ap-w-0 ap-h-0 ap-opacity-0 ap-absolute"
				/>
				<svg
					class={`ap-w-4 ap-h-4 ap-drop-shadow-md ${
						local.value && local.value.toLowerCase() === '#ffffff'
							? 'ap-text-slate-700'
							: 'ap-text-white'
					}`}
					fill="currentColor"
					viewBox="0 0 16 16"
				>
					<path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z" />
				</svg>
			</label>
		</div>
	);
}
