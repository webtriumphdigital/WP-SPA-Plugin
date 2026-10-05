import { splitProps } from 'solid-js';

export default function Subtitle(props) {
	const [local, others] = splitProps(props, ['children', 'class']);

	return (
		<span
			class={`ap-text-sm ap-font-normal ap-text-slate-500 ${local.class || ''}`}
			{...others}
		>
			{local.children}
		</span>
	);
}
