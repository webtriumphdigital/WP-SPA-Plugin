import { createSignal, onMount, onCleanup, createEffect, splitProps, mergeProps } from 'solid-js';

export default function CodeEditor(props) {
	const merged = mergeProps(
		{
			value: '',
			language: 'javascript',
			readonly: false,
			placeholder: '',
			lines: 4,
		},
		props
	);

	const [local, others] = splitProps(merged, [
		'value',
		'language',
		'readonly',
		'placeholder',
		'lines',
		'onInput',
		'onChange',
		'onClick',
		'class',
	]);

	let textareaRef;
	let editorInstance;

	const initializeEditor = () => {
		if (!textareaRef || !window.wp || !window.wp.codeEditor) {
			return;
		}

		const settings = {
			codemirror: {
				mode: local.language,
				lineNumbers: true,
				indentUnit: 2,
				tabSize: 2,
				indentWithTabs: false,
				lineWrapping: true,
				readOnly: local.readonly ? 'nocursor' : false,
				theme: 'default',
				extraKeys: {
					'Ctrl-Space': 'autocomplete',
				},
			},
		};

		try {
			editorInstance = window.wp.codeEditor.initialize(textareaRef, settings);

			if (editorInstance && editorInstance.codemirror) {
				// Calculate height based on lines prop (~25px per line)
				const height = local.lines * 25;
				editorInstance.codemirror.setSize(null, height);

				// Make the wrapper resizable
				const wrapper = editorInstance.codemirror.getWrapperElement();
				if (wrapper) {
					wrapper.style.resize = 'vertical';
					wrapper.style.overflow = 'auto';
					wrapper.style.minHeight = height + 'px';
				}

				editorInstance.codemirror.on('change', (cm) => {
					const value = cm.getValue();
					local.onInput?.(value);
					local.onChange?.(value);
				});
			}
		} catch (error) {
			console.error('Failed to initialize code editor:', error);
		}
	};

	createEffect(() => {
		if (editorInstance && editorInstance.codemirror) {
			const currentValue = editorInstance.codemirror.getValue();
			if (currentValue !== local.value) {
				editorInstance.codemirror.setValue(local.value || '');
			}
		}
	});

	createEffect(() => {
		const isReadonly = props.readonly;
		if (editorInstance && editorInstance.codemirror) {
			editorInstance.codemirror.setOption('readOnly', isReadonly ? 'nocursor' : false);
		}
	});

	onMount(() => {
		if (window.wp && window.wp.codeEditor) {
			initializeEditor();
		} else {
			const checkCodeEditor = setInterval(() => {
				if (window.wp && window.wp.codeEditor) {
					clearInterval(checkCodeEditor);
					initializeEditor();
				}
			}, 100);

			setTimeout(() => clearInterval(checkCodeEditor), 5000);
		}
	});

	onCleanup(() => {
		if (editorInstance && editorInstance.codemirror) {
			editorInstance.codemirror.toTextArea();
		}
	});

	return (
		<div
			class={`td-spa-code-editor ap-w-full ap-rounded-lg ap-border ap-border-slate-300 ap-overflow-hidden ap-bg-white ${local.class || ''}`}
			onClick={() => local.onClick?.()}
			{...others}
		>
			<textarea
				ref={textareaRef}
				value={local.value}
				placeholder={local.placeholder}
				readOnly={local.readonly}
				rows="4"
				class="ap-w-full ap-font-mono ap-text-sm ap-p-4 ap-resize-y ap-outline-none ap-border-none"
				style="font-family: 'Fira Code', 'Courier New', monospace; min-height: 100px;"
			/>
		</div>
	);
}
