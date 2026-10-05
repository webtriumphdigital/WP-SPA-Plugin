import { createContext, useContext } from 'solid-js';
import { createAutosaveStore } from '../stores/autosave';

const AutosaveContext = createContext();

export function AutosaveProvider(props) {
	const store = createAutosaveStore();
	return (
		<AutosaveContext.Provider value={store}>
			{props.children}
		</AutosaveContext.Provider>
	);
}

export function useAutosave() {
	const context = useContext(AutosaveContext);
	if (!context) {
		throw new Error('useAutosave must be used within AutosaveProvider');
	}
	return context;
}
