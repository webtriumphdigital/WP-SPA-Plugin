import { createContext, useContext, onMount } from 'solid-js';
import { createLicenseStore } from '../stores/license';

const LicenseContext = createContext();

export function LicenseProvider(props) {
	const store = createLicenseStore();

	onMount(() => {
		store.refreshLicense();
	});

	return (
		<LicenseContext.Provider value={store}>
			{props.children}
		</LicenseContext.Provider>
	);
}

export function useLicense() {
	const context = useContext(LicenseContext);
	if (!context) {
		throw new Error('useLicense must be used within LicenseProvider');
	}
	return context;
}
