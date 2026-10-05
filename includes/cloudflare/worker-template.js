/**
 * TD SPA edge cache Worker (template).
 *
 * PHP (TD SPA\Cloudflare\API::get_worker_script) reads this file and
 * injects a JSON object of the deploy-time defaults at the config token below
 * before uploading it to Cloudflare. The same file is exercised
 * directly by tests/cloudflare/worker.test.mjs, so keep it dependency-free.
 *
 * Runtime config (kill switch, TTL, bypass rules, exclude list) is read from
 * the bound KV namespace TD_SPA_KV when present, so the plugin can change
 * behaviour without redeploying the Worker. When KV is not bound yet the baked
 * defaults are used, which keeps the Worker working on its own.
 *
 * Two cache layers:
 *   L1  caches.default - per-datacenter, free, instantly purgeable.
 *   L2  KV             - globally replicated, so a colo that has never seen a
 *                        page can still serve it without touching the origin.
 *
 * The Worker only ever *reads* L2. Pages are written to KV by the plugin when
 * content is published, which keeps writes proportional to editing rather than
 * to traffic - KV allows only 1,000 writes/day on the free plan, so a
 * write-on-miss design would exhaust it almost immediately.
 *
 * L2 keys carry a generation number (page:{generation}:{path}). Bumping the
 * generation orphans every old key at once, which makes a global flush
 * instant instead of waiting on KV's ~60s delete propagation.
 *
 * ## The config-key rule
 *
 * KV config is merged over the baked defaults with Object.assign, so the
 * Worker tolerates keys it has never heard of. What it does NOT tolerate is a
 * key disappearing or changing meaning, because a site can run an old Worker
 * against new config for as long as it takes the redeploy to reach it.
 *
 *   - Adding a key is always safe. Give it a sensible fallback here.
 *   - Removing or renaming a key needs a Cache::WORKER_VERSION bump plus a
 *     Cache::worker_at_least() gate on the PHP side, so the plugin keeps
 *     writing the old key until the deployed Worker is known to be new enough.
 *   - Changing what a key means is a rename. Treat it as one.
 *   - Anything that changes cache-key or stored-page shape also needs an entry
 *     in Cache::WORKER_GENERATION_BUMPS, since old L2 entries become garbage.
 *
 * Bump WORKER_VERSION when you edit this file in a way PHP has to know about.
 * Plain edits are caught anyway: the plugin stores a hash of this file and
 * redeploys when it stops matching.
 */

const DEFAULT_CONFIG = __TD_SPA_CONFIG__;

const SKIP_EXTENSIONS = [
  'js', 'css', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico',
  'woff', 'woff2', 'ttf', 'eot', 'webp', 'avif', 'map',
];

// Isolate-local memo so we do not read KV on every request.
let configCache = null;
let configCacheAt = 0;
const CONFIG_TTL_MS = 60000;

async function loadConfig(env) {
  const now = Date.now();
  if (configCache && now - configCacheAt < CONFIG_TTL_MS) {
    return configCache;
  }

  let config = DEFAULT_CONFIG;
  try {
    if (env && env.TD_SPA_KV) {
      const raw = await env.TD_SPA_KV.get('config');
      if (raw) {
        config = Object.assign({}, DEFAULT_CONFIG, JSON.parse(raw));
      }
    }
  } catch (e) {
    // Bad/missing KV value: fall back to baked defaults.
    config = DEFAULT_CONFIG;
  }

  configCache = config;
  configCacheAt = now;
  return config;
}

function tag(response, value) {
  const out = new Response(response.body, response);
  out.headers.set('X-TD SPA-Cache', value);
  return out;
}

async function passthrough(request, value) {
  const response = await fetch(request);
  return tag(response, value);
}

/**
 * Current version of a page, bumped by the plugin whenever the page is
 * edited. Pages that have never been edited since deploy are version 0.
 */
function pageVersion(config, url) {
  const versions = config.versions || {};
  return String(versions[url.pathname] || 0);
}

/**
 * Fetch from origin and store, returning the origin response.
 *
 * Shared by the cold path and the background refresh, so both apply exactly
 * the same rules about what may be cached.
 */
async function fetchAndStore(request, cache, config, version, ctx) {
  const response = await fetch(request);

  // Only store safe, static HTML. A Set-Cookie means the response is
  // per-request (nonce, session, cart) and must never be cached.
  const contentType = response.headers.get('Content-Type') || '';
  const setsCookie = response.headers.has('Set-Cookie');
  if (response.status === 200 && contentType.includes('text/html') && !setsCookie) {
    const ttl = config.edge_ttl || 3600;
    // WordPress HTML ships no-cache headers, so force a cacheable copy;
    // otherwise cache.put stores nothing.
    const toCache = new Response(response.clone().body, response);
    toCache.headers.set('Cache-Control', 'public, max-age=' + ttl);
    toCache.headers.set('X-TD SPA-V', version);
    toCache.headers.delete('Set-Cookie');
    ctx.waitUntil(cache.put(request, toCache));
  }

  return response;
}

/**
 * L2 key. The generation prefix makes a global flush a single number bump.
 *
 * The fallback matches the plugin's first generation, so a Worker running on
 * baked defaults still reads the keys the plugin writes.
 */
function pageKey(config, url) {
  return 'page:' + (config.generation || 1) + ':' + url.pathname;
}

/**
 * Read a stored page from KV. Never throws: L2 is an optimisation, and a KV
 * outage or a malformed value must fall through to the origin, not 500.
 */
async function readPage(env, config, url) {
  try {
    const raw = await env.TD_SPA_KV.get(pageKey(config, url));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed.html === 'string' ? parsed : null;
  } catch (e) {
    return null;
  }
}

function isExcluded(url, list) {
  for (const entry of list) {
    if (!entry) continue;
    if (entry.endsWith('*')) {
      if (url.pathname.startsWith(entry.slice(0, -1))) return true;
    } else if (url.pathname === entry || url.href === entry) {
      return true;
    }
  }
  return false;
}

/**
 * Constant-time-ish compare so the refresh token cannot be probed one byte
 * at a time by timing repeated requests.
 */
function tokenMatches(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Rebuild one page's cache entry on demand.
 *
 * WordPress calls this the moment a page is edited, so the cache is warm
 * again immediately instead of waiting for a visitor to trigger the
 * background refresh. Whatever was stored is replaced, which is the
 * invalidation - there is never a window with no entry.
 */
async function handleRefresh(request, url, config, ctx) {
  const target = new Request(url.origin + url.pathname, {
    headers: { 'User-Agent': request.headers.get('User-Agent') || 'TD SPA' },
  });

  const cache = caches.default;
  const version = pageVersion(config, url);
  const response = await fetchAndStore(target, cache, config, version, ctx);

  return new Response(
    JSON.stringify({ ok: response.status === 200, status: response.status, v: version }),
    { headers: { 'Content-Type': 'application/json', 'X-TD SPA-Cache': 'REFRESHED' } }
  );
}

async function handle(request, env, ctx) {
  // Only GET is cacheable.
  if (request.method !== 'GET') {
    return fetch(request);
  }

  const url = new URL(request.url);
  const config = await loadConfig(env);


  // Instant global off switch (flipped via KV, no redeploy).
  if (config.kill) {
    return passthrough(request, 'BYPASS');
  }

  // Logged-in / session cookies: never cache per-user responses.
  const cookie = request.headers.get('Cookie') || '';
  const bypassCookies = config.bypass_cookies || [];
  if (bypassCookies.some((c) => cookie.includes(c))) {
    return passthrough(request, 'BYPASS');
  }

  // Path prefixes and the exclude list (dynamic pages).
  const bypassPatterns = config.bypass_patterns || [];
  if (bypassPatterns.some((p) => url.pathname.startsWith(p))) {
    return passthrough(request, 'BYPASS');
  }
  if (isExcluded(url, config.exclude_urls || [])) {
    return passthrough(request, 'BYPASS');
  }

  // Dynamic query markers: add-to-cart actions and nonce'd URLs are never
  // the same for two visitors, so never cache them.
  if (url.search.includes('add-to-cart=') || url.search.includes('_wpnonce=')) {
    return passthrough(request, 'BYPASS');
  }

  // Static assets are handled by Cloudflare's normal cache, not us.
  if (url.pathname.includes('.')) {
    const ext = url.pathname.split('.').pop().toLowerCase();
    if (SKIP_EXTENSIONS.includes(ext)) {
      return fetch(request);
    }
  }

  // Authenticated refresh ping from the site itself, asking for this page to
  // be rebuilt now rather than on the next visit.
  //
  // Placed after every bypass and exclude check on purpose: the ping must not
  // be a way to force an uncacheable page into the cache. Placed before the
  // lookup so it rebuilds instead of being handed the stale copy it came to
  // replace. With no token configured the path does not exist at all.
  const refreshToken = request.headers.get('X-TD SPA-Refresh');
  if (refreshToken && config.refresh_token && tokenMatches(refreshToken, config.refresh_token)) {
    return handleRefresh(request, url, config, ctx);
  }

  const cache = caches.default;
  const version = pageVersion(config, url);
  const hit = await cache.match(request);

  if (hit) {
    // The version the copy was stored at. Absent means it predates
    // versioning, which counts as stale.
    const cachedVersion = hit.headers.get('X-TD SPA-V');

    if (cachedVersion === version) {
      return tag(hit, 'HIT');
    }

    // The page has been edited since this copy was stored. Serve the copy we
    // already have so the visitor waits for nothing, and refresh in the
    // background - by the next request this colo is current again.
    //
    // Deliberately not keyed on the version: a versioned cache key would
    // make every edit a hard miss, so the first visitor after each edit
    // would pay the full origin round trip. That is the wait this whole
    // mechanism exists to avoid.
    ctx.waitUntil(fetchAndStore(request, cache, config, version, ctx));
    return tag(hit, 'STALE');
  }

  // L2: globally replicated copy. Serving from here also warms L1 so the
  // next request in this colo never needs the KV round trip.
  if (config.kv_pages && env && env.TD_SPA_KV) {
    const stored = await readPage(env, config, url);
    if (stored) {
      const ttl = config.edge_ttl || 3600;
      const headers = {
        'Content-Type': stored.ct || 'text/html; charset=UTF-8',
        'Cache-Control': 'public, max-age=' + ttl,
        'X-TD SPA-V': stored.v != null ? String(stored.v) : version,
      };
      ctx.waitUntil(cache.put(request, new Response(stored.html, { headers })));
      return new Response(stored.html, {
        headers: Object.assign({}, headers, { 'X-TD SPA-Cache': 'HIT-KV' }),
      });
    }
  }

  const response = await fetchAndStore(request, cache, config, version, ctx);
  return tag(response, 'MISS');
}

export default {
  async fetch(request, env, ctx) {
    try {
      return await handle(request, env, ctx);
    } catch (e) {
      // Never let the cache layer break the site: fall back to origin.
      return fetch(request);
    }
  },
};
