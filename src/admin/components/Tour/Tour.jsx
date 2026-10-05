import { Show, createEffect, onMount, onCleanup } from 'solid-js';
import { Portal } from 'solid-js/web';
import { useNavigate, useLocation } from '@solidjs/router';
import { useTour } from '@util/context';
import TourSpotlight from './TourSpotlight';
import TourTooltip from './TourTooltip';

export default function Tour() {
	const navigate = useNavigate();
	const location = useLocation();
	const tour = useTour();

	let scrollTimeout = null;

	createEffect(() => {
		const step = tour.currentStep();
		if (!tour.state.isActive || !step) return;

		const currentPath = location.pathname;
		if (step.route && currentPath !== step.route) {
			navigate(step.route);
		}
	});

	createEffect(() => {
		const step = tour.currentStep();
		if (!tour.state.isActive || !step) return;

		if (scrollTimeout) clearTimeout(scrollTimeout);

		scrollTimeout = setTimeout(() => {
			if (step.selector) {
				const element = document.querySelector(step.selector);
				if (element) {
					element.scrollIntoView({
						behavior: 'smooth',
						block: 'center'
					});
				}
			}
		}, 350);
	});

	const handleKeydown = (e) => {
		if (!tour.state.isActive) return;

		switch (e.key) {
			case 'Escape':
				tour.skipTour();
				break;
			case 'ArrowRight':
			case 'Enter':
				tour.nextStep();
				break;
			case 'ArrowLeft':
				tour.prevStep();
				break;
		}
	};

	onMount(() => {
		document.addEventListener('keydown', handleKeydown);
	});

	onCleanup(() => {
		document.removeEventListener('keydown', handleKeydown);
		if (scrollTimeout) clearTimeout(scrollTimeout);
	});

	createEffect(() => {
		if (tour.shouldAutoStart()) {
			setTimeout(() => tour.startTour(), 800);
		}
	});

	return (
		<Portal mount={document.body}>
			<Show when={tour.state.isActive && tour.currentStep()}>
				<TourSpotlight
					selector={tour.currentStep().selector}
					position={tour.currentStep().position}
					onOverlayClick={() => {}}
				/>
				<TourTooltip
					step={tour.currentStep()}
					stepIndex={tour.state.currentStepIndex}
					totalSteps={tour.totalSteps()}
					isFirst={tour.isFirstStep()}
					isLast={tour.isLastStep()}
					onNext={tour.nextStep}
					onPrev={tour.prevStep}
					onSkip={tour.skipTour}
				/>
			</Show>
		</Portal>
	);
}
