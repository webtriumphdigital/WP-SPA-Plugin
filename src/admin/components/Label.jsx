import { Show, splitProps, mergeProps, createMemo } from 'solid-js';
import Tooltip from './Tooltip';
import Subtitle from './Subtitle';

export default function Label(props) {
	const merged = mergeProps(
		{
			subtitle: '',
			size: 'base',
		},
		props
	);

	const [local, others] = splitProps(merged, [
		'subtitle',
		'size',
		'children',
		'tooltip',
		'class',
	]);

	const labelSizeClass = createMemo(() => {
		return local.size === 'sm'
			? 'ap-text-sm ap-font-medium'
			: 'ap-text-base ap-font-semibold';
	});

	return (
		<div class={`ap-flex ap-flex-col ap-gap-1 ${local.class || ''}`} {...others}>
			<label
				class={`${labelSizeClass()} ap-text-slate-700 ap-flex ap-flex-wrap ap-items-center ap-gap-x-1 ap-gap-y-0.5`}
			>
				{local.children}
				<Show when={local.tooltip}>
					<Tooltip placement="bottom">{local.tooltip}</Tooltip>
				</Show>
			</label>
			<Show when={local.subtitle}>
				<Subtitle>{local.subtitle}</Subtitle>
			</Show>
		</div>
	);
}
