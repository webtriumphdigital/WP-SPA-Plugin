import { createSignal, onMount, Show } from 'solid-js';
import { Button, ConfirmDialog } from '@components';
import API from '@util/api';

/**
 * Cloudflare cloud mark. Inherits currentColor so it can sit on the primary
 * button (white) or the zone card (brand orange).
 */
function CloudflareMark(props) {
	return (
		<svg
			class={props.class || 'ap-w-5 ap-h-5'}
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"
		>
			<path d="M16.604 11.048a5.67 5.67 0 0 0 .012-.105l.015-.135a5.89 5.89 0 0 0 .069-.675c0-3.143-2.553-5.746-5.7-5.746-3.148 0-5.7 2.603-5.7 5.746 0 .238.016.472.046.702l.016.114c.01.078.022.155.036.232l.014.085c.025.131.054.26.089.387l.012.047c.036.129.077.256.122.382l.016.045c.047.127.098.252.154.375l.012.027c.057.123.118.244.184.362l.017.03a5.7 5.7 0 0 0 .213.355l.02.03c.074.107.152.21.233.312l.025.032c.08.1.165.196.252.29l.03.032c.088.094.18.185.274.273l.03.027c.097.089.197.175.3.258l.025.02c.107.086.217.168.33.247l.017.012a5.728 5.728 0 0 0 .77.44l.018.009c.125.062.253.12.383.173l.038.015c.127.051.257.098.388.14l.043.014c.133.042.268.08.404.113l.038.01c.144.034.29.062.437.086l.024.004c.16.025.322.044.485.055h5.7a3.6 3.6 0 1 0 0-7.2h-.696z" />
		</svg>
	);
}

export default function CloudflareSetup(props) {
	const [matchedZone, setMatchedZone] = createSignal(null);
	const [siteHost, setSiteHost] = createSignal('');
	const [step, setStep] = createSignal(1);
	const [loading, setLoading] = createSignal('');
	const [error, setError] = createSignal('');
	const [notice, setNotice] = createSignal('');
	const [confirmDisconnect, setConfirmDisconnect] = createSignal(false);

	// How the Cloudflare account is linked ('oauth' | 'token' | ''). Seeded
	// from the localized status so a reload still shows the link, then kept
	// current as the user connects or disconnects.
	const [connectedVia, setConnectedVia] = createSignal(
		window.td_spa_admin_vars?.cf_status?.auth_method || ''
	);

	const authLabel = () =>
		connectedVia() === 'oauth' ? 'one-click authorization' : 'an API token';

	// Drop the stored credentials so the user can start over. Does not touch a
	// deployed worker - that is the teardown button on the status screen.
	const disconnect = async () => {
		setConfirmDisconnect(false);
		setLoading('Disconnecting...');
		setError('');
		try {
			await API.post('cf/disconnect', {});
			setConnectedVia('');
			setMatchedZone(null);
			setStep(1);
			setNotice('Cloudflare account disconnected.');
		} catch (err) {
			setError('Could not disconnect. Please try again.');
		} finally {
			setLoading('');
		}
	};

	// After a token or OAuth connect, find the zone that matches this site.
	const loadZones = async () => {
		setError('');
		const zonesRes = await API.get('cf/zones');
		setSiteHost(zonesRes.data.site_host || '');

		if (zonesRes.data?.matched_zone) {
			setMatchedZone(zonesRes.data.matched_zone);
			setStep(2);
		} else {
			setError(
				`Your site domain (${zonesRes.data.site_host}) is not found in your Cloudflare account. ` +
				'Please add your domain to Cloudflare and ensure DNS is proxied (orange cloud).'
			);
		}
	};

	// Same lookup, but driven by the retry button, so it needs its own
	// spinner and must not leave the button stuck on failure.
	const retryZones = async () => {
		setLoading('Looking for your domain...');
		try {
			await loadZones();
		} catch (err) {
			setError('Connection error. Please try again.');
		} finally {
			setLoading('');
		}
	};

	// Where Cloudflare should drop the user back. Must keep ?page=td-spa -
	// without it this lands on WordPress' General Settings screen instead of
	// the plugin - and point at the Cache tab.
	const buildReturnUrl = () => {
		const url = new URL(window.top.location.href);
		url.searchParams.delete('ajaxpress_cf_code');
		url.searchParams.delete('ajaxpress_cf_error');
		url.searchParams.delete('state');
		url.hash = '#/cache';
		return url.toString();
	};

	// Kick off the one-click flow: get the relay URL and send the user there.
	const startOAuth = async () => {
		setLoading('Connecting to Cloudflare...');
		setError('');
		try {
			const res = await API.post('cf/oauth-start', { return_url: buildReturnUrl() });
			if (res.data?.success && res.data?.authorize_url) {
				window.top.location.href = res.data.authorize_url;
			} else {
				setError(res.data?.message || 'Could not start the Cloudflare connection.');
				setLoading('');
			}
		} catch (err) {
			setError('Connection error. Please try again.');
			setLoading('');
		}
	};

	// Turn an OAuth error code from Cloudflare into something readable.
	const describeOAuthError = (code) => {
		const known = {
			access_denied: 'You cancelled the Cloudflare authorization.',
			invalid_scope: 'Cloudflare rejected the requested permissions. Please contact support.',
			invalid_request: 'Cloudflare rejected the authorization request. Please try again.',
		};
		return known[code] || `Cloudflare returned an error (${code}). Please try again.`;
	};

	// When the relay sends us back with ?ajaxpress_cf_code= (or an error),
	// finish the flow and report the outcome either way.
	onMount(async () => {
		const params = new URLSearchParams(window.top.location.search);
		const code = params.get('ajaxpress_cf_code');
		const oauthError = params.get('ajaxpress_cf_error');
		const state = params.get('state');

		if (!code && !oauthError) return;

		// Strip our params so a refresh can't replay the code.
		window.top.history.replaceState({}, '', buildReturnUrl());

		if (oauthError) {
			setError(describeOAuthError(oauthError));
			return;
		}

		if (!state) {
			setError('The Cloudflare response was incomplete. Please try connecting again.');
			return;
		}

		setLoading('Finishing Cloudflare connection...');
		try {
			const res = await API.post('cf/oauth-exchange', { code, state });
			if (res.data?.success) {
				setConnectedVia('oauth');
				setNotice('Connected to your Cloudflare account.');
				await loadZones();
			} else {
				setError(res.data?.message || 'Could not complete the Cloudflare connection.');
			}
		} catch (err) {
			setError('Connection error. Please try again.');
		} finally {
			setLoading('');
		}
	});


	const deploy = async () => {
		const zone = matchedZone();
		if (!zone) {
			setError('No matching zone found');
			return;
		}

		setLoading('Deploying cache worker...');
		setError('');

		try {
			const res = await API.post('cf/deploy', { zone_id: zone.id });
			if (res.data?.success) {
				props.onConnected?.();
			} else {
				setError(res.data?.message || 'Failed to deploy');
			}
		} catch (err) {
			console.error('CF deploy error:', err);
			setError('Connection error. Please try again.');
		} finally {
			setLoading('');
		}
	};

	return (
		<div class="ap-space-y-4">
			{/* The account link survives a page load and is independent of
			    whether a zone was found, so it is shown as standing status
			    rather than a one-off toast. */}
			<Show when={connectedVia()}>
				<div class="ap-p-3 ap-bg-slate-50 ap-border ap-border-slate-200 ap-rounded-lg ap-flex ap-items-center ap-gap-3">
					<span class="ap-flex-shrink-0 ap-w-8 ap-h-8 ap-bg-orange-100 ap-rounded-lg ap-flex ap-items-center ap-justify-center">
						<CloudflareMark class="ap-w-4 ap-h-4 ap-text-orange-600" />
					</span>
					<div class="ap-flex-1 ap-text-sm">
						<span class="ap-font-medium ap-text-slate-900">Cloudflare account connected</span>
						<span class="ap-text-slate-500"> · via {authLabel()}</span>
					</div>
					<button
						class="ap-text-xs ap-text-slate-500 hover:ap-text-red-600 ap-underline"
						onClick={() => setConfirmDisconnect(true)}
					>
						Disconnect
					</button>
				</div>
			</Show>

			<ConfirmDialog
				open={confirmDisconnect()}
				title="Disconnect Cloudflare account?"
				message="TD SPA will forget your Cloudflare credentials and you will need to authorize again to set up Super Cache."
				confirmLabel="Disconnect"
				onConfirm={disconnect}
				onCancel={() => setConfirmDisconnect(false)}
			/>

			<Show when={notice()}>
				<div class="ap-p-3 ap-bg-green-50 ap-border ap-border-green-200 ap-rounded-lg ap-text-sm ap-text-green-700 ap-flex ap-items-start ap-gap-2">
					<span aria-hidden="true">✅</span>
					<span>{notice()}</span>
				</div>
			</Show>

			<Show when={error()}>
				<div class="ap-p-3 ap-bg-red-50 ap-border ap-border-red-200 ap-rounded-lg ap-text-sm ap-text-red-700 ap-flex ap-items-start ap-gap-2">
					<span aria-hidden="true">⚠️</span>
					<span>{error()}</span>
				</div>
			</Show>

			<Show when={step() === 1}>
				<div class="ap-space-y-4">
					{/* Already linked but no zone selected yet - the account
					    step is done, so offer a retry instead of a second
					    trip through the consent screen. */}
					<Show when={connectedVia()}>
						<Button onClick={retryZones} loading={loading()}>
							Check for zones again
						</Button>
					</Show>

					{/* One-click OAuth is the only way in: the user approves
					    TD SPA in their own Cloudflare account and nothing
					    has to be created, copied or pasted. */}
					<Show when={!connectedVia()}>
						<div class="ap-space-y-2">
							<Button onClick={startOAuth} loading={loading()}>
								<span class="ap-inline-flex ap-items-center ap-gap-2">
									<CloudflareMark class="ap-w-4 ap-h-4" />
									Connect with Cloudflare
								</span>
							</Button>
							<p class="ap-text-xs ap-text-slate-500">
								Authorize TD SPA in your Cloudflare account. Nothing to create or copy.
							</p>
						</div>
					</Show>

				</div>
			</Show>

			<Show when={step() === 2}>
				<div class="ap-space-y-4">
					<div class="ap-p-3 ap-bg-green-50 ap-border ap-border-green-200 ap-rounded-lg ap-text-sm ap-text-green-700 ap-flex ap-items-center ap-gap-2">
						<span aria-hidden="true">✅</span>
						<span>
							Connected to your Cloudflare account. Matching zone found for this site.
						</span>
					</div>

					<div class="ap-p-4 ap-bg-slate-50 ap-border ap-border-slate-200 ap-rounded-lg">
						<div class="ap-flex ap-items-center ap-gap-3">
							<div class="ap-flex-shrink-0 ap-w-10 ap-h-10 ap-bg-orange-100 ap-rounded-lg ap-flex ap-items-center ap-justify-center">
								<CloudflareMark class="ap-w-5 ap-h-5 ap-text-orange-600" />
							</div>
							<div class="ap-flex-1">
								<div class="ap-font-medium ap-text-slate-900">{matchedZone()?.name}</div>
								<div class="ap-text-sm ap-text-slate-500">
									Route: <code class="ap-bg-slate-200 ap-px-1 ap-rounded">{siteHost()}/*</code>
								</div>
							</div>
							<Show when={matchedZone()?.status === 'active'}>
								<span class="ap-text-xs ap-font-medium ap-px-2 ap-py-1 ap-bg-green-100 ap-text-green-700 ap-rounded">
									Active
								</span>
							</Show>
						</div>
					</div>

					<div class="ap-flex ap-gap-3">
						<Button
							variant="secondary"
							onClick={() => {
								setStep(1);
								setMatchedZone(null);
							}}
						>
							Back
						</Button>
						<Button
							onClick={deploy}
							loading={loading()}
						>
							Deploy Cache
						</Button>
					</div>
				</div>
			</Show>
		</div>
	);
}
