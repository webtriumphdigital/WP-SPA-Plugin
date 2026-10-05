import { SettingsProvider, useSettings } from './SettingsContext';
import { LicenseProvider, useLicense } from './LicenseContext';
import { AutosaveProvider, useAutosave } from './AutosaveContext';
import { ModalProvider, useModal } from './ModalContext';
import { TourProvider, useTour } from './TourContext';

export function AppProvider(props) {
	return (
		<SettingsProvider>
			<LicenseProvider>
				<AutosaveProvider>
					<ModalProvider>
						<TourProvider>{props.children}</TourProvider>
					</ModalProvider>
				</AutosaveProvider>
			</LicenseProvider>
		</SettingsProvider>
	);
}

export { useSettings, useLicense, useAutosave, useModal, useTour };
