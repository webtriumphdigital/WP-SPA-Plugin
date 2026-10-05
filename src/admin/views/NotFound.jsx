import { A } from '@solidjs/router';

export default function NotFound() {
	return (
		<div class="ap-space-y-6">
			Oops, the page you're looking for is not available.
			<A href="/">Go to controls</A> to change settings.
		</div>
	);
}
