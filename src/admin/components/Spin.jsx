import { splitProps, mergeProps } from 'solid-js';

export default function Spin(props) {
	const [local, others] = splitProps(props, ['class']);

	return (
		<div
			class={`ap-inline-flex ap-w-0 ap-h-0 ap-rounded-full ap-border-[6px] ap-border-current ap-animate-spin ap-border-r-transparent ${local.class || ''}`}
			{...others}
		/>
	);
}
