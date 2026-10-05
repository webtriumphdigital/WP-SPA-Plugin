import { createContext, useContext, onMount } from 'solid-js';
import { createTourStore } from '../stores/tour';
import { useLicense } from './LicenseContext';

const TourContext = createContext();

export function TourProvider(props) {
	const { isLocked } = useLicense();
	const store = createTourStore(isLocked);

	onMount(() => {
		store.loadTourState();
	});

	return (
		<TourContext.Provider value={store}>
			{props.children}
		</TourContext.Provider>
	);
}

export function useTour() {
	const context = useContext(TourContext);
	if (!context) {
		throw new Error('useTour must be used within TourProvider');
	}
	return context;
}
