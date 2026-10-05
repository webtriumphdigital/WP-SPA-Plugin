import { createStore } from 'solid-js/store';

const DEBOUNCE_DELAY = 2000;

export function createAutosaveStore() {
	const [state, setState] = createStore({
		status: 'idle',
		lastSaved: null,
		hasUnsavedChanges: false,
		error: null,
	});

	let saveTimeout = null;

	const performSave = async (saveFunction) => {
		if (!saveFunction) {
			console.error('Auto-save: No save function provided');
			return;
		}

		setState('status', 'saving');
		setState('error', null);

		try {
			const response = await saveFunction();

			if (response?.success !== false) {
				setState('status', 'saved');
				setState('hasUnsavedChanges', false);
				setState('lastSaved', new Date());

				setTimeout(() => {
					if (state.status === 'saved') {
						setState('status', 'idle');
					}
				}, 2000);
			} else {
				throw new Error(response?.message || 'Failed to save settings');
			}
		} catch (error) {
			setState('status', 'error');
			setState('error', error.message || 'An error occurred while saving');
			setState('hasUnsavedChanges', true);

			setTimeout(() => {
				if (state.status === 'error') {
					setState('status', 'idle');
				}
			}, 5000);
		}
	};

	const triggerSave = async (saveFunction, instant = false) => {
		if (instant) {
			await performSave(saveFunction);
			return;
		}

		if (saveTimeout) {
			clearTimeout(saveTimeout);
		}

		setState('hasUnsavedChanges', true);
		setState('status', 'idle');

		saveTimeout = setTimeout(async () => {
			await performSave(saveFunction);
		}, DEBOUNCE_DELAY);
	};

	const saveNow = async (saveFunction) => {
		if (saveTimeout) {
			clearTimeout(saveTimeout);
			saveTimeout = null;
		}
		await performSave(saveFunction);
	};

	const reset = () => {
		if (saveTimeout) {
			clearTimeout(saveTimeout);
			saveTimeout = null;
		}
		setState('status', 'idle');
		setState('hasUnsavedChanges', false);
		setState('error', null);
	};

	return {
		state,
		triggerSave,
		saveNow,
		reset,
	};
}
