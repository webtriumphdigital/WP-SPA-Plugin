import { createSignal, createMemo, createEffect, Show, For } from 'solid-js';
import { Switch, Select, Label, ColorPicker, Slider, Textarea, Tooltip } from '@components';
import { useSettings, useLicense } from '@util/context';

export default function Spinner() {
	const { settings } = useSettings();
	const { isLocked, shakePromo } = useLicense();

	const pluginUrl = window?.td_spa_admin_vars?.plugin?.url || '';

	const [dragOver, setDragOver] = createSignal(false);
	const [showUploadZone, setShowUploadZone] = createSignal(false);

	let fileInputRef;

	const presetSpinners = ['1.gif', '2.gif', '3.gif', '5.gif', '6.gif', '7.gif', '8.gif', '9.gif'];

	const isCustomIcon = createMemo(() => {
		if (!settings.loader_image) return false;
		return !presetSpinners.some(spinner => settings.loader_image.includes(spinner));
	});

	const handleDragOver = (e) => {
		e.preventDefault();
		setDragOver(true);
	};

	const handleDragLeave = () => {
		setDragOver(false);
	};

	const handleDrop = (e) => {
		e.preventDefault();
		setDragOver(false);
		const files = e.dataTransfer.files;
		if (files.length > 0) {
			const file = files[0];
			if (file.type.startsWith('image/')) {
				uploadImageFile(file, 'loader_image');
				setShowUploadZone(false);
			}
		}
	};

	const uploadImageFile = (file, settingKey) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			if (e.target && e.target.result) {
				settings[settingKey] = e.target.result;
				setShowUploadZone(false);
			}
		};
		reader.onerror = (error) => {
			console.error('File reading error:', error);
		};
		reader.readAsDataURL(file);
	};

	const removeCustomIcon = () => {
		settings.loader_image = pluginUrl + 'public/images/loading/1.gif';
		setShowUploadZone(false);
	};

	createEffect(() => {
		const layout = settings.loader_layout;
		if (layout !== 'text_only' && !settings.loader_image) {
			settings.loader_image = pluginUrl + 'public/images/loading/1.gif';
		}
	});

	const fontFamilyOptions = [
		{ value: '', label: 'System Default' },
		{ value: 'Arial, sans-serif', label: 'Arial' },
		{ value: 'Helvetica, sans-serif', label: 'Helvetica' },
		{ value: 'Georgia, serif', label: 'Georgia' },
		{ value: 'Times New Roman, serif', label: 'Times New Roman' },
		{ value: 'Courier New, monospace', label: 'Courier New' },
		{ value: 'Verdana, sans-serif', label: 'Verdana' },
		{ value: 'Trebuchet MS, sans-serif', label: 'Trebuchet MS' },
		{ value: 'Roboto, sans-serif', label: 'Roboto' },
		{ value: 'Open Sans, sans-serif', label: 'Open Sans' },
		{ value: 'Lato, sans-serif', label: 'Lato' },
		{ value: 'Montserrat, sans-serif', label: 'Montserrat' },
		{ value: 'Poppins, sans-serif', label: 'Poppins' }
	];

	const fontWeightOptions = [
		{ value: 'normal', label: 'Normal' },
		{ value: 'bold', label: 'Bold' },
		{ value: 'light', label: 'Light' },
		{ value: 'medium', label: 'Medium' }
	];

	return (
		<div class="ap-space-y-6">
			{/* Layout & Content Card */}
			<div class="ap-bg-white ap-border ap-border-slate-200 ap-rounded-lg ap-p-6 ap-space-y-6">
				<div class="ap-flex ap-items-center ap-justify-between">
					<h4 class="ap-font-semibold ap-text-base ap-text-slate-900">Layout & Content</h4>
					
				</div>

				{/* Layout Selector */}
				<div class="ap-flex ap-flex-col ap-gap-2">
					<Label size="sm">Layout</Label>
					<div class="ap-grid ap-grid-cols-4 ap-gap-2 ap-max-w-full">
						<div
							onClick={() => isLocked() ? shakePromo() : settings.loader_layout = 'icon_only'}
							class="ap-aspect-square ap-p-2 ap-rounded ap-border-2 ap-cursor-pointer ap-transition ap-flex ap-items-center ap-justify-center ap-bg-white hover:ap-border-indigo-400"
							classList={{
								'ap-border-indigo-600 ap-ring-2 ap-ring-indigo-200': settings.loader_layout === 'icon_only',
								'ap-border-slate-200': settings.loader_layout !== 'icon_only',
								'ap-opacity-60': isLocked()
							}}
						>
							<div class="ap-w-[40%] ap-aspect-square ap-bg-slate-300 ap-rounded"></div>
						</div>
						<div
							onClick={() => isLocked() ? shakePromo() : settings.loader_layout = 'icon_left'}
							class="ap-aspect-square ap-p-2 ap-rounded ap-border-2 ap-cursor-pointer ap-transition ap-flex ap-items-center ap-justify-center ap-gap-1 ap-bg-white hover:ap-border-indigo-400"
							classList={{
								'ap-border-indigo-600 ap-ring-2 ap-ring-indigo-200': settings.loader_layout === 'icon_left',
								'ap-border-slate-200': settings.loader_layout !== 'icon_left',
								'ap-opacity-60': isLocked()
							}}
						>
							<div class="ap-w-[30%] ap-aspect-square ap-bg-slate-300 ap-rounded"></div>
							<div class="ap-flex-1 ap-h-[20%] ap-bg-slate-200 ap-rounded"></div>
						</div>
						<div
							onClick={() => isLocked() ? shakePromo() : settings.loader_layout = 'icon_right'}
							class="ap-aspect-square ap-p-2 ap-rounded ap-border-2 ap-cursor-pointer ap-transition ap-flex ap-items-center ap-justify-center ap-gap-1 ap-bg-white hover:ap-border-indigo-400"
							classList={{
								'ap-border-indigo-600 ap-ring-2 ap-ring-indigo-200': settings.loader_layout === 'icon_right',
								'ap-border-slate-200': settings.loader_layout !== 'icon_right',
								'ap-opacity-60': isLocked()
							}}
						>
							<div class="ap-flex-1 ap-h-[20%] ap-bg-slate-200 ap-rounded"></div>
							<div class="ap-w-[30%] ap-aspect-square ap-bg-slate-300 ap-rounded"></div>
						</div>
						<div
							onClick={() => isLocked() ? shakePromo() : settings.loader_layout = 'icon_top'}
							class="ap-aspect-square ap-p-2 ap-rounded ap-border-2 ap-cursor-pointer ap-transition ap-flex ap-flex-col ap-items-center ap-justify-center ap-gap-1 ap-bg-white hover:ap-border-indigo-400"
							classList={{
								'ap-border-indigo-600 ap-ring-2 ap-ring-indigo-200': settings.loader_layout === 'icon_top',
								'ap-border-slate-200': settings.loader_layout !== 'icon_top',
								'ap-opacity-60': isLocked()
							}}
						>
							<div class="ap-w-[40%] ap-aspect-square ap-bg-slate-300 ap-rounded"></div>
							<div class="ap-w-full ap-h-[20%] ap-bg-slate-200 ap-rounded"></div>
						</div>
						<div
							onClick={() => isLocked() ? shakePromo() : settings.loader_layout = 'icon_bottom'}
							class="ap-aspect-square ap-p-2 ap-rounded ap-border-2 ap-cursor-pointer ap-transition ap-flex ap-flex-col ap-items-center ap-justify-center ap-gap-1 ap-bg-white hover:ap-border-indigo-400"
							classList={{
								'ap-border-indigo-600 ap-ring-2 ap-ring-indigo-200': settings.loader_layout === 'icon_bottom',
								'ap-border-slate-200': settings.loader_layout !== 'icon_bottom',
								'ap-opacity-60': isLocked()
							}}
						>
							<div class="ap-w-full ap-h-[20%] ap-bg-slate-200 ap-rounded"></div>
							<div class="ap-w-[40%] ap-aspect-square ap-bg-slate-300 ap-rounded"></div>
						</div>
						<div
							onClick={() => isLocked() ? shakePromo() : settings.loader_layout = 'text_only'}
							class="ap-aspect-square ap-p-2 ap-rounded ap-border-2 ap-cursor-pointer ap-transition ap-flex ap-items-center ap-justify-center ap-bg-white hover:ap-border-indigo-400"
							classList={{
								'ap-border-indigo-600 ap-ring-2 ap-ring-indigo-200': settings.loader_layout === 'text_only',
								'ap-border-slate-200': settings.loader_layout !== 'text_only',
								'ap-opacity-60': isLocked()
							}}
						>
							<div class="ap-w-full ap-h-[20%] ap-bg-slate-200 ap-rounded"></div>
						</div>
					</div>
				</div>

				{/* Spinner Icon */}
				<Show when={settings.loader_layout !== 'text_only'}>
					<hr class="ap-border-0 ap-h-px ap-bg-slate-100" />
					<div class="ap-flex ap-flex-col ap-gap-2">
						<div class="ap-flex ap-items-center ap-justify-between">
							<Label size="sm">Spinner Icon</Label>
							<Tooltip placement="bottom">Upload a custom image or icon.</Tooltip>
						</div>
						<div class="ap-flex ap-flex-col ap-gap-3">
							<div class="ap-flex ap-items-center ap-gap-2 ap-flex-wrap">
								<For each={presetSpinners}>
									{(spinner) => (
										<div
											onClick={() => {
												if (isLocked()) {
													shakePromo();
													return;
												}
												settings.loader_image = pluginUrl + 'public/images/loading/' + spinner;
												setShowUploadZone(false);
											}}
											class="ap-w-12 ap-h-12 ap-p-1 ap-rounded ap-border-2 ap-cursor-pointer ap-transition ap-flex ap-items-center ap-justify-center ap-bg-white hover:ap-border-indigo-400"
											classList={{
												'ap-border-indigo-600 ap-ring-2 ap-ring-indigo-200': settings.loader_image && settings.loader_image.includes(spinner),
												'ap-border-slate-200': !settings.loader_image || !settings.loader_image.includes(spinner),
												'ap-opacity-60': isLocked()
											}}
										>
											<img src={pluginUrl + 'public/images/loading/' + spinner} class="ap-max-w-full ap-h-auto" />
										</div>
									)}
								</For>
								<Show
									when={isCustomIcon()}
									fallback={
										<div
											onClick={() => {
												if (isLocked()) {
													shakePromo();
													return;
												}
												setShowUploadZone(!showUploadZone());
											}}
											class="ap-w-12 ap-h-12 ap-rounded ap-border-2 ap-cursor-pointer ap-transition ap-flex ap-flex-col ap-items-center ap-justify-center ap-bg-gradient-to-br ap-from-slate-50 ap-to-slate-100 hover:ap-from-indigo-50 hover:ap-to-indigo-100"
											classList={{
												'ap-border-indigo-600 ap-ring-2 ap-ring-indigo-200 ap-from-indigo-50 ap-to-indigo-100': showUploadZone(),
												'ap-border-dashed ap-border-slate-300 hover:ap-border-indigo-400': !showUploadZone(),
												'ap-opacity-60': isLocked()
											}}
											title="Upload custom spinner"
										>
											<svg class="ap-w-5 ap-h-5 ap-text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
												<path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
											</svg>
										</div>
									}
								>
									<div class="ap-w-12 ap-h-12 ap-p-1 ap-rounded ap-border-2 ap-transition ap-flex ap-items-center ap-justify-center ap-bg-white ap-relative ap-group ap-border-indigo-600 ap-ring-2 ap-ring-indigo-200" classList={{ 'ap-opacity-60': isLocked() }}>
										<img src={settings.loader_image} class="ap-max-w-full ap-h-full ap-object-contain" />
										<button
											onClick={(e) => {
												e.stopPropagation();
												if (isLocked()) {
													shakePromo();
													return;
												}
												removeCustomIcon();
											}}
											class="ap-absolute ap--top-1 ap--right-1 ap-w-4 ap-h-4 ap-rounded-full ap-bg-red-600 hover:ap-bg-red-700 ap-text-white ap-flex ap-items-center ap-justify-center ap-opacity-0 group-hover:ap-opacity-100 ap-transition-opacity ap-text-xs"
										>×</button>
									</div>
								</Show>
							</div>
							<Show when={showUploadZone() && !isCustomIcon()}>
								<div
									onDragOver={handleDragOver}
									onDragLeave={handleDragLeave}
									onDrop={handleDrop}
									class="ap-p-6 ap-rounded-lg ap-border-2 ap-border-dashed ap-transition-all ap-flex ap-flex-col ap-items-center ap-justify-center ap-gap-3"
									classList={{
										'ap-border-indigo-500 ap-bg-indigo-50': dragOver(),
										'ap-border-slate-300 ap-bg-slate-50': !dragOver(),
										'ap-opacity-60': isLocked()
									}}
								>
									<i class="ap-dashicons ap-dashicons-upload ap-text-3xl" classList={{ 'ap-text-indigo-600': dragOver(), 'ap-text-slate-400': !dragOver() }}></i>
									<div class="ap-text-center">
										<p class="ap-text-sm ap-font-medium" classList={{ 'ap-text-indigo-700': dragOver(), 'ap-text-slate-700': !dragOver() }}>
											{dragOver() ? 'Drop your image here' : 'Drag & drop your custom icon here'}
										</p>
										<p class="ap-text-xs ap-text-slate-500 ap-mt-1">or click below to browse</p>
									</div>
									<button type="button" onClick={() => fileInputRef.click()} class="ap-px-4 ap-py-2 ap-text-sm ap-font-medium ap-text-white ap-bg-indigo-600 hover:ap-bg-indigo-700 ap-rounded ap-transition">Choose File</button>
									<input ref={fileInputRef} type="file" accept="image/*" class="ap-hidden" onChange={(e) => { const file = e.target.files[0]; if (file) uploadImageFile(file, 'loader_image'); }} />
								</div>
							</Show>
						</div>
					</div>
				</Show>

				{/* Loading Message */}
				<Show when={settings.loader_layout !== 'icon_only'}>
					<hr class="ap-border-0 ap-h-px ap-bg-slate-100" />
					<div class="ap-flex ap-flex-col ap-gap-2">
						<div class="ap-flex ap-items-center ap-justify-between">
							<Label size="sm">Loading Message</Label>
							
							<Tooltip placement="bottom">Text to display while content is loading. Leave blank to hide the message.</Tooltip>
						</div>
						<Textarea
							value={settings.loader_message}
							onInput={(e) => isLocked() ? shakePromo() : settings.loader_message = e.target.value}
							readonly={isLocked()}
							onClick={() => isLocked() && shakePromo()}
							class="ap-w-full ap-rounded ap-border-none ap-outline-none hover:ap-shadow ap-ring-1 ap-ring-slate-200 focus:ap-ring-[2px] focus:ap-ring-indigo-600 ap-transition"
							placeholder="Hang tight, we're loading your content..."
						/>
					</div>
				</Show>
			</div>

			{/* Icon Settings Card */}
			<Show when={settings.loader_layout !== 'text_only'}>
				<div class="ap-bg-white ap-border ap-border-slate-200 ap-rounded-lg ap-p-6 ap-space-y-6">
					<div class="ap-flex ap-items-center ap-justify-between">
						<h4 class="ap-font-semibold ap-text-base ap-text-slate-900">Icon Settings</h4>
						
					</div>

					<div class="ap-flex ap-items-center ap-justify-between ap-gap-4">
						<Label size="sm" class="ap-whitespace-nowrap">Image Size</Label>
						<div classList={{ 'ap-opacity-60': isLocked() }}>
							<Slider min={0} max={200} value={settings.loader_image_size} onInput={(v) => settings.loader_image_size = v} locked={isLocked()} class="ap-max-w-[200px]" />
						</div>
					</div>

					<hr class="ap-border-0 ap-h-px ap-bg-slate-100" />

					<div class="ap-flex ap-items-center ap-justify-between ap-gap-4">
						<Label size="sm" class="ap-whitespace-nowrap">Image Rotation</Label>
						<div classList={{ 'ap-opacity-60': isLocked() }}>
							<Slider min={-180} max={180} fill={false} value={settings.loader_image_rotation} onInput={(v) => settings.loader_image_rotation = v} locked={isLocked()} unit="deg" class="ap-max-w-[200px]" />
						</div>
					</div>

					<Show when={settings.loader_message && settings.loader_layout !== 'icon_only'}>
						<hr class="ap-border-0 ap-h-px ap-bg-slate-100" />
						<div class="ap-flex ap-items-center ap-justify-between ap-gap-4">
							<Label size="sm" class="ap-whitespace-nowrap">Gap Between Icon & Text</Label>
							<div classList={{ 'ap-opacity-60': isLocked() }}>
								<Slider value={settings.loader_gap} onInput={(v) => settings.loader_gap = v} locked={isLocked()} class="ap-max-w-[200px]" />
							</div>
						</div>
					</Show>
				</div>
			</Show>

			{/* Typography Card */}
			<Show when={settings.loader_message && settings.loader_layout !== 'icon_only'}>
				<div class="ap-bg-white ap-border ap-border-slate-200 ap-rounded-lg ap-p-6 ap-space-y-6">
					<div class="ap-flex ap-items-center ap-justify-between">
						<h4 class="ap-font-semibold ap-text-base ap-text-slate-900">Typography</h4>
						
					</div>

					<div class="ap-flex ap-items-center ap-justify-between ap-gap-4">
						<Label size="sm" class="ap-whitespace-nowrap">Font Family</Label>
						<Select value={settings.loader_font_family} onChange={(v) => isLocked() ? shakePromo() : settings.loader_font_family = v} placeholder="System Default" options={fontFamilyOptions} class="ap-max-w-[200px]" classList={{ 'ap-opacity-60': isLocked() }} />
					</div>

					<div class="ap-flex ap-items-center ap-justify-between ap-gap-4">
						<Label size="sm" class="ap-whitespace-nowrap">Font Weight</Label>
						<Select value={settings.loader_font_weight} onChange={(v) => isLocked() ? shakePromo() : settings.loader_font_weight = v} options={fontWeightOptions} placeholder="Normal" class="ap-max-w-[200px]" classList={{ 'ap-opacity-60': isLocked() }} />
					</div>

					<hr class="ap-border-0 ap-h-px ap-bg-slate-100" />

					<div class="ap-flex ap-items-center ap-justify-between ap-gap-4">
						<Label size="sm" class="ap-whitespace-nowrap">Font Size</Label>
						<div classList={{ 'ap-opacity-60': isLocked() }}>
							<Slider value={settings.loader_font_size} onInput={(v) => settings.loader_font_size = v} locked={isLocked()} min={6} max={180} step={2} class="ap-max-w-[200px]" />
						</div>
					</div>

					<div class="ap-flex ap-items-center ap-justify-between ap-gap-4">
						<Label size="sm" class="ap-whitespace-nowrap">Letter Spacing</Label>
						<div classList={{ 'ap-opacity-60': isLocked() }}>
							<Slider value={settings.loader_letter_spacing} onInput={(v) => settings.loader_letter_spacing = v} locked={isLocked()} max={30} min={-2} class="ap-max-w-[200px]" />
						</div>
					</div>
				</div>
			</Show>

			{/* Backdrop Card */}
			<div class="ap-bg-white ap-border ap-border-slate-200 ap-rounded-lg ap-p-6 ap-space-y-6">
				<div class="ap-flex ap-items-center ap-justify-between">
					<h4 class="ap-font-semibold ap-text-base ap-text-slate-900">Backdrop</h4>
					
				</div>

				<Show when={settings.loader_message && settings.loader_layout !== 'icon_only'}>
					<div class="ap-flex ap-flex-col sm:ap-flex-row sm:ap-items-center sm:ap-justify-between ap-gap-2 sm:ap-gap-4">
						<Label size="sm" class="ap-whitespace-nowrap">Text Color</Label>
						<ColorPicker value={settings.loader_color} onInput={(v) => isLocked() ? shakePromo() : settings.loader_color = v} classList={{ 'ap-opacity-60': isLocked() }} />
					</div>
					<hr class="ap-border-0 ap-h-px ap-bg-slate-100" />
				</Show>

				<div class="ap-flex ap-flex-col sm:ap-flex-row sm:ap-items-center sm:ap-justify-between ap-gap-2 sm:ap-gap-4">
					<Label size="sm" class="ap-whitespace-nowrap">Background Color</Label>
					<ColorPicker value={settings.loader_background} onInput={(v) => isLocked() ? shakePromo() : settings.loader_background = v} colors={['#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0', '#1f2937']} classList={{ 'ap-opacity-60': isLocked() }} />
				</div>

				<hr class="ap-border-0 ap-h-px ap-bg-slate-100" />

				<div class="ap-flex ap-flex-col sm:ap-flex-row sm:ap-items-center sm:ap-justify-between ap-gap-2 sm:ap-gap-3">
					<Label size="sm">Background Transparency</Label>
					<div class="ap-flex ap-items-center ap-gap-3 ap-flex-1 sm:ap-max-w-[200px]">
						<div class="ap-relative ap-flex-1" classList={{ 'ap-cursor-pointer': isLocked() }} onClick={() => isLocked() && shakePromo()}>
							<input
								value={settings.loader_background_opacity || 100}
								onInput={(e) => isLocked() ? shakePromo() : settings.loader_background_opacity = e.target.value}
								type="range"
								class="td-spa-slider td-spa-opacity ap-w-full"
								classList={{ 'ap-opacity-60 ap-pointer-events-none': isLocked() }}
								style={{ color: settings.loader_background }}
							/>
						</div>
						<span class="ap-min-w-[3rem] ap-text-right ap-text-sm ap-text-slate-600">{settings.loader_background_opacity || 100}%</span>
					</div>
				</div>
			</div>
		</div>
	);
}
