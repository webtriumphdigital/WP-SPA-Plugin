import { createMemo } from 'solid-js';
import { createStore } from 'solid-js/store';
import API from '../api';
import { getTourSteps, TOUR_MODES } from '../tour-steps';

export function createTourStore(isLocked) {
	const [state, setState] = createStore({
		isActive: false,
		currentStepIndex: 0,
		mode: TOUR_MODES.QUICK,
		completed: false,
		dismissedAt: null,
		loading: true
	});

	// Filter steps based on license status (skip pricing for Pro users)
	const steps = createMemo(() => {
		const allSteps = getTourSteps(state.mode);
		if (isLocked && !isLocked()) {
			return allSteps.filter(step => step.id !== 'pricing');
		}
		return allSteps;
	});
	const currentStep = createMemo(() => steps()[state.currentStepIndex] || null);
	const totalSteps = createMemo(() => steps().length);
	const isFirstStep = createMemo(() => state.currentStepIndex === 0);
	const isLastStep = createMemo(() => state.currentStepIndex === totalSteps() - 1);

	const loadTourState = async () => {
		setState('loading', true);
		try {
			const response = await API.get('tour');
			if (response.data) {
				setState({
					completed: response.data.completed || false,
					mode: response.data.mode || TOUR_MODES.QUICK,
					dismissedAt: response.data.dismissed_at || null
				});
			}
		} catch (err) {
			// Silently fail
		} finally {
			setState('loading', false);
		}
	};

	const saveTourState = async (updates) => {
		try {
			await API.post('tour', updates);
		} catch (err) {
			// Silently fail
		}
	};

	const startTour = (mode = null) => {
		if (mode) {
			setState('mode', mode);
		}
		setState({
			isActive: true,
			currentStepIndex: 0
		});
	};

	const nextStep = () => {
		if (isLastStep()) {
			completeTour();
		} else {
			setState('currentStepIndex', state.currentStepIndex + 1);
		}
	};

	const prevStep = () => {
		if (!isFirstStep()) {
			setState('currentStepIndex', state.currentStepIndex - 1);
		}
	};

	const skipTour = async () => {
		const dismissedAt = Date.now();
		setState({
			isActive: false,
			currentStepIndex: 0,
			dismissedAt
		});
		await saveTourState({ dismissed_at: dismissedAt });
	};

	const completeTour = async () => {
		setState({
			isActive: false,
			currentStepIndex: 0,
			completed: true
		});
		await saveTourState({ completed: true });
	};

	const shouldAutoStart = createMemo(() => {
		return !state.loading && !state.completed && !state.dismissedAt;
	});

	return {
		state,
		steps,
		currentStep,
		totalSteps,
		isFirstStep,
		isLastStep,
		shouldAutoStart,
		loadTourState,
		startTour,
		nextStep,
		prevStep,
		skipTour,
		completeTour
	};
}
