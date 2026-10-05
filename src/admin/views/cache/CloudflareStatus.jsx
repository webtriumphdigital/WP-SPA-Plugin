import { createSignal, For, Show } from 'solid-js';
import { Button, Switch, Textarea, MultiSelect, ConfirmDialog, Modal } from '@components';
import { useSettings, useLicense } from '@util/context';
import API from '@util/api';

export default function CloudflareStatus(props) {
	const { settings, saveSettings } = useSettings();
	const { isLocked, shakePromo } = useLicense();

	const [purgeInput, setPurgeInput] = createSignal('');
	const [purging, setPurging] = createSignal(false);
	const [purgingAll, setPurgingAll] = createSignal(false);
	const [message, setMessage] = createSignal(null);
	const [disconnecting, setDisconnecting] = createSignal(false);
	const [showDisconnect, setShowDisconnect] = createSignal(false);
	const [paused, setPaused] = createSignal(!!props.status?.paused);
	const [pausing, setPausing] = createSignal(false);
	const [health, setHealth] = createSignal(null);
	const [checkingHealth, setCheckingHealth] = createSignal(false);
	const [purgeResult, setPurgeResult] = createSignal(null);
	const [workerStatus, setWorkerStatus] = createSignal(null);
	const [updatingWorker, setUpdatingWorker] = createSignal(false);
	const [workerError, setWorkerError] = createSignal(null);
	const [warming, setWarming] = createSignal(false);
	const [warmMsg, setWarmMsg] = createSignal(null);

	// Local state wins after an update, so the line reflects what just
	// happened without waiting for the parent to refetch. Both the worker
	// update and the warm run return a fresh status, so they share it.
	const worker = () => workerStatus() || props.status || {};

	// Kick off (or resume) caching the whole site into the edge KV layer.
	// The connect-time crawl does this automatically, but only on a fresh
	// connect and only once WP-Cron fires; this is the on-demand button.
	const warmAll = async () => {
		if (isLocked()) { shakePromo(); return; }
		setWarming(true);
		setWarmMsg(null);
		try {
			const res = await API.post('cf/warm');
			if (res.data?.success) {
				if (res.data.status) setWorkerStatus(res.data.status);
				setWarmMsg({ type: 'ok', text: res.data.message || 'Caching started.' });
			} else {
				setWarmMsg({ type: 'error', text: res.data?.message || 'Could not start caching.' });
			}
		} catch (err) {
			setWarmMsg({ type: 'error', text: 'Could not reach your site. Please try again.' });
		} finally {
			setWarming(false);
		}
	};

	const updateWorker = async () => {
		setUpdatingWorker(true);
		setWorkerError(null);
		try {
			const res = await API.post('cf/redeploy-worker');
			if (res.data?.success) {
				setWorkerStatus(res.data.status);
			} else {
				setWorkerError(res.data?.message || 'Could not update the edge worker.');
			}
		} catch (err) {
			setWorkerError('Could not reach your site. Please try again.');
		} finally {
			setUpdatingWorker(false);
		}
	};

	const togglePause = async (value) => {
		if (isLocked()) { shakePromo(); return; }
		setPausing(true);
		setPaused(value);
		try {
			const res = await API.post('cf/pause', { paused: value });
			if (!res.data?.success) {
				setPaused(!value);
				setMessage({ type: 'error', text: res.data?.message || 'Could not update' });
			}
		} catch (err) {
			setPaused(!value);
			setMessage({ type: 'error', text: 'Connection error' });
		} finally {
			setPausing(false);
		}
	};

	const checkHealth = async () => {
		setCheckingHealth(true);
		setHealth(null);
		try {
			const res = await API.get('cf/health');
			const urls = res.data?.urls || [];

			// Probe from the browser (goes through Cloudflare) with credentials
			// omitted so the request looks anonymous and isn't force-bypassed
			// as a logged-in admin.
			const samples = await Promise.all(urls.map(async (url) => {
				try {
					const r = await fetch(url, { credentials: 'omit', cache: 'reload' });
					const state = (r.headers.get('x-td-spa-cache') || 'UNKNOWN').toUpperCase();
					return { url, state };
				} catch (e) {
					return { url, state: 'UNKNOWN' };
				}
			}));

			const hits = samples.filter((s) => s.state === 'HIT').length;
			setHealth({
				samples,
				measured: samples.length,
				hit_rate: samples.length ? Math.round((hits / samples.length) * 100) : 0,
			});
		} catch (err) {
			setMessage({ type: 'error', text: 'Connection error' });
		} finally {
			setCheckingHealth(false);
		}
	};

	// Backing lookups for the exclude pickers. `include` resolves already
	// saved values to labels; otherwise it's a plain text search.
	const contentSearch = async (type, q, include) => {
		const params = new URLSearchParams({ type });
		if (q) params.set('q', q);
		for (const value of include || []) params.append('include[]', value);

		const res = await API.get(`cf/content-search?${params.toString()}`);
		return res.data?.items || [];
	};

	// One control for both. Posts come back as numeric ids and terms as
	// "taxonomy:id", so a combined selection splits cleanly on save and the
	// user never has to know there are two settings underneath.
	const searchContent = (q, include) => contentSearch('any', q, include);

	const excludedContent = () => [
		...(settings.cf_exclude_posts || []),
		...(settings.cf_exclude_terms || []),
	];

	const setExcludedContent = (next) => {
		if (isLocked()) { shakePromo(); return; }
		settings.cf_exclude_posts = next.filter((v) => !v.includes(':'));
		settings.cf_exclude_terms = next.filter((v) => v.includes(':'));
	};

	// Get domain from route_pattern (e.g., "example.com/*" -> "example.com")
	const getDomain = () => {
		const pattern = props.status?.route_pattern || props.status?.zone_name || '';
		return pattern.replace(/\/\*$/, '');
	};

	// Cloudflare answers a bad zone with "Could not route to /client/v4/...",
	// which tells the user nothing actionable.
	const readablePurgeError = (raw) => {
		const text = String(raw || '');
		if (text.includes('Could not route') || text.includes('object identifier')) {
			return 'Cloudflare rejected the zone for this site. Reconnect Super Cache so the zone is set up again.';
		}
		return text || 'Purge failed.';
	};

	const purge = async () => {
		const input = purgeInput().trim();
		if (!input) return;

		// Split by newlines for multiple URLs/patterns
		const urls = input.split('\n').map(u => u.trim()).filter(Boolean);

		setPurging(true);
		setPurgeResult({ state: 'working', text: `Purging ${urls.length} URL${urls.length > 1 ? 's' : ''}...` });

		try {
			const res = await API.post('cf/purge', { urls });
			if (res.data?.success) {
				setPurgeResult({ state: 'done', text: `Purged ${urls.length} URL${urls.length > 1 ? 's' : ''}.` });
				setPurgeInput('');
			} else {
				setPurgeResult({ state: 'error', text: readablePurgeError(res.data?.message) });
			}
		} catch (err) {
			setPurgeResult({ state: 'error', text: 'Could not reach your site. Please try again.' });
		} finally {
			setPurging(false);
		}
	};

	const purgeAll = async () => {
		setPurgingAll(true);
		setPurgeResult({ state: 'working', text: 'Purging every cached page...' });

		try {
			const res = await API.post('cf/purge-all');
			if (res.data?.success) {
				setPurgeResult({ state: 'done', text: 'Every cached page has been purged. They will be rebuilt on the next visit.' });
			} else {
				setPurgeResult({ state: 'error', text: readablePurgeError(res.data?.message) });
			}
		} catch (err) {
			setPurgeResult({ state: 'error', text: 'Could not reach your site. Please try again.' });
		} finally {
			setPurgingAll(false);
		}
	};

	const disconnect = async () => {
		setDisconnecting(true);
		try {
			const res = await API.post('cf/teardown');

			// Teardown clears the site's Cloudflare options before it returns,
			// even when removing the worker or route hit a snag on Cloudflare's
			// side (success: false with a message). So once the request comes
			// back, this site is disconnected either way - flip the UI now
			// rather than leaving it stuck on the connected view. A partial
			// cleanup is worth noting, but it does not change that outcome.
			if (res.data?.success === false && res.data?.message) {
				console.warn('Cloudflare teardown partial:', res.data.message);
			}
			props.onDisconnected?.();
		} catch (err) {
			// Only a request that never completed leaves the state unknown, so
			// this is the one case where the UI stays connected.
			console.error('Teardown error:', err);
			setMessage({ type: 'error', text: 'Could not reach your site. Please try again.' });
		} finally {
			setDisconnecting(false);
			setShowDisconnect(false);
		}
	};

	return (
		<div class="ap-space-y-4">
			{/* Connection + Purge Card */}
			<div class="ap-p-5 ap-bg-white ap-rounded-lg ap-border ap-border-slate-200 ap-space-y-4">
				{/* Connected status on the left, pause on the right. Split into
				    two groups rather than using a spacer utility - the ml-auto
				    and w-auto classes are not in the generated CSS, so they
				    silently did nothing. */}
				<div class="ap-flex ap-items-center ap-justify-between ap-gap-3 ap-text-sm">
				<div class="ap-flex ap-items-center ap-gap-2 ap-text-sm">
					<Show when={props.checking} fallback={
						<div class="ap-w-2 ap-h-2 ap-bg-green-500 ap-rounded-full" />
					}>
						<div class="ap-w-3 ap-h-3 ap-border-2 ap-border-green-500 ap-border-t-transparent ap-rounded-full ap-animate-spin" />
					</Show>
					<span class="ap-text-green-700 ap-font-medium">{getDomain()}</span>
					<Show when={props.checking}>
						<span class="ap-text-slate-400 ap-text-xs">verifying...</span>
					</Show>
					<span class="ap-text-slate-300">|</span>
					<button
						class="ap-text-slate-500 hover:ap-text-red-600 ap-transition-colors"
						onClick={() => setShowDisconnect(true)}
					>
						Disconnect
					</button>
				</div>

				{/* Kept next to the other actions rather than in settings:
				    pausing is something you do, not something you configure. */}
				<div style={{ 'flex-shrink': 0 }}>
					<Switch
						plain={true}
						size="sm"
						value={paused()}
						disabled={pausing()}
						locked={isLocked()}
						onChange={togglePause}
					>
						<span class="ap-whitespace-nowrap">Pause caching</span>
					</Switch>
				</div>
				</div>

				{/* Compact cache summary: what is cached and when it last synced. */}
				<div class="ap-flex ap-items-center ap-gap-4 ap-text-xs ap-text-slate-500 ap-flex-wrap">
					<span>
						<span class="ap-font-semibold ap-text-slate-900">{worker().warm_done || props.status?.cached_pages || 0}</span> pages on the edge
					</span>
					<span class="ap-text-slate-300">·</span>
					<span>
						Last synced <span class="ap-text-slate-700">{props.status?.last_synced_human || 'never'}</span>
					</span>
					<Show when={props.status?.kv_connected}>
						<span class="ap-text-slate-300">·</span>
						<span class="ap-text-green-700">Global layer active</span>
					</Show>
					<Show when={worker().worker_version > 0}>
						<span class="ap-text-slate-300">·</span>
						<span>Edge worker v{worker().worker_version}</span>
					</Show>
				</div>

				{/* Fill the edge with every page. The connect-time crawl does
				    this on its own, but only on a fresh connect and only once
				    WP-Cron runs, so this is here for the rest of the time. */}
				<div class="ap-flex ap-items-center ap-gap-3 ap-flex-wrap">
					<Button
						variant="secondary"
						size="sm"
						onClick={warmAll}
						loading={warming() ? 'Starting...' : ''}
						locked={isLocked()}
					>
						{worker().warming ? 'Keep caching all pages' : 'Cache all pages'}
					</Button>
					<Show when={worker().warming && !warmMsg()}>
						<span class="ap-text-xs ap-text-slate-500">
							Caching pages in the background - this can take a while on a large site.
						</span>
					</Show>
					<Show when={warmMsg()}>
						<span
							class="ap-text-xs"
							classList={{
								'ap-text-green-700': warmMsg().type === 'ok',
								'ap-text-red-700': warmMsg().type === 'error',
							}}
						>
							{warmMsg().text}
						</span>
					</Show>
				</div>

				{/* The worker updates itself in the background, so this only
				    speaks up when it hasn't: either an update is on its way or
				    it ran out of retries and needs a person. */}
				<Show when={worker().worker_stale}>
					<div
						class="ap-flex ap-items-start ap-gap-3 ap-p-3 ap-rounded-lg ap-text-xs"
						classList={{
							'ap-bg-amber-50 ap-border ap-border-amber-200': !worker().worker_failed,
							'ap-bg-red-50 ap-border ap-border-red-200': !!worker().worker_failed,
						}}
					>
						<div class="ap-flex-1 ap-space-y-1">
							<Show
								when={worker().worker_failed}
								fallback={
									<p class="ap-text-amber-800">
										A newer edge worker (v{worker().worker_latest}) is available. It installs
										itself within a minute or two. You can push it now if you'd rather not wait.
									</p>
								}
							>
								<p class="ap-text-red-800 ap-font-medium">
									The edge worker could not be updated after several attempts.
								</p>
								<p class="ap-text-red-700">
									{worker().worker_failed?.message}
								</p>
								<p class="ap-text-red-600">
									Your site is still being cached by the worker already installed, so nothing
									is broken - it just isn't the newest one.
								</p>
							</Show>
							<Show when={workerError()}>
								<p class="ap-text-red-700">{workerError()}</p>
							</Show>
						</div>
						<Button
							variant="secondary"
							size="sm"
							onClick={updateWorker}
							loading={updatingWorker() ? 'Updating...' : ''}
						>
							Update worker now
						</Button>
					</div>
				</Show>

				{/* Purge outcome, so a purge cannot fail silently in a corner
			    of the screen. Not dismissable while it is still running. */}
			<Modal
				open={!!purgeResult()}
				onClose={purgeResult()?.state === 'working' ? undefined : () => setPurgeResult(null)}
			>
				<div class="ap-flex ap-items-start ap-gap-3">
					<Show when={purgeResult()?.state === 'working'}>
						<div class="ap-w-5 ap-h-5 ap-border-2 ap-border-indigo-500 ap-border-t-transparent ap-rounded-full ap-animate-spin ap-flex-shrink-0" />
					</Show>
					<Show when={purgeResult()?.state === 'done'}>
						<span class="ap-flex-shrink-0" aria-hidden="true">✅</span>
					</Show>
					<Show when={purgeResult()?.state === 'error'}>
						<span class="ap-flex-shrink-0" aria-hidden="true">⚠️</span>
					</Show>
					<p
						class="ap-text-sm"
						classList={{
							'ap-text-slate-700': purgeResult()?.state !== 'error',
							'ap-text-red-700': purgeResult()?.state === 'error',
						}}
					>
						{purgeResult()?.text}
					</p>
				</div>

				<Show when={purgeResult()?.state !== 'working'}>
					<div class="ap-flex ap-justify-end">
						<Button variant="secondary" size="sm" onClick={() => setPurgeResult(null)}>
							Close
						</Button>
					</div>
				</Show>
			</Modal>

			<ConfirmDialog
					open={showDisconnect()}
					title="Disconnect Super Cache?"
					message="This removes the Cloudflare worker and route from your zone. Your pages will be served by your own server again. Nothing on your site is deleted."
					confirmLabel="Disconnect"
					loading={disconnecting() ? 'Removing...' : ''}
					onConfirm={disconnect}
					onCancel={() => setShowDisconnect(false)}
				/>

				{/* Purge Cache */}
				<div class="ap-flex ap-items-center ap-gap-2">
					<input
						type="text"
						class="ap-flex-1 ap-px-3 ap-py-2 ap-text-sm ap-border ap-border-slate-300 ap-rounded-lg focus:ap-outline-none focus:ap-ring-2 focus:ap-ring-indigo-500 focus:ap-border-transparent"
						placeholder="URL or pattern (e.g., /blog/*)"
						value={purgeInput()}
						onInput={(e) => setPurgeInput(e.target.value)}
						onKeyDown={(e) => e.key === 'Enter' && purge()}
					/>
					<Button
						variant="secondary"
						size="sm"
						onClick={purge}
						loading={purging() ? 'Purging...' : ''}
						disabled={!purgeInput().trim()}
					>
						Purge
					</Button>
					<Button
						variant="danger"
						size="sm"
						onClick={purgeAll}
						loading={purgingAll() ? 'Purging...' : ''}
					>
						Purge All
					</Button>
					<Show when={message()}>
						<span
							class="ap-text-xs ap-px-2 ap-py-1 ap-rounded ap-whitespace-nowrap"
							classList={{
								'ap-bg-green-100 ap-text-green-700': message().type === 'success',
								'ap-bg-red-100 ap-text-red-700': message().type === 'error',
							}}
						>
							{message().text}
						</span>
					</Show>
				</div>
			</div>

			{/* Cache health Card */}
			<div class="ap-p-5 ap-bg-white ap-rounded-lg ap-border ap-border-slate-200 ap-space-y-4">
				<div class="ap-flex ap-items-center ap-justify-between ap-gap-3">
					<h4 class="ap-text-sm ap-font-semibold ap-text-slate-700">Cache health</h4>
					<div class="ap-flex ap-items-center ap-gap-3">
						{/* Results are a one-off check, not standing state, so
						    they can be dismissed once read. */}
						<Show when={health()}>
							<button
								class="ap-text-xs ap-text-slate-500 hover:ap-text-slate-800 ap-underline"
								onClick={() => setHealth(null)}
							>
								Hide results
							</button>
						</Show>
						<Button variant="secondary" size="sm" onClick={checkHealth} loading={checkingHealth() ? 'Checking...' : ''}>
							{health() ? 'Check again' : 'Check cache health'}
						</Button>
					</div>
				</div>

				<Show when={health()}>
					<div class="ap-space-y-2">
						<div class="ap-text-sm ap-text-slate-600">
							<span class="ap-font-semibold ap-text-slate-900">{health().hit_rate}%</span> of {health().measured} sampled pages served from the edge cache.
						</div>
						<div class="ap-space-y-1">
							<For each={health().samples}>
								{(s) => (
									<div class="ap-flex ap-items-center ap-justify-between ap-text-xs ap-gap-2">
										<code class="ap-text-slate-500 ap-truncate">{s.url}</code>
										<span
											class="ap-px-1.5 ap-py-0.5 ap-rounded ap-font-medium ap-flex-shrink-0"
											classList={{
												'ap-bg-green-100 ap-text-green-700': s.state === 'HIT',
												'ap-bg-amber-100 ap-text-amber-700': s.state === 'MISS',
												'ap-bg-slate-100 ap-text-slate-500': s.state !== 'HIT' && s.state !== 'MISS',
											}}
										>
											{s.state}
										</span>
									</div>
								)}
							</For>
						</div>
						<p class="ap-text-xs ap-text-slate-400">
							A page is a MISS the first time it is requested, then a HIT once cached. Run again after browsing to see the rate climb.
						</p>
					</div>
				</Show>
			</div>

			{/* Pages to keep out of the cache. Grouped together because
			    "which pages are dynamic" is one question, not four. */}
			<div class="ap-p-5 ap-bg-white ap-rounded-lg ap-border ap-border-slate-200 ap-space-y-4">
				<div>
					<h4 class="ap-text-sm ap-font-semibold ap-text-slate-700">Pages to never cache</h4>
					<p class="ap-text-xs ap-text-slate-500 ap-mt-0.5">
						Anything that changes per visitor - logins, carts, forms, personalised content.
						Cart, checkout and account pages are handled automatically.
					</p>
				</div>

				<MultiSelect
					value={excludedContent()}
					placeholder="Search pages, posts, categories, tags…"
					search={searchContent}
					onChange={setExcludedContent}
				/>

				<div class="ap-space-y-1">
					<Textarea
						value={settings.cf_exclude_urls}
						onInput={(e) => {
							if (isLocked()) {
								shakePromo();
								return;
							}
							settings.cf_exclude_urls = e.target.value;
						}}
						placeholder="/thank-you&#10;/members/*"
						rows={2}
						disabled={isLocked()}
					/>
					<p class="ap-text-xs ap-text-slate-500">
						Or match by path - one per line, trailing <code>*</code> for a prefix. Picking a category also excludes its posts.
					</p>
				</div>
			</div>
		</div>
	);
}
