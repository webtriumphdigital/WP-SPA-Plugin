import { Show, splitProps, mergeProps } from 'solid-js';
import Label from './Label';
import Subtitle from './Subtitle';
import Tooltip from './Tooltip';

import { useLicense } from '@util/context';

export default function Switch(props) {
	const { shakePromo } = useLicense();
	const merged = mergeProps(
		{
			value: false,
			subtitle: '',
			disabled: false,
			plain: false,
			size: 'base',
			locked: false,
		},
		props
	);

	const [local, others] = splitProps(merged, [
		'value',
		'onInput',
		'onChange',
		'subtitle',
		'disabled',
		'plain',
		'size',
		'children',
		'tooltip',
		'content',
		'class',
		'locked',
		'badge',
	]);

	const toggle = () => {
		if (local.disabled) return;
		if (local.locked) {
			shakePromo();
			return;
		}
		local.onInput?.(!local.value);
		local.onChange?.(!local.value);
	};

	const handleKeydown = (e) => {
		if (local.disabled) return;
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			toggle();
		}
	};

	return (
		<div
			class={`ap-flex ap-flex-col ap-gap-1.5 sm:ap-gap-2 ap-relative ap-w-full ${local.class || ''}`}
			classList={{
				'ap-p-3 sm:ap-p-5 ap-bg-white ap-rounded-lg ap-border ap-border-slate-200 ap-transition-colors hover:ap-border-slate-300':
					!local.plain,
			}}
			{...others}
		>
			<div class="ap-flex ap-items-start sm:ap-items-center ap-gap-2 sm:ap-gap-4">
				<button
					type="button"
					role="switch"
					aria-checked={local.value}
					aria-disabled={local.disabled}
					disabled={local.disabled}
					onClick={(e) => {
						e.preventDefault();
						toggle();
					}}
					onKeyDown={handleKeydown}
					class="ap-relative ap-inline-flex ap-items-center ap-flex-shrink-0 ap-cursor-pointer ap-focus:ap-outline-none ap-focus:ap-ring-2 ap-focus:ap-ring-offset-1 ap-focus:ap-ring-indigo-500 ap-rounded-full switch-container ap-w-11 ap-h-6 ap-mt-0.5 sm:ap-mt-0"
					classList={{
						'ap-cursor-not-allowed ap-opacity-50': local.disabled || local.locked,
					}}
				>
					<div
						class="ap-absolute ap-inset-0 ap-rounded-full switch-track"
						classList={{
							'switch-track-on': local.value && !local.disabled,
							'switch-track-off': !local.value || local.disabled,
						}}
					/>
					<div
						class="ap-absolute ap-inset-0 ap-rounded-full ap-bg-slate-200 switch-overlay ap-z-[5]"
						classList={{
							'ap-scale-100': local.disabled || !local.value,
							'ap-scale-0': local.value && !local.disabled,
						}}
					/>
					<span
						class="ap-relative ap-z-10 ap-inline-block ap-h-5 ap-w-5 ap-rounded-full ap-bg-white switch-thumb"
						style={{
							transform: local.value
								? 'translateX(calc(2.75rem - 1.25rem - 0.125rem))'
								: 'translateX(0.125rem)',
						}}
					/>
				</button>
				<div
					onClick={() => !local.disabled && toggle()}
					class="ap-flex ap-flex-row ap-items-center ap-flex-wrap ap-gap-1 sm:ap-gap-2 ap-flex-1 ap-min-w-0"
					classList={{
						'ap-cursor-pointer': !local.disabled,
						'ap-cursor-not-allowed': local.disabled,
					}}
				>
					<Label size={local.size} class="ap-text-slate-900 ap-leading-snug switch-label">
						{local.children}
					</Label>
					<Show when={local.badge}>
						{local.badge}
					</Show>
				</div>
				<Show when={local.tooltip}>
					<Tooltip placement="bottom" class="ap-flex-shrink-0 ap-flex ap-items-center ap-self-start sm:ap-self-center ap-mt-0.5 sm:ap-mt-0">
						{local.tooltip}
					</Tooltip>
				</Show>
			</div>
			<Show when={local.subtitle}>
				<Subtitle class="ap-text-sm ap-text-slate-500 ap-leading-relaxed">
					{local.subtitle}
				</Subtitle>
			</Show>
			<Show when={local.content}>
				<div class="ap-w-full">{local.content}</div>
			</Show>
		</div>
	);
}
