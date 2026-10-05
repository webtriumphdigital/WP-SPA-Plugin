import { createSignal, Show, onMount } from 'solid-js';
import { Button, Text } from '@components';
import { useLicense } from '@util/context';
import API from '@util/api';
import CloudflareSetup from './CloudflareSetup';
import CloudflareStatus from './CloudflareStatus';

export default function CloudflareSection() {
	const { isLocked, shakePromo } = useLicense();

	// Initial status from localized script (instant first paint).
	const initialStatus = window.td_spa_admin_vars?.cf_status || { connected: false, enabled: false };
	const [status, setStatus] = createSignal(initialStatus);
	const [checking, setChecking] = createSignal(initialStatus.connected);

	// Set the status and write it back to the localized blob. The admin is a
	// hash-router SPA, so leaving this tab and returning remounts this
	// component - without the write-back it would re-read the status from page
	// load and show a stale (dis)connected screen. Connection state lives in
	// WordPress; this just keeps the in-page copy honest between fetches.
	const applyStatus = (next) => {
		setStatus(next);
		if (window.td_spa_admin_vars) {
			window.td_spa_admin_vars.cf_status = next;
		}
	};

	const fetchStatus = async () => {
		setChecking(true);
		try {
			const res = await API.get('cf/status');
			if (res.data?.success) {
				applyStatus(res.data.status);
			}
		} catch (err) {
			console.error('Failed to verify CF connection:', err);
		} finally {
			setChecking(false);
		}
	};

	// Always re-verify against WordPress on mount, not only when the localized
	// status already reads connected. A site that connected (or disconnected)
	// after this page loaded would otherwise keep showing the state it had at
	// load time every time you navigate back to this tab.
	onMount(() => {
		if (isLocked()) {
			setChecking(false);
			return;
		}
		fetchStatus();
	});

	const handleConnected = fetchStatus;

	const handleDisconnected = () => {
		applyStatus({ connected: false, enabled: false });
	};

	return (
		<div class="ap-space-y-4">
			<div class="ap-flex ap-items-center ap-gap-2">
				<h3 class="ap-text-lg ap-font-semibold ap-text-slate-900">Super Cache by Cloudflare</h3>
				
			</div>

			<p class="ap-text-sm ap-text-slate-600">
				This is not another caching plugin. Your pages are stored on Cloudflare's own network
				and served from whichever of its 330+ locations is nearest your visitor - typically in
				under 10ms, anywhere in the world. Your server is not involved at all.
			</p>

			{/* Locked state - show disabled form */}
			<Show when={isLocked()}>
				<div class="ap-p-5 ap-bg-white ap-rounded-lg ap-border ap-border-slate-200">
					<div class="ap-space-y-4">
						<div class="ap-space-y-2">
							<label class="ap-block ap-text-sm ap-font-medium ap-text-slate-700">
								Cloudflare API Token
							</label>
							<div class="ap-opacity-60">
								<Text
									type="password"
									placeholder="Enter your Cloudflare API token"
									readonly={true}
									onClick={shakePromo}
								/>
							</div>
							<p class="ap-text-xs ap-text-slate-500">
								Create a token with these permissions:{' '}
								<a
									href="https://dash.cloudflare.com/profile/api-tokens"
									target="_blank"
									rel="noopener noreferrer"
									class="ap-text-indigo-600 hover:ap-underline"
								>
									Create token
								</a>
							</p>
							<ul class="ap-text-xs ap-text-slate-500 ap-space-y-1 ap-ml-1">
								<li><code class="ap-bg-slate-100 ap-px-1 ap-rounded">Zone : Zone : Read</code></li>
								<li><code class="ap-bg-slate-100 ap-px-1 ap-rounded">Zone : Cache Purge : Purge</code></li>
								<li><code class="ap-bg-slate-100 ap-px-1 ap-rounded">Zone : Worker Routes : Edit</code></li>
								<li><code class="ap-bg-slate-100 ap-px-1 ap-rounded">Account : Workers Scripts : Edit</code></li>
							</ul>
						</div>

						<div class="ap-opacity-60">
							<Button onClick={shakePromo}>
								Verify & Connect
							</Button>
						</div>
					</div>
				</div>

				{/* Comparison Table */}
				<div class="ap-space-y-2">
					<p class="ap-text-xs ap-text-slate-500">
						Traditional caching stores data on your origin server. CF Edge caches globally - your content is served from the nearest of 330+ locations worldwide.
					</p>
				</div>
				<div class="ap-overflow-hidden ap-rounded-lg ap-border ap-border-slate-200 ap-bg-white">
					<table class="ap-w-full ap-text-sm">
						<thead>
							<tr class="ap-bg-slate-50 ap-border-b ap-border-slate-200">
								<th class="ap-px-4 ap-py-3 ap-text-left ap-font-medium ap-text-slate-600"></th>
								<th class="ap-px-4 ap-py-3 ap-text-center ap-font-medium ap-text-slate-500">WP Rocket</th>
								<th class="ap-px-4 ap-py-3 ap-text-center ap-font-medium ap-text-slate-500">LiteSpeed</th>
								<th class="ap-px-4 ap-py-3 ap-text-center ap-font-medium ap-text-slate-500">Redis</th>
								<th class="ap-px-4 ap-py-3 ap-text-center ap-font-medium ap-text-indigo-700 ap-bg-indigo-50">CF Edge</th>
							</tr>
						</thead>
						<tbody class="ap-divide-y ap-divide-slate-100">
							<tr>
								<td class="ap-px-4 ap-py-3 ap-font-medium ap-text-slate-600 ap-bg-slate-50">Response</td>
								<td class="ap-px-4 ap-py-3 ap-text-center ap-text-amber-500">~200ms</td>
								<td class="ap-px-4 ap-py-3 ap-text-center ap-text-amber-500">~150ms</td>
								<td class="ap-px-4 ap-py-3 ap-text-center ap-text-amber-500">~180ms</td>
								<td class="ap-px-4 ap-py-3 ap-text-center ap-text-green-600 ap-font-semibold ap-bg-indigo-50">~10ms</td>
							</tr>
							<tr>
								<td class="ap-px-4 ap-py-3 ap-font-medium ap-text-slate-600 ap-bg-slate-50">Locations</td>
								<td class="ap-px-4 ap-py-3 ap-text-center ap-text-slate-400">1</td>
								<td class="ap-px-4 ap-py-3 ap-text-center ap-text-slate-400">1</td>
								<td class="ap-px-4 ap-py-3 ap-text-center ap-text-slate-400">1</td>
								<td class="ap-px-4 ap-py-3 ap-text-center ap-text-green-600 ap-font-semibold ap-bg-indigo-50">330+</td>
							</tr>
							<tr>
								<td class="ap-px-4 ap-py-3 ap-font-medium ap-text-slate-600 ap-bg-slate-50">Cost</td>
								<td class="ap-px-4 ap-py-3 ap-text-center ap-text-amber-500">$59/yr</td>
								<td class="ap-px-4 ap-py-3 ap-text-center ap-text-slate-500">Free*</td>
								<td class="ap-px-4 ap-py-3 ap-text-center ap-text-amber-500">$5+/mo</td>
								<td class="ap-px-4 ap-py-3 ap-text-center ap-text-green-600 ap-font-semibold ap-bg-indigo-50">Free**</td>
							</tr>
						</tbody>
					</table>
					<div class="ap-px-4 ap-py-2 ap-bg-slate-50 ap-border-t ap-border-slate-200">
						<p class="ap-text-xs ap-text-slate-400">*Requires LiteSpeed server · **Requires Cloudflare free plan</p>
					</div>
				</div>
			</Show>

			{/* Unlocked state - show actual feature */}
			<Show when={!isLocked()}>
				<Show when={status()?.connected}>
					<CloudflareStatus
						status={status()}
						checking={checking()}
						onDisconnected={handleDisconnected}
					/>
				</Show>

				<Show when={!status()?.connected}>
					<div class="ap-p-5 ap-bg-white ap-rounded-lg ap-border ap-border-slate-200">
						<CloudflareSetup onConnected={handleConnected} />
					</div>
				</Show>
			</Show>
		</div>
	);
}
