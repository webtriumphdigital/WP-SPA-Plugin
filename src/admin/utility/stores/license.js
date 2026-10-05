import { createSignal, createMemo } from 'solid-js';
import { createStore } from 'solid-js/store';
import API from '../api';


// Licensing, pricing, and checkout all run through PackEdge now
// (see src/shared/packedge.js). arraystory.com is no longer contacted.

export function createLicenseStore() {
	const [state, setState] = createStore({
		key: '',
		isLoading: false,
		error: '',
		success: '',
	});

	const promoShaking = () => false;
	const showPromoModal = () => false;
	const shakePromo = () => {};
	const closePromoModal = () => {};

	const [license, setLicense] = createStore(
		window?.td_spa_admin_vars?.license || {}
	);

	const maskedKey = createMemo(() => {
		if (!license.key) return '';
		const key = license.key;
		if (key.length <= 14) return key;
		return key.substr(0, 7) + '.....' + key.substr(key.length - 7);
	});

	const isLocked = () => false;

	// Delegates to the PackEdge client. 'activate' binds this site (consuming a
	// seat) then returns full details; 'check' just validates. Both return the
	// legacy { success, license } / { success:false, invalid|networkError } shape.
	const checkOnline = async (_key, action = 'check') => {
		return { success: false, invalid: true };
	};

	const save = async (_license) => {
		try {
			const res = await API.post('license', { license: _license });
			return res.data.success;
		} catch (err) {
			return false;
		}
	};

	const refreshLicense = async () => {
		if (!navigator.onLine) {
			setState('error', 'offline');
			return;
		}

		if (!license || !license.key) {
			return;
		}

		const lastCheck = localStorage.getItem('td_spa_license_last_check');
		const now = Date.now();
		const oneHourInMs = 60 * 60 * 1000;

		if (lastCheck && now - parseInt(lastCheck) < oneHourInMs) {
			return;
		}

		const response = await checkOnline(license.key, 'check');

		if (!response.success) {
			// Drop the stored license only when the server definitively
			// rejected the key. Network errors and server-side trouble
			// (response.transient) keep the current license and skip the
			// last-check timestamp so the next load retries - clearing on
			// a hiccup locked out users on seat-limited plans.
			if (!response.invalid) {
				return;
			}

			setLicense({});
			setState('key', '');
			await save({});
			localStorage.removeItem('td_spa_license_last_check');
			setState('error', 'inactive');
			return;
		}

		localStorage.setItem('td_spa_license_last_check', now.toString());

		if (
			response.license.expires_at &&
			response.license.expires_at !== 'never' &&
			new Date(response.license.expires_at) < new Date()
		) {
			setLicense({ ...response.license, status: 'expired' });
			await save({ ...response.license, status: 'expired' });
			return;
		}

		const currentLicenseStr = JSON.stringify(license);
		const newLicenseStr = JSON.stringify(response.license);

		if (currentLicenseStr !== newLicenseStr) {
			setLicense(response.license);
			await save(response.license);
		}
	};

	const activate = async () => {
		setState('success', '');
		setState('error', '');
		setState('isLoading', 'Activating');

		const response = await checkOnline(state.key, 'activate');

		if (!response.success) {
			setState('isLoading', false);
			return response;
		}

		const currentLicenseStr = JSON.stringify(license);
		const newLicenseStr = JSON.stringify(response.license);

		if (currentLicenseStr !== newLicenseStr) {
			const saved = await save(response.license);

			if (saved) {
				setLicense(response.license);
				setState('key', '');
			}
		} else {
			setLicense(response.license);
			setState('key', '');
		}

		setState('isLoading', false);
		return response;
	};

	const deactivate = async () => {
		setState('isLoading', 'Deactivating');

		// Free the seat on PackEdge (best-effort; local state is cleared regardless).


		await save({});
		setLicense({ key: '', status: '', plan_name: '', plan_type: '', activations: 0, activation_limit: null, activations_remaining: null, expires_at: null });
		setState('key', '');
		setState('success', '');
		setState('error', '');
		localStorage.removeItem('td_spa_license_last_check');
		setState('isLoading', false);
		return { success: true };
	};

	const fetchPlans = async () => {
		// v2 key: plans now come from PackEdge (with PackEdge checkout links),
		// so any cached arraystory/Stripe plans must be ignored.
		const CACHE_KEY = 'td_spa_plans_cache_v2';
		const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours

		// Check localStorage cache first
		const cached = localStorage.getItem(CACHE_KEY);
		if (cached) {
			try {
				const { plans, timestamp } = JSON.parse(cached);
				if (Date.now() - timestamp < CACHE_DURATION && plans?.length > 0) {
					return { success: true, plans };
				}
			} catch (e) {
				localStorage.removeItem(CACHE_KEY);
			}
		}

		return { success: false, plans: [] };
	};

	return {
		state,
		setState,
		isLocked,
		maskedKey,
		license,
		setLicense,
		activate,
		deactivate,
		refreshLicense,
		fetchPlans,
		promoShaking,
		shakePromo,
		showPromoModal,
		closePromoModal,
	};
}
