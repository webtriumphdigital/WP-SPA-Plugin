import { createSignal, splitProps, mergeProps, createMemo } from 'solid-js';

export default function Text(props) {
	const merged = mergeProps(
		{
			value: '',
			type: 'text',
			pattern: null,
			error: false,
			size: 'md',
		},
		props
	);

	const [local, others] = splitProps(merged, [
		'value',
		'type',
		'pattern',
		'error',
		'size',
		'onInput',
		'class',
	]);

	const [internalError, setInternalError] = createSignal(false);

	const sizeClasses = createMemo(() => {
		const sizes = {
			sm: 'ap-px-3 ap-py-1.5 ap-text-sm ap-rounded-md',
			md: 'ap-px-4 ap-py-2 ap-text-sm ap-rounded-lg',
			lg: 'ap-px-6 ap-py-3 ap-text-base ap-rounded-lg',
		};
		return sizes[local.size];
	});

	const handleInput = (e) => {
		setInternalError(false);
		local.onInput?.(e);
	};

	return (
		<input
			class={`td-spa-input-text ap-w-full ap-transition-all ap-duration-150 ap-border ap-bg-white ap-text-slate-900 ap-placeholder-slate-400 ap-focus:ap-outline-none ap-focus:ap-ring-2 ap-focus:ap-ring-offset-1 disabled:ap-opacity-50 disabled:ap-cursor-not-allowed disabled:ap-bg-slate-50 ${sizeClasses()} ${local.class || ''}`}
			classList={{
				'ap-border-slate-300 ap-focus:ap-border-indigo-500 ap-focus:ap-ring-indigo-500':
					!internalError() && !local.error,
				'ap-border-red-300 ap-focus:ap-border-red-500 ap-focus:ap-ring-red-500':
					internalError() || local.error,
				'ap-pr-0': local.type === 'number',
			}}
			type={local.type}
			value={local.value}
			onInput={handleInput}
			{...others}
		/>
	);
}
