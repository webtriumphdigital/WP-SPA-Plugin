import { createSignal, Show } from 'solid-js';
import { Textarea, Label, Subtitle, Tooltip, CodeEditor, Button } from '@components';
import { useSettings, useLicense, useModal } from '@util/context';

export default function Advanced() {
	const { settings, importSettings, resetSettings, exportSettings, state } = useSettings();
	const { isLocked, shakePromo } = useLicense();
	const { fire, toast } = useModal();

	const [resetting, setResetting] = createSignal(false);

	const handleInput = (field) => (e) => {
		if (isLocked()) {
			shakePromo();
			return;
		}
		settings[field] = e.target.value;
	};

	const handleImportSettings = async (e) => {
		const file = e.target.files[0];
		e.target.value = null;

		if (!file || file.type !== 'application/json') {
			return fire({
				title: 'Invalid JSON File!',
				content: 'Please upload a valid JSON file exported from TD SPA.'
			});
		}

		const reader = new FileReader();
		reader.onload = async (event) => {
			try {
				const result = JSON.parse(event.target.result);

				if (!result || result.type !== 'td_spa_settings') {
					return fire({
						title: 'Invalid JSON File!',
						content: 'Please upload a valid JSON file exported from TD SPA.'
					});
				}

				const isConfirmed = await fire({
					title: 'Sure to import?',
					content: 'This will replace your current settings.',
					ok: 'Yes, import',
					reverse: true,
				});

				if (!isConfirmed) return;

				await importSettings(result);
				toast('Settings imported!');

			} catch (error) {
				return fire({
					title: 'Invalid JSON File!',
					content: 'Please upload a valid JSON file exported from TD SPA.'
				});
			}
		};

		reader.readAsText(file);
	};

	const handleResetSettings = async () => {
		const isConfirmed = await fire({
			title: 'Are you sure?',
			content: 'Are you sure to clear all the changes you have made to default?',
			ok: "I'm sure",
		});

		if (!isConfirmed) return;

		const reConfirmed = await fire({
			title: 'Caution!',
			content: 'This can NOT be undone, please make sure that you have exported backup.',
			ok: 'Yes, Clear',
		});

		if (!reConfirmed) return;

		setResetting('Resetting');

		await resetSettings();

		setResetting(false);

		fire({
			title: 'Successfully cleared!',
			content: 'All the changes you have made is clear now.',
			ok: true
		});
	};

	return (
		<div class="ap-space-y-8">
			{/* Media Players */}
			<div data-tour="exclude-elements" class="ap-flex ap-flex-col ap-gap-1 ap-w-full">
				<Label>
					Media Players
					
					<Tooltip>
						<>
							<strong>Media Players</strong><br /><br />
							Add your media player's ID, class, or CSS selector here. These elements will remain untouched during page navigation, keeping audio/video playing without interruption.<br /><br />
							<strong>Examples:</strong>
							<ul class="ap-list-disc ap-pl-4 ap-mt-1 ap-space-y-1">
								<li>ID: <code>#my-player</code></li>
								<li>Class: <code>.audio-player</code></li>
								<li>Tag: <code>audio</code>, <code>video</code></li>
							</ul>
						</>
					</Tooltip>
				</Label>
				<Textarea
					placeholder="#my-player, .audio-player, audio"
					value={settings.ignore_elements}
					onInput={handleInput('ignore_elements')}
					readonly={isLocked()}
					onClick={() => isLocked() && shakePromo()}
				/>
				<Subtitle>Add elements you want to keep untouched during navigation.</Subtitle>
			</div>

			{/* Exclude Links */}
			<div data-tour="exclude-links" class="ap-flex ap-flex-col ap-gap-1 ap-w-full">
				<Label>
					Exclude Links
					
					<Tooltip>
						<>
							<strong>Exclude Links</strong><br /><br />
							URLs or patterns to exclude from AJAX navigation. These links will reload the page normally. Enter one pattern per line.<br /><br />
							<strong>Supported formats:</strong>
							<ul class="ap-list-disc ap-pl-4 ap-mt-1 ap-space-y-1">
								<li>Partial URL: <code>sample-page</code></li>
								<li>Wildcard: <code>/shop/*</code></li>
								<li>Regex: <code>/^\/admin/</code></li>
							</ul>
							<br />
							<strong>Example:</strong>
							<pre class="ap-bg-slate-100 ap-p-2 ap-rounded ap-text-xs ap-mt-1">checkout{"\n"}/cart/*{"\n"}/^\/my-account/</pre>
						</>
					</Tooltip>
				</Label>
				<Textarea
					placeholder={"sample-page\n/cart/*\n/^\/checkout/"}
					value={settings.ignore_links}
					onInput={handleInput('ignore_links')}
					readonly={isLocked()}
					onClick={() => isLocked() && shakePromo()}
				/>
				<Subtitle>Enter one pattern per line. Regex supported.</Subtitle>
			</div>

			{/* Custom CSS */}
			<div data-tour="custom-css" class="ap-p-5 ap-bg-white ap-rounded-lg ap-border ap-border-slate-200 ap-transition-colors hover:ap-border-slate-300">
				<div class="ap-flex ap-flex-col ap-gap-2 ap-w-full">
					<div class="ap-flex ap-items-center ap-justify-between ap-gap-2">
						<Label>
							Custom CSS
							
						</Label>
						<Tooltip placement="bottom">
							<>
								<strong>Custom CSS Styles</strong><br /><br />
								Add your own CSS to customize the appearance of TD SPA elements like progress bar, spinner, modal, and animations.<br /><br />
								<strong>Example:</strong>
								<pre class="ap-bg-slate-100 ap-p-2 ap-rounded ap-text-xs ap-mt-1">.td-spa-progressbar {"{"}<br />  border-radius: 4px;<br />{"}"}</pre>
								<br />
								<a href="#/help" class="ap-text-indigo-600 hover:ap-text-indigo-700 ap-underline">View all CSS selectors</a>
							</>
						</Tooltip>
					</div>
					<CodeEditor
						language="css"
						placeholder="/* Custom CSS for progress bar, loader, etc. */"
						value={settings.custom_css}
						onChange={(v) => isLocked() ? shakePromo() : settings.custom_css = v}
						readonly={isLocked()}
						onClick={() => isLocked() && shakePromo()}
						lines={10}
					/>
					<Subtitle>Custom styles for progress bar, loader, and other elements.</Subtitle>
				</div>
			</div>

			{/* Tools Section */}
			<div class="ap-pt-4 ap-border-t ap-border-slate-200">
				<div class="ap-flex ap-items-center ap-gap-2 ap-mb-4">
					<h3 class="ap-text-lg ap-font-semibold ap-text-slate-900">Tools</h3>
					
				</div>

				<div class="ap-bg-white ap-border ap-border-slate-200 ap-rounded-lg ap-p-5" classList={{ 'ap-opacity-60': isLocked() }}>
					<div class="ap-flex ap-flex-wrap ap-items-center ap-gap-4">
						{/* Export */}
						<div class="ap-flex ap-items-center ap-gap-3">
							<span class="ap-text-sm ap-text-slate-600">Export settings</span>
							<Button
								size="sm"
								onClick={() => isLocked() ? shakePromo() : exportSettings()}
								loading={state.exporting}
							>
								Export
							</Button>
						</div>

						<div class="ap-w-px ap-h-6 ap-bg-slate-200 ap-hidden sm:ap-block" />

						{/* Import */}
						<div class="ap-flex ap-items-center ap-gap-3">
							<span class="ap-text-sm ap-text-slate-600">Import settings</span>
							<div class="ap-relative">
								<input
									onInput={handleImportSettings}
									type="file"
									accept="application/json"
									class="ap-absolute ap-inset-0 ap-w-full ap-h-full ap-opacity-0 ap-cursor-pointer ap-z-10"
									classList={{ 'ap-pointer-events-none': isLocked() }}
								/>
								<Button size="sm" onClick={() => isLocked() && shakePromo()}>
									Import
								</Button>
							</div>
						</div>

						<div class="ap-w-px ap-h-6 ap-bg-slate-200 ap-hidden sm:ap-block" />

						{/* Reset */}
						<div class="ap-flex ap-items-center ap-gap-3">
							<span class="ap-text-sm ap-text-slate-600">Reset to defaults</span>
							<Button
								size="sm"
								class="ap-bg-red-500 hover:ap-bg-red-600 ap-text-white ap-border-red-500"
								loading={resetting()}
								onClick={() => isLocked() ? shakePromo() : handleResetSettings()}
							>
								Reset
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
