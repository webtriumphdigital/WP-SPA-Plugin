import { splitProps, mergeProps } from 'solid-js';

export default function Textarea(props) {
	const merged = mergeProps(
		{
			value: '',
			error: false,
		},
		props
	);

	const [local, others] = splitProps(merged, ['value', 'error', 'onInput', 'class']);

	const handleInput = (e) => {
		local.onInput?.(e);
	};

	return (
		<textarea
			class={`td-spa-textarea ap-w-full ap-transition-all ap-duration-150 ap-text-sm ap-px-3 ap-py-2 ap-rounded-lg ap-border ap-bg-white ap-text-slate-900 ap-placeholder-slate-400 ap-focus:ap-outline-none ap-focus:ap-ring-2 ap-focus:ap-ring-offset-1 disabled:ap-opacity-50 disabled:ap-cursor-not-allowed disabled:ap-bg-slate-50 ap-resize-y ap-min-h-[80px] ${local.class || ''}`}
			classList={{
				'ap-border-slate-300 ap-focus:ap-border-indigo-500 ap-focus:ap-ring-indigo-500':
					!local.error,
				'ap-border-red-300 ap-focus:ap-border-red-500 ap-focus:ap-ring-red-500':
					local.error,
			}}
			value={local.value}
			onInput={handleInput}
			{...others}
		/>
	);
}
