import { createSignal } from 'solid-js';
import { createStore } from 'solid-js/store';

export function createModalStore() {
	const [isOpen, setIsOpen] = createSignal(false);
	const [resolved, setResolved] = createSignal(null);

	const defaultOption = {
		title: '',
		content: '',
		ok: 'Ok',
		okVariant: 'primary',
		cancel: 'Cancel',
		reverse: false,
		size: 'md',
	};

	const [options, setOptions] = createStore({});

	const [_toast, setToast] = createStore({
		open: false,
		type: 'success',
		text: 'Thank for choosing us',
		timer: 3000,
		key: 0,
		timeout: null,
	});

	const open = () => setIsOpen(true);

	const close = (resolve = null) => {
		clearTimeout(_toast.timeout);
		setIsOpen(false);
		if (resolve !== null) {
			setResolved(resolve);
		}
	};

	const ok = () => close(true);
	const cancel = () => close(false);

	const fire = async (_options) => {
		setOptions({ ...defaultOption, ..._options });
		open();

		return new Promise((resolve) => {
			const interval = setInterval(() => {
				const res = resolved();
				if (res !== null) {
					clearInterval(interval);
					resolve(res);
					setResolved(null);
				}
			}, 100);
		});
	};

	const toast = (text = '', type = 'success', timer = 4) => {
		dismiss();
		setToast('type', type);
		setToast('text', text);
		setToast('timer', timer);
		setToast('key', Date.now());
		setToast('open', true);

		if (timer) {
			const timeout = setTimeout(() => {
				setToast('open', false);
			}, timer * 1000);
			setToast('timeout', timeout);
		}
	};

	const dismiss = () => {
		clearTimeout(_toast.timeout);
		setToast('open', false);
	};

	return {
		isOpen,
		options,
		ok,
		cancel,
		fire,
		open,
		close,
		_toast,
		toast,
		dismiss,
	};
}
