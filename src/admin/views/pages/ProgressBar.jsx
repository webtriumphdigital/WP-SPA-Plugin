import { createMemo, Show } from 'solid-js';
import { Switch, Label, SegmentedControl, ColorPicker } from '@components';
import { useSettings, useLicense } from '@util/context';

export default function ProgressBar() {
	const { settings } = useSettings();
	const { isLocked, shakePromo } = useLicense();

	const progressbarPositionOptions = [
		{ value: 'top', label: 'Top' },
		{ value: 'bottom', label: 'Bottom' }
	];

	const animationSpeedOptions = [
		{ value: '2.5', label: 'Slow' },
		{ value: '1.5', label: 'Normal' },
		{ value: '0.8', label: 'Fast' }
	];

	const thicknessOptions = [
		{ value: 'thin', label: 'Thin' },
		{ value: 'normal', label: 'Normal' },
		{ value: 'large', label: 'Large' },
		{ value: 'custom', label: 'Custom' }
	];

	const isValidThickness = createMemo(() => {
		const value = settings.progressbar_weight_custom;
		if (!value) return true;
		const validPattern = /^-?\d+(\.\d+)?(px|rem|em|%|vh|vw|vmin|vmax|ch|ex)$/i;
		return validPattern.test(value.trim());
	});

	const handleThicknessKeydown = (event) => {
		if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
		event.preventDefault();
		const currentValue = settings.progressbar_weight_custom || '7px';
		const match = currentValue.match(/^(-?\d+(?:\.\d+)?)(px|rem|em|%|vh|vw|vmin|vmax|ch|ex)?$/i);
		if (!match) return;
		let number = parseFloat(match[1]);
		const unit = match[2] || 'px';
		number += event.key === 'ArrowUp' ? 1 : -1;
		if (number < 0) number = 0;
		const formattedNumber = number % 1 === 0 ? number.toString() : number.toFixed(1);
		settings.progressbar_weight_custom = formattedNumber + unit;
	};

	const adjustThickness = (direction) => {
		const currentValue = settings.progressbar_weight_custom || '7px';
		const match = currentValue.match(/^(-?\d+(?:\.\d+)?)(px|rem|em|%|vh|vw|vmin|vmax|ch|ex)?$/i);
		if (!match) return;
		let number = parseFloat(match[1]);
		const unit = match[2] || 'px';
		number += direction === 'increase' ? 1 : -1;
		if (number < 0) number = 0;
		const formattedNumber = number % 1 === 0 ? number.toString() : number.toFixed(1);
		settings.progressbar_weight_custom = formattedNumber + unit;
	};

	return (
		<div class="ap-space-y-6">
			{/* Settings Card */}
			<div class="ap-bg-white ap-border ap-border-slate-200 ap-rounded-lg ap-p-6 ap-space-y-6">
				<div class="ap-flex ap-items-center ap-justify-between">
					<h4 class="ap-font-semibold ap-text-base ap-text-slate-900">Progress Bar</h4>
					
				</div>

				{/* Position */}
				<div class="ap-flex ap-flex-col sm:ap-flex-row sm:ap-items-center sm:ap-justify-between ap-gap-2 sm:ap-gap-4">
					<Label size="sm">Position</Label>
					<SegmentedControl
						value={settings.progressbar_position}
						onChange={(v) => settings.progressbar_position = v}
						options={progressbarPositionOptions}
					/>
				</div>

				<hr class="ap-border-0 ap-h-px ap-bg-slate-100" />

				{/* Bar Thickness, Color, Transparency - Inline */}
				<div class="ap-flex ap-flex-wrap ap-gap-4">
					{/* Bar Thickness */}
					<div class="ap-flex ap-flex-col ap-gap-1">
						<Label size="sm" class="ap-whitespace-nowrap">Thickness</Label>
						<SegmentedControl
							value={settings.progressbar_weight}
							onChange={(v) => isLocked() ? shakePromo() : settings.progressbar_weight = v}
							options={thicknessOptions}
							classList={{ 'ap-opacity-60': isLocked() }}
						/>
					</div>

					{/* Bar Color */}
					<div class="ap-flex ap-flex-col ap-gap-1">
						<Label size="sm" class="ap-whitespace-nowrap">Color</Label>
						<ColorPicker
							value={settings.progressbar_color}
							onInput={(v) => isLocked() ? shakePromo() : settings.progressbar_color = v}
							colors={['#0ea5e9', '#a855f7', '#6366f1', '#0077b6', '#808000', '#cd5c5c', '#1f2937']}
							classList={{ 'ap-opacity-60': isLocked() }}
						/>
					</div>

					{/* Bar Transparency */}
					<div class="ap-flex ap-flex-col ap-gap-1 ap-min-w-[140px]">
						<Label size="sm" class="ap-whitespace-nowrap">Transparency</Label>
						<div class="ap-flex ap-items-center ap-gap-2">
							<div class="ap-relative ap-flex-1" classList={{ 'ap-cursor-pointer': isLocked() }} onClick={() => isLocked() && shakePromo()}>
								<input
									value={settings.progressbar_opacity || 100}
									onInput={(e) => isLocked() ? shakePromo() : settings.progressbar_opacity = e.target.value}
									type="range"
									class="td-spa-slider td-spa-opacity ap-w-full !ap-h-[34px]"
									classList={{ 'ap-opacity-60 ap-pointer-events-none': isLocked() }}
									style={{ color: settings.progressbar_color }}
								/>
							</div>
							<span class="ap-text-sm ap-text-slate-600">{settings.progressbar_opacity || 100}%</span>
						</div>
					</div>
				</div>

				{/* Custom Thickness */}
				<Show when={settings.progressbar_weight === 'custom'}>
					<div class="ap-flex ap-items-center ap-gap-4">
						<Label size="sm" class="ap-whitespace-nowrap">Custom Size</Label>
						<div class="ap-flex ap-flex-col ap-gap-1">
							<div
								class="ap-inline-flex ap-items-stretch ap-rounded-md ap-border ap-overflow-hidden ap-transition-all focus-within:ap-ring-2 focus-within:ap-ring-indigo-500 focus-within:ap-ring-offset-1"
								classList={{
									'ap-border-slate-300 focus-within:ap-border-indigo-500': isValidThickness(),
									'ap-border-red-500 focus-within:ap-border-red-500 focus-within:ap-ring-red-500': !isValidThickness(),
									'ap-opacity-60': isLocked()
								}}
							>
								<button
									type="button"
									onClick={() => isLocked() ? shakePromo() : adjustThickness('decrease')}
									class="ap-px-2 ap-bg-slate-50 hover:ap-bg-slate-100 active:ap-bg-slate-200 ap-text-slate-600 ap-transition-colors ap-duration-150 ap-flex ap-items-center ap-justify-center ap-border-r ap-border-slate-300"
								>
									<svg class="ap-w-3 ap-h-3" fill="currentColor" viewBox="0 0 16 16">
										<path d="M4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8z" />
									</svg>
								</button>
								<input
									type="text"
									value={settings.progressbar_weight_custom || ''}
									onInput={(e) => isLocked() ? shakePromo() : settings.progressbar_weight_custom = e.target.value}
									readonly={isLocked()}
									onClick={() => isLocked() && shakePromo()}
									placeholder="7px"
									style={{ 'max-width': '70px' }}
									class="td-spa-input-text ap-transition-all ap-duration-150 ap-border-none ap-bg-white ap-text-slate-900 ap-placeholder-slate-400 focus:ap-outline-none focus:ap-ring-0 focus:ap-bg-indigo-50 ap-px-3 ap-py-1.5 ap-text-sm ap-text-center"
									onKeyDown={handleThicknessKeydown}
								/>
								<button
									type="button"
									onClick={() => isLocked() ? shakePromo() : adjustThickness('increase')}
									class="ap-px-2 ap-bg-slate-50 hover:ap-bg-slate-100 active:ap-bg-slate-200 ap-text-slate-600 ap-transition-colors ap-duration-150 ap-flex ap-items-center ap-justify-center ap-border-l ap-border-slate-300"
								>
									<svg class="ap-w-3 ap-h-3" fill="currentColor" viewBox="0 0 16 16">
										<path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z" />
									</svg>
								</button>
							</div>
							<Show when={!isValidThickness()}>
								<span class="ap-text-xs ap-text-red-600">Invalid CSS value</span>
							</Show>
						</div>
					</div>
				</Show>

				<hr class="ap-border-0 ap-h-px ap-bg-slate-100" />

				{/* Wave Animation */}
				<Switch
					value={settings.progressbar_animate}
					onChange={(v) => isLocked() ? shakePromo() : settings.progressbar_animate = v}
					plain={true}
					size="sm"
					locked={isLocked()}
					tooltip={
						<>
							<strong>Add a wave/shimmer effect</strong> to the progress bar.<br /><br />
							Creates a moving gradient animation that makes the progress bar more visually dynamic.
						</>
					}
				>
					Animate Bar Background
				</Switch>

				{/* Animation Speed */}
				<Show when={settings.progressbar_animate}>
					<hr class="ap-border-0 ap-h-px ap-bg-slate-100" />
					<div class="ap-flex ap-flex-col sm:ap-flex-row sm:ap-items-center sm:ap-justify-between ap-gap-2 sm:ap-gap-4">
						<Label size="sm" class="ap-whitespace-nowrap">Animation Speed</Label>
						<SegmentedControl
							value={settings.progressbar_animation_speed}
							onChange={(v) => isLocked() ? shakePromo() : settings.progressbar_animation_speed = v}
							options={animationSpeedOptions}
							classList={{ 'ap-opacity-60': isLocked() }}
						/>
					</div>
				</Show>
			</div>
		</div>
	);
}
