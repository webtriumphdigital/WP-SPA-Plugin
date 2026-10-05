import { createContext, useContext } from 'solid-js';
import { createSettingsStore } from '../stores/settings';

const SettingsContext = createContext();

export function SettingsProvider(props) {
	const store = createSettingsStore();
	return (
		<SettingsContext.Provider value={store}>
			{props.children}
		</SettingsContext.Provider>
	);
}

export function useSettings() {
	const context = useContext(SettingsContext);
	if (!context) {
		throw new Error('useSettings must be used within SettingsProvider');
	}
	return context;
}
