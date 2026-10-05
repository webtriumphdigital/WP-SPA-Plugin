import { createContext, useContext } from 'solid-js';
import { createModalStore } from '../stores/modal';

const ModalContext = createContext();

export function ModalProvider(props) {
	const store = createModalStore();
	return (
		<ModalContext.Provider value={store}>
			{props.children}
		</ModalContext.Provider>
	);
}

export function useModal() {
	const context = useContext(ModalContext);
	if (!context) {
		throw new Error('useModal must be used within ModalProvider');
	}
	return context;
}
