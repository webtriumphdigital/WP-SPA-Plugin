import { Show, splitProps, mergeProps, createMemo } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import Spin from './Spin';

export default function Button(props) {
	const merged = mergeProps(
		{
			a: false,
			loading: '',
			disabled: false,
			variant: 'primary',
			size: 'md',
		},
		props
	);

	const [local, others] = splitProps(merged, [
		'a',
		'loading',
		'disabled',
		'variant',
		'size',
		'children',
		'class',
		'onClick',
	]);

	const buttonClasses = createMemo(() => {
		const base =
			'ap-inline-flex ap-items-center ap-justify-center ap-font-medium ap-transition-all ap-duration-150 ap-ease-in-out ap-focus:ap-outline-none ap-focus:ap-ring-2 ap-focus:ap-ring-offset-2 disabled:ap-opacity-50 disabled:ap-pointer-events-none disabled:ap-cursor-not-allowed';

		const variants = {
			primary:
				'ap-bg-indigo-500 ap-text-white ap-shadow-sm hover:ap-bg-indigo-600 hover:ap-shadow-md active:ap-bg-indigo-700 active:ap-shadow-sm focus:ap-ring-indigo-500',
			secondary:
				'ap-bg-white ap-text-slate-700 ap-shadow-sm ap-border ap-border-slate-300 hover:ap-bg-slate-50 hover:ap-shadow-md active:ap-bg-slate-100 active:ap-shadow-sm focus:ap-ring-indigo-500',
			danger:
				'ap-bg-red-500 ap-text-white ap-shadow-sm hover:ap-bg-red-600 hover:ap-shadow-md active:ap-bg-red-700 active:ap-shadow-sm focus:ap-ring-red-500',
			ghost: 'ap-bg-transparent ap-text-slate-700 hover:ap-bg-slate-100 active:ap-bg-slate-200 focus:ap-ring-indigo-500',
		};

		const sizes = {
			sm: 'ap-px-3 ap-py-1.5 ap-text-sm ap-rounded-md ap-gap-1.5',
			md: 'ap-px-4 ap-py-2 ap-text-sm ap-rounded-lg ap-gap-2',
			lg: 'ap-px-6 ap-py-3 ap-text-base ap-rounded-lg ap-gap-2.5',
		};

		return `${base} ${variants[local.variant]} ${sizes[local.size]}`;
	});

	return (
		<Dynamic
			component={local.a ? 'a' : 'button'}
			disabled={local.loading || local.disabled}
			class={`${buttonClasses()} ${local.loading ? 'ap-cursor-wait' : ''} ${local.class || ''}`}
			onClick={local.onClick}
			{...others}
		>
			<Show when={local.loading}>
				<Spin class="ap-w-4 ap-h-4" />
				<span innerHTML={local.loading} />
			</Show>
			<Show when={!local.loading}>{local.children}</Show>
		</Dynamic>
	);
}
