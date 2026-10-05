import { Show } from 'solid-js';
import Button from './Button';
import Modal from './Modal';

/**
 * Modal confirmation for destructive actions.
 *
 * Deliberately interrupting: the actions behind this remove a live
 * deployment or stored credentials, so they should not be one stray click
 * away. Escape and the backdrop both cancel; only the button confirms.
 *
 * Props:
 *   open, title, message, confirmLabel, cancelLabel, loading,
 *   onConfirm, onCancel
 */
export default function ConfirmDialog(props) {
	return (
		<Modal open={props.open} onClose={() => props.onCancel?.()}>
			<h3 class="ap-text-base ap-font-semibold ap-text-slate-900">
				{props.title || 'Are you sure?'}
			</h3>

			<Show when={props.message}>
				<p class="ap-text-sm ap-text-slate-600">{props.message}</p>
			</Show>

			<div class="ap-flex ap-items-center ap-justify-end ap-gap-2">
				<Button variant="secondary" size="sm" onClick={() => props.onCancel?.()}>
					{props.cancelLabel || 'Cancel'}
				</Button>
				<Button
					variant="danger"
					size="sm"
					onClick={() => props.onConfirm?.()}
					loading={props.loading || ''}
				>
					{props.confirmLabel || 'Confirm'}
				</Button>
			</div>
		</Modal>
	);
}
