import { createSignal, createMemo } from 'solid-js';
import { createStore, createMutable } from 'solid-js/store';
import API from '../api';

export function createSettingsStore() {
	const [state, setState] = createStore({
		version: window?.td_spa_admin_vars?.plugin?.version || 'N/A',
		saving: false,
		exporting: false,
		importing: false,
		resetting: false,
	});

	// Store original settings for comparison
	const originalSettings = JSON.parse(JSON.stringify(window?.td_spa_admin_vars?.settings || {}));
	const [savedSettings, setSavedSettings] = createSignal(originalSettings);

	const settings = createMutable(
		window?.td_spa_admin_vars?.settings || {}
	);

	// Check if settings have changed
	const isDirty = createMemo(() => {
		const current = JSON.stringify(settings);
		const saved = JSON.stringify(savedSettings());
		return current !== saved;
	});

	const saveSettings = async () => {
		setState('saving', 'Saving...');

		try {
			const result = await API.post('settings', { settings });
			if (result.data?.success) {
				// Update saved settings to current after successful save
				setSavedSettings(JSON.parse(JSON.stringify(settings)));
			}
			return result.data;
		} catch (err) {
			return { success: false, message: err.message || 'Server Error!' };
		} finally {
			setState('saving', false);
		}
	};

	const exportSettings = async () => {
		setState('exporting', 'Exporting');

		const _settings = {
			type: 'td_spa_settings',
			version: window?.td_spa_admin_vars?.plugin?.version,
			...settings,
		};

		const blob = new Blob([JSON.stringify(_settings, null, 2)], {
			type: 'application/json',
		});
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = `td-spa-${window?.td_spa_admin_vars?.plugin?.version}.json`;
		a.click();

		setState('exporting', false);
	};

	const importSettings = async (_settings = {}) => {
		setState('importing', 'Importing');
		const result = await saveSettings();
		setState('importing', '');
		return result;
	};

	const resetSettings = async () => {
		if (!window?.td_spa_admin_vars?.default_settings) {
			return;
		}
		setState('resetting', 'Resetting');
		Object.assign(settings, window.td_spa_admin_vars.default_settings);
		const result = await saveSettings();
		setState('resetting', '');
		return result;
	};

	const discardChanges = () => {
		Object.assign(settings, JSON.parse(JSON.stringify(savedSettings())));
	};

	return {
		state,
		setState,
		settings,
		isDirty,
		saveSettings,
		exportSettings,
		importSettings,
		resetSettings,
		discardChanges,
	};
}
