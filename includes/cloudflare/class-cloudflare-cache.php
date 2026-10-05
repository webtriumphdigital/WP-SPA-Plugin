<?php
/**
 * Cloudflare Cache Manager.
 *
 * @package TD SPA
 * @since 2.4.0
 */

namespace TDSPA\Cloudflare;

defined( 'ABSPATH' ) || die();

if ( ! class_exists( __NAMESPACE__ . '\Cache' ) ) {

	/**
	 * Cloudflare Cache Manager.
	 */
	class Cache {

		/**
		 * Worker script name.
		 */
		const WORKER_NAME = 'td-spa-cache';

		/**
		 * Version of the Worker this plugin build wants deployed.
		 *
		 * Hand-bumped whenever the Worker gains behaviour PHP needs to know
		 * about, so `worker_at_least()` can gate on it. Version 1 is the
		 * earlier unversioned Worker from pre-release builds; sites still
		 * running it report 0, because nothing recorded a version back then.
		 *
		 * A bump on its own does not change the Worker. Pair it with the
		 * template edit that earns it.
		 */
		const WORKER_VERSION = 2;

		/**
		 * Worker versions that invalidate everything already in L2.
		 *
		 * Only for changes to the cache key or the shape of a stored page -
		 * anything that makes existing KV entries unreadable to the new
		 * Worker. A bump throws away the whole L2 layer and it refills only as
		 * content is edited, so a site that publishes rarely can be without
		 * L2 for a long time afterwards. Not a routine step.
		 *
		 * Empty is the normal state. Add a version number here only when the
		 * old entries genuinely cannot be used.
		 */
		const WORKER_GENERATION_BUMPS = array();

		/**
		 * Option holding the Worker version last uploaded from this site.
		 */
		const WORKER_VERSION_OPTION = 'td_spa_cf_worker_version';

		/**
		 * Option holding the template hash last uploaded from this site.
		 */
		const WORKER_HASH_OPTION = 'td_spa_cf_worker_hash';

		/**
		 * Scheduled event that pushes a new Worker to Cloudflare.
		 *
		 * The redeploy state lives here rather than on Hooks so that clearing
		 * it on deploy and teardown does not make Cache depend on Hooks.
		 */
		const REDEPLOY_EVENT = 'td_spa_cf_redeploy_worker';

		/**
		 * Transient held for the duration of one redeploy attempt.
		 */
		const REDEPLOY_LOCK = 'td_spa_cf_redeploy_lock';

		/**
		 * Option counting consecutive failed redeploy attempts.
		 */
		const REDEPLOY_ATTEMPTS_OPTION = 'td_spa_cf_redeploy_attempts';

		/**
		 * Option holding the last redeploy error once retries are exhausted.
		 */
		const REDEPLOY_FAILED_OPTION = 'td_spa_cf_redeploy_failed';

		/**
		 * KV binding variable name exposed to the worker.
		 */
		const KV_BINDING = 'TD_SPA_KV';

		/**
		 * KV config key the worker reads.
		 */
		const KV_CONFIG_KEY = 'config';

		/**
		 * Option holding the L2 key generation.
		 */
		const GENERATION_OPTION = 'td_spa_cf_kv_generation';

		/**
		 * Ceiling on resolved exclude paths. The worker walks this list on
		 * every request, so it must stay small enough to be cheap.
		 */
		const MAX_EXCLUDE_PATHS = 500;

		/**
		 * Largest page we will put in KV. KV's own limit is 25MB; this is a
		 * sanity bound so one enormous page cannot dominate the namespace.
		 */
		const MAX_KV_PAGE_BYTES = 1048576;

		/**
		 * Option holding the per-page version map.
		 */
		const VERSIONS_OPTION = 'td_spa_cf_page_versions';

		/**
		 * Option holding the worker refresh secret.
		 */
		const REFRESH_TOKEN_OPTION = 'td_spa_cf_refresh_token';

		/**
		 * Option holding the timestamp of the last successful config sync.
		 */
		const LAST_SYNCED_OPTION = 'td_spa_cf_last_synced';

		/**
		 * How many page versions to keep. The map travels in the config blob
		 * the worker reads, so it has to stay small; the oldest entries are
		 * dropped first. A dropped page falls back to version 0, which just
		 * means its next edit re-registers it.
		 */
		const MAX_VERSION_ENTRIES = 500;

		/**
		 * API instance.
		 *
		 * @var API
		 */
		private $api;

		/**
		 * Constructor.
		 *
		 * @param API|null $api API instance.
		 */
		public function __construct( $api = null ) {
			$this->api = null !== $api ? $api : new API();
		}

		/**
		 * Check if Cloudflare cache is enabled and configured.
		 *
		 * @return bool
		 */
		public function is_enabled() {
			return (bool) get_option( 'td_spa_cf_cache_enabled', false );
		}

		/**
		 * Get current configuration status.
		 *
		 * @return array
		 */
		public function get_status() {
			$enabled    = $this->is_enabled();
			$zone_id    = get_option( 'td_spa_cf_zone_id', '' );
			$zone_name  = get_option( 'td_spa_cf_zone_name', '' );
			$route_id   = get_option( 'td_spa_cf_route_id', '' );
			$account_id = get_option( 'td_spa_cf_account_id', '' );

			$auth = self::auth_method();

			return array(
				'enabled'           => $enabled,
				'connected'         => ! empty( $zone_id ) && ! empty( $route_id ),
				'zone_id'           => $zone_id,
				'zone_name'         => $zone_name,
				'route_id'          => $route_id,
				'route_pattern'     => get_option( 'td_spa_cf_route_pattern', '' ),
				'account_id'        => $account_id,
				'worker_name'       => self::WORKER_NAME,
				'auto_purge'        => (bool) get_option( 'td_spa_cf_auto_purge', true ),
				'kv_connected'      => ! empty( get_option( 'td_spa_cf_kv_namespace_id', '' ) ),
				'paused'            => (bool) get_option( 'td_spa_cf_kill', false ),

				// Which edge Worker this site is actually running, and whether
				// the plugin has moved past it.
				'worker_version'    => (int) get_option( self::WORKER_VERSION_OPTION, 0 ),
				'worker_latest'     => self::WORKER_VERSION,
				'worker_stale'      => self::worker_stale(),

				// Only set once the background retries have given up, so its
				// presence is the signal that a person needs to intervene.
				'worker_failed'     => get_option( self::REDEPLOY_FAILED_OPTION, null ),

				// The Cloudflare account can be linked before a zone is
				// deployed, so the UI needs to report the two separately -
				// otherwise a successful connect looks like nothing happened.
				'account_connected' => '' !== $auth,
				'auth_method'       => $auth,

				// Whole-site warm: whether it is still running, and how many
				// pages it has pushed to the edge so far.
				'warming'           => $this->warm_has_more(),
				'warm_done'         => (int) get_option( self::WARM_DONE_OPTION, 0 ),

				// At-a-glance summary.
				'cached_pages'      => count( (array) get_option( self::VERSIONS_OPTION, array() ) ),
				'last_synced'       => (int) get_option( self::LAST_SYNCED_OPTION, 0 ),
				'last_synced_human' => self::last_synced_human(),
			);
		}

		/**
		 * Hash (sha256) of the Worker template as it sits on disk.
		 *
		 * Taken before config injection on purpose. The rendered script differs
		 * per site (exclude lists, TTL, generation), so hashing it would make
		 * every site look like it needed a new Worker every time a setting
		 * changed. Hashing the template instead answers exactly one question:
		 * has the Worker code itself moved on?
		 *
		 * This is the safety net under WORKER_VERSION, for the edit where
		 * someone forgot to bump it.
		 *
		 * @return string Hex digest, or '' when the template cannot be read.
		 */
		public static function template_hash() {
			static $hash = null;

			if ( null !== $hash ) {
				return $hash;
			}

			$path = API::worker_template_path();
			$hash = is_readable( $path ) ? hash_file( 'sha256', $path ) : '';

			return $hash;
		}

		/**
		 * Whether the deployed Worker is at least version $version.
		 *
		 * The gate that keeps plugin code from assuming Worker behaviour that
		 * may not be out there yet: a site can run a months-old Worker against
		 * a freshly updated plugin until the background redeploy catches up.
		 *
		 * @param int $version Minimum Worker version required.
		 * @return bool
		 */
		public static function worker_at_least( $version ) {
			return (int) get_option( self::WORKER_VERSION_OPTION, 0 ) >= (int) $version;
		}

		/**
		 * Whether the deployed Worker is behind this plugin build.
		 *
		 * True when the stored version is older than WORKER_VERSION, or when
		 * the template has been edited since the last upload. Only meaningful
		 * on a connected site - there is nothing stale about a Worker that was
		 * never deployed.
		 *
		 * @return bool
		 */
		public static function worker_stale() {
			if ( empty( get_option( 'td_spa_cf_route_id', '' ) ) ) {
				return false;
			}

			if ( (int) get_option( self::WORKER_VERSION_OPTION, 0 ) < self::WORKER_VERSION ) {
				return true;
			}

			$stored  = (string) get_option( self::WORKER_HASH_OPTION, '' );
			$current = self::template_hash();

			// An unreadable template gives no signal either way, so say no
			// rather than schedule a redeploy that cannot succeed.
			if ( '' === $current ) {
				return false;
			}

			return $stored !== $current;
		}

		/**
		 * Whether this site both needs a new Worker and could deploy one.
		 *
		 * Staleness alone is not enough: without a route and an account id
		 * there is nothing to upload to, and scheduling work that can only
		 * fail helps nobody.
		 *
		 * @return bool
		 */
		public static function needs_worker_redeploy() {
			$route_id   = get_option( 'td_spa_cf_route_id', '' );
			$account_id = get_option( 'td_spa_cf_account_id', '' );

			if ( empty( $route_id ) || empty( $account_id ) ) {
				return false;
			}

			return self::worker_stale();
		}

		/**
		 * Record which Worker this site is running, after a successful upload.
		 *
		 * @return void
		 */
		private function store_worker_identity() {
			update_option( self::WORKER_VERSION_OPTION, self::WORKER_VERSION );
			update_option( self::WORKER_HASH_OPTION, self::template_hash() );

			// The site is current again, so any earlier failure is history.
			// Left in place it would block the next automatic redeploy.
			delete_option( self::REDEPLOY_ATTEMPTS_OPTION );
			delete_option( self::REDEPLOY_FAILED_OPTION );
		}

		/**
		 * "2 minutes ago" for the last successful config sync.
		 *
		 * @return string
		 */
		public static function last_synced_human() {
			$when = (int) get_option( self::LAST_SYNCED_OPTION, 0 );

			if ( ! $when ) {
				return '';
			}

			return sprintf(
				/* translators: %s: human-readable time difference, e.g. "2 minutes". */
				__( '%s ago', 'td-spa' ),
				human_time_diff( $when, time() )
			);
		}

		/**
		 * How this site currently authenticates with Cloudflare.
		 *
		 * @return string 'oauth', 'token', or '' when not linked.
		 */
		public static function auth_method() {
			if ( class_exists( __NAMESPACE__ . '\OAuth' ) && ( new OAuth() )->is_connected() ) {
				return 'oauth';
			}
			return ! empty( get_option( 'td_spa_cf_api_token', '' ) ) ? 'token' : '';
		}

		/**
		 * Deploy worker and create route.
		 *
		 * @param string $zone_id Zone ID.
		 * @return array|WP_Error
		 */
		public function deploy( $zone_id ) {
			// Get zone info.
			$zone_result = $this->api->get_zone( $zone_id );
			if ( is_wp_error( $zone_result ) ) {
				return $zone_result;
			}

			$zone = $zone_result['result'];

			// Verify zone is proxied/active.
			if ( 'active' !== $zone['status'] ) {
				return new \WP_Error(
					'zone_not_active',
					__( 'Zone is not active. Please ensure your domain is properly configured in Cloudflare.', 'td-spa' )
				);
			}

			// Get account ID from zone.
			$account_id = $zone['account']['id'];

			// Get site host for route pattern (handles subdomains).
			$site_host = wp_parse_url( home_url(), PHP_URL_HOST );

			// Verify site host matches zone.
			if ( ! $this->domain_matches_zone( $site_host, $zone['name'] ) ) {
				return new \WP_Error(
					'domain_mismatch',
					sprintf(
						// translators: 1: site domain, 2: Cloudflare zone name.
						__( 'Your site domain (%1$s) does not match the selected Cloudflare zone (%2$s).', 'td-spa' ),
						$site_host,
						$zone['name']
					)
				);
			}

			// Make WooCommerce's per-customer pages visible in the exclude
			// list before the first config is built.
			$this->seed_woocommerce_excludes();

			// Runtime config used both as the worker's baked defaults and as
			// the initial KV config.
			$config = $this->build_config();

			// Provision (or reuse) the KV namespace the worker reads config
			// from, so behaviour can change later without a redeploy.
			$namespace_id = $this->ensure_kv_namespace( $account_id );
			$bindings     = array();
			if ( ! is_wp_error( $namespace_id ) && $namespace_id ) {
				$bindings[] = $this->api->kv_binding( self::KV_BINDING, $namespace_id );
			}

			// Generate worker script.
			$script = $this->api->get_worker_script( $config );

			// Upload worker (with the KV binding when available).
			$upload_result = $this->api->upload_worker( $account_id, self::WORKER_NAME, $script, $bindings );
			if ( is_wp_error( $upload_result ) ) {
				return $upload_result;
			}

			// Cloudflare has the script now, so record what it is. Done here
			// rather than at the end because both exits below - new route and
			// route-already-exists - are past this point.
			$this->store_worker_identity();

			// Create route pattern using site host (handles subdomains).
			$pattern = $site_host . '/*';

			// Check if route already exists.
			$routes = $this->api->list_routes( $zone_id );
			if ( ! is_wp_error( $routes ) && ! empty( $routes['result'] ) ) {
				foreach ( $routes['result'] as $route ) {
					if ( $pattern === $route['pattern'] && self::WORKER_NAME === $route['script'] ) {
						// Route already exists, store info and return.
						$this->save_deployment_info( $zone, $route['id'], $pattern, $account_id );
						$this->sync_config();
						$this->queue_warm_pages();
						return array(
							'success'       => true,
							'route_id'      => $route['id'],
							'route_pattern' => $pattern,
							'message'       => __( 'Route already exists. Configuration updated.', 'td-spa' ),
						);
					}
				}
			}

			// Create route.
			$route_result = $this->api->create_route( $zone_id, $pattern, self::WORKER_NAME );
			if ( is_wp_error( $route_result ) ) {
				// Cleanup worker if route creation fails.
				$this->api->delete_worker( $account_id, self::WORKER_NAME );
				return $route_result;
			}

			$route_id = $route_result['result']['id'];

			// Save deployment info.
			$this->save_deployment_info( $zone, $route_id, $pattern, $account_id );

			// Push the initial config to KV.
			$this->sync_config();

			// Give L2 a starting set of pages. Left to itself it stays empty
			// until someone edits something.
			$this->queue_warm_pages();

			return array(
				'success'       => true,
				'route_id'      => $route_id,
				'route_pattern' => $pattern,
				'message'       => __( 'Cloudflare cache deployed successfully.', 'td-spa' ),
			);
		}

		/**
		 * Pages warmed per background run.
		 *
		 * Each one is an HTTP request to the site plus a KV write, and cron
		 * runs under whatever max_execution_time the host allows. Small
		 * batches that finish beat one big batch that gets killed halfway.
		 */
		const WARM_BATCH = 5;

		/**
		 * Seconds one warm run may spend before leaving the rest for later.
		 */
		const WARM_TIME_BUDGET = 15;

		/**
		 * KV writes a day the warm crawl will spend.
		 *
		 * KV's free plan allows 1,000 writes a day, and content edits and
		 * config syncs draw on the same allowance, so the crawl stops short of
		 * the limit and picks up again the next day. A large site therefore
		 * warms over several days rather than failing partway through when
		 * Cloudflare starts returning 429. Filterable for paid plans, whose
		 * ceiling is far higher.
		 */
		const WARM_DAILY_BUDGET = 900;

		/**
		 * Option holding the fixed seed URLs still waiting to be warmed.
		 */
		const WARM_QUEUE_OPTION = 'td_spa_cf_warm_queue';

		/**
		 * Option holding the crawl cursor: the highest post ID not yet warmed.
		 *
		 * The crawl walks published content by ID, newest first, storing only
		 * this one number rather than a list of every URL. So a 50,000-page
		 * site costs one integer in the options table, not a queue the size of
		 * the site. Absent means no crawl is in progress.
		 */
		const WARM_CURSOR_OPTION = 'td_spa_cf_warm_cursor';

		/**
		 * Option holding today's warm write count: `{ date, count }`.
		 */
		const WARM_BUDGET_OPTION = 'td_spa_cf_warm_budget';

		/**
		 * Option counting pages warmed into KV by the current crawl. Reset when
		 * a fresh crawl starts; drives the "N pages cached" readout.
		 */
		const WARM_DONE_OPTION = 'td_spa_cf_warm_done';

		/**
		 * Scheduled event that warms the next batch into L2.
		 */
		const WARM_EVENT = 'td_spa_cf_warm_l2';

		/**
		 * Start warming the whole site into L2.
		 *
		 * Without this, L2 only ever fills as content is edited, so a site
		 * that publishes rarely gets little or no second layer. This seeds the
		 * front page, the posts page and the post-type archives, then sets a
		 * cursor to crawl every published singular page from newest to oldest.
		 *
		 * All of it runs in the background. The connect request only records
		 * where to start; the pages themselves are fetched and stored by the
		 * scheduled event, a few at a time, within a daily write budget.
		 *
		 * @return int Number of seed URLs queued (the singular crawl is on top).
		 */
		public function queue_warm_pages() {
			if ( ! $this->kv_pages_enabled() ) {
				return 0;
			}

			$seed = $this->warm_seed_urls();

			if ( ! empty( $seed ) ) {
				update_option( self::WARM_QUEUE_OPTION, $seed, false );
			} else {
				delete_option( self::WARM_QUEUE_OPTION );
			}

			// PHP_INT_MAX so the first crawl query ("ID < cursor") returns the
			// newest post. The cursor walks down from there.
			update_option( self::WARM_CURSOR_OPTION, PHP_INT_MAX, false );

			// Fresh crawl, fresh count.
			update_option( self::WARM_DONE_OPTION, 0, false );

			$this->reschedule_warm( 60 );

			return count( $seed );
		}

		/**
		 * The fixed set of non-singular pages worth warming: the front page,
		 * the posts page and each post type's archive.
		 *
		 * The bulk of a site - its posts, pages and products - is covered by
		 * the singular crawl instead, so this stays small and bounded no matter
		 * how large the site is.
		 *
		 * @return array Absolute URLs, already filtered against the excludes.
		 */
		public function warm_seed_urls() {
			$urls = array( home_url( '/' ) );

			$posts_page = (int) get_option( 'page_for_posts', 0 );
			if ( $posts_page ) {
				$link = get_permalink( $posts_page );
				if ( $link ) {
					$urls[] = $link;
				}
			}

			// Archives for any public post type that has one (Shop, etc),
			// which picks up WooCommerce without naming it.
			$types = get_post_types( array( 'public' => true ), 'objects' );
			foreach ( $types as $type ) {
				if ( 'attachment' === $type->name || ! $type->has_archive ) {
					continue;
				}
				$link = get_post_type_archive_link( $type->name );
				if ( $link ) {
					$urls[] = $link;
				}
			}

			$urls = $this->filter_warmable( array_values( array_unique( array_filter( $urls ) ) ) );

			/**
			 * The fixed seed pages warmed into L2 on connect. Archives, author
			 * and date pages, or anything else, can be added here.
			 *
			 * @param array $urls  Absolute URLs, filtered against the excludes.
			 * @param Cache $cache Cache instance.
			 */
			$urls = (array) apply_filters( 'td_spa_cf_warm_seed_urls', $urls, $this );

			return array_values( $urls );
		}

		/**
		 * Drop URLs the worker would refuse to cache anyway, so the write
		 * budget is not spent on requests that could never be stored.
		 * push_page() re-checks; this just avoids the wasted round trip.
		 *
		 * @param array $urls Absolute URLs.
		 * @return array
		 */
		private function filter_warmable( $urls ) {
			$config = $this->build_config();
			$out    = array();

			foreach ( $urls as $url ) {
				$path = self::url_to_path( $url );
				if ( ! $path || self::path_is_excluded( $path, $config['exclude_urls'] ) ) {
					continue;
				}
				$out[] = $url;
			}

			return $out;
		}

		/**
		 * The next page IDs to warm, walking down from a cursor.
		 *
		 * Keyset pagination by ID (not offset) so the crawl can never skip or
		 * repeat a page when content is published or deleted while it runs.
		 * WP_Query has no "ID below N" parameter, so this is a direct query.
		 *
		 * @param int $cursor Return published IDs strictly below this.
		 * @param int $limit  How many.
		 * @return int[] Descending post IDs.
		 */
		public function warm_singular_ids( $cursor, $limit ) {
			global $wpdb;

			$types = get_post_types( array( 'public' => true ), 'names' );
			unset( $types['attachment'] );

			if ( empty( $types ) || $limit < 1 ) {
				return array();
			}

			$placeholders = implode( ', ', array_fill( 0, count( $types ), '%s' ) );
			$params       = array_merge( array_values( $types ), array( (int) $cursor, (int) $limit ) );

			// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Keyset crawl over the posts table; WP_Query offers no ID-range query, and this runs from cron, not per request.
			$ids = $wpdb->get_col(
				$wpdb->prepare(
					"SELECT ID FROM {$wpdb->posts}
					 WHERE post_status = 'publish'
					   AND post_type IN ( {$placeholders} )
					   AND ID < %d
					 ORDER BY ID DESC
					 LIMIT %d",
					$params
				)
			);
			// phpcs:enable

			return array_map( 'intval', (array) $ids );
		}

		/**
		 * Warm the next batch into L2, respecting the batch size, a wall-clock
		 * limit and the daily write budget.
		 *
		 * @return int Pages warmed this run.
		 */
		public function warm_next_batch() {
			if ( ! $this->kv_pages_enabled() || ! $this->warm_has_more() ) {
				$this->clear_warm_state();
				return 0;
			}

			$budget = $this->warm_budget_remaining();
			if ( $budget <= 0 ) {
				// Out of today's KV write allowance. Pick up when it resets.
				$this->reschedule_warm( HOUR_IN_SECONDS );
				return 0;
			}

			$started = time();
			$done    = 0;

			while (
				$done < self::WARM_BATCH
				&& $budget > 0
				&& ( time() - $started ) < self::WARM_TIME_BUDGET
			) {
				$urls = $this->dequeue_warm_urls( (int) min( self::WARM_BATCH - $done, $budget ) );

				if ( empty( $urls ) ) {
					// Either finished, or this pass was all excluded pages and
					// the cursor moved on - keep going while there is more.
					if ( ! $this->warm_has_more() ) {
						break;
					}
					continue;
				}

				foreach ( $urls as $url ) {
					$stored = $this->push_page( $url );
					$done++;
					if ( ! is_wp_error( $stored ) && false !== $stored ) {
						$budget = $this->warm_budget_spend( 1 );
						update_option( self::WARM_DONE_OPTION, (int) get_option( self::WARM_DONE_OPTION, 0 ) + 1, false );
					}
				}
			}

			if ( $this->warm_has_more() ) {
				$this->reschedule_warm( $this->warm_budget_remaining() > 0 ? 60 : HOUR_IN_SECONDS );
			} else {
				$this->clear_warm_state();
			}

			return $done;
		}

		/**
		 * Take up to $limit URLs to warm: the seed queue first, then the crawl.
		 *
		 * Advances both the queue and the cursor as it reads, so progress
		 * survives a run that gets cut short. Excluded pages are dropped here,
		 * which still counts as crawl progress - they are not retried.
		 *
		 * @param int $limit Ceiling on URLs returned.
		 * @return array Absolute URLs.
		 */
		private function dequeue_warm_urls( $limit ) {
			$urls = array();

			// Fixed seed / leftovers first.
			$queue = (array) get_option( self::WARM_QUEUE_OPTION, array() );
			$taken = 0;
			while ( $queue && $taken < $limit ) {
				$urls[] = array_shift( $queue );
				$taken++;
			}
			if ( empty( $queue ) ) {
				delete_option( self::WARM_QUEUE_OPTION );
			} else {
				update_option( self::WARM_QUEUE_OPTION, array_values( $queue ), false );
			}

			if ( count( $urls ) >= $limit ) {
				return $urls;
			}

			// Then the singular crawl.
			$cursor = get_option( self::WARM_CURSOR_OPTION, false );
			if ( false === $cursor ) {
				return $urls;
			}

			$need = $limit - count( $urls );
			$ids  = $this->warm_singular_ids( (int) $cursor, $need );

			if ( empty( $ids ) ) {
				delete_option( self::WARM_CURSOR_OPTION );
				return $urls;
			}

			$config = $this->build_config();
			$last   = (int) $cursor;

			foreach ( $ids as $id ) {
				$last = $id;
				$link = get_permalink( $id );
				if ( ! $link ) {
					continue;
				}
				$path = self::url_to_path( $link );
				if ( ! $path || self::path_is_excluded( $path, $config['exclude_urls'] ) ) {
					continue;
				}
				$urls[] = $link;
			}

			// Fewer rows than asked for means the crawl reached the last page.
			if ( count( $ids ) < $need ) {
				delete_option( self::WARM_CURSOR_OPTION );
			} else {
				update_option( self::WARM_CURSOR_OPTION, $last, false );
			}

			return $urls;
		}

		/**
		 * Whether a warm crawl still has pages left to do.
		 *
		 * @return bool
		 */
		public function warm_has_more() {
			if ( ! empty( get_option( self::WARM_QUEUE_OPTION, array() ) ) ) {
				return true;
			}
			return false !== get_option( self::WARM_CURSOR_OPTION, false );
		}

		/**
		 * KV writes still available to warming today.
		 *
		 * @return int
		 */
		public function warm_budget_remaining() {
			$state = (array) get_option( self::WARM_BUDGET_OPTION, array() );
			$spent = ( isset( $state['date'] ) && gmdate( 'Y-m-d' ) === $state['date'] )
				? (int) $state['count']
				: 0;

			/**
			 * KV writes a day the warm crawl may spend.
			 *
			 * @param int $budget Daily write budget.
			 */
			$budget = (int) apply_filters( 'td_spa_cf_warm_daily_budget', self::WARM_DAILY_BUDGET );

			return max( 0, $budget - $spent );
		}

		/**
		 * Record warm writes against today's budget.
		 *
		 * @param int $count How many were written.
		 * @return int Budget remaining after.
		 */
		private function warm_budget_spend( $count ) {
			$today = gmdate( 'Y-m-d' );
			$state = (array) get_option( self::WARM_BUDGET_OPTION, array() );

			$spent = ( isset( $state['date'] ) && $today === $state['date'] ) ? (int) $state['count'] : 0;

			update_option(
				self::WARM_BUDGET_OPTION,
				array(
					'date'  => $today,
					'count' => $spent + (int) $count,
				),
				false
			);

			return $this->warm_budget_remaining();
		}

		/**
		 * Schedule the next warm run, unless one is already due.
		 *
		 * @param int $delay Seconds from now.
		 * @return void
		 */
		private function reschedule_warm( $delay ) {
			if ( ! wp_next_scheduled( self::WARM_EVENT ) ) {
				wp_schedule_single_event( time() + (int) $delay, self::WARM_EVENT );
			}
		}

		/**
		 * Forget the crawl. Today's write count is left to expire on its own,
		 * so re-warming the same day still respects the budget already spent.
		 *
		 * @return void
		 */
		private function clear_warm_state() {
			delete_option( self::WARM_QUEUE_OPTION );
			delete_option( self::WARM_CURSOR_OPTION );
		}

		/**
		 * Push the current Worker script to a site that is already connected.
		 *
		 * Deliberately not a re-run of deploy(). deploy() verifies the zone,
		 * creates the route, and deletes the Worker when route creation fails.
		 * Every one of those is right for a first connect and wrong here: the
		 * route already exists, a transient zone lookup hiccup must not block
		 * a script update, and the old Worker is serving live traffic - it is
		 * the correct fallback if anything goes wrong, not something to clean
		 * up. The only thing this changes is the script and its bindings.
		 *
		 * @return array|WP_Error
		 */
		public function redeploy_worker() {
			$account_id = get_option( 'td_spa_cf_account_id', '' );
			$route_id   = get_option( 'td_spa_cf_route_id', '' );

			if ( empty( $account_id ) || empty( $route_id ) ) {
				return new \WP_Error(
					'not_connected',
					__( 'Cloudflare cache is not deployed on this site.', 'td-spa' )
				);
			}

			$from = (int) get_option( self::WORKER_VERSION_OPTION, 0 );

			// Reuse the namespace this site already has. Creating a new one
			// would strand every page currently in L2.
			$bindings     = array();
			$namespace_id = get_option( 'td_spa_cf_kv_namespace_id', '' );
			if ( ! empty( $namespace_id ) ) {
				$bindings[] = $this->api->kv_binding( self::KV_BINDING, $namespace_id );
			}

			$script = $this->api->get_worker_script( $this->build_config() );

			$upload_result = $this->api->upload_worker( $account_id, self::WORKER_NAME, $script, $bindings );
			if ( is_wp_error( $upload_result ) ) {
				// Nothing is torn down here. The Worker already at the edge
				// keeps serving, which is exactly what should happen.
				return $upload_result;
			}

			$this->store_worker_identity();

			// Generation bumps happen after a confirmed upload, so a failed
			// attempt never costs the site its L2 layer. The new script has
			// the pre-bump generation baked in, which only matters if KV is
			// unreadable - and in that case the old keys are the ones it
			// should be looking at anyway.
			$bumped = false;
			if ( self::generation_bump_needed( $from, self::WORKER_VERSION ) ) {
				$this->bump_generation();
				$bumped = true;
			}

			$this->sync_config();

			return array(
				'success'    => true,
				'from'       => $from,
				'to'         => self::WORKER_VERSION,
				'generation' => $bumped,
			);
		}

		/**
		 * Whether moving from one Worker version to another orphans L2.
		 *
		 * True when any version in WORKER_GENERATION_BUMPS falls in the range
		 * being crossed, so a site jumping several versions at once still gets
		 * the bump a version in the middle asked for.
		 *
		 * @param int $from Version currently deployed.
		 * @param int $to   Version being deployed.
		 * @return bool
		 */
		public static function generation_bump_needed( $from, $to ) {
			foreach ( self::WORKER_GENERATION_BUMPS as $version ) {
				if ( (int) $version > (int) $from && (int) $version <= (int) $to ) {
					return true;
				}
			}

			return false;
		}

		/**
		 * Build the runtime cache config from options.
		 *
		 * Used as both the worker's baked defaults and the KV `config` value.
		 *
		 * @return array
		 */
		public function build_config() {
			$exclude_raw = get_option( 'td_spa_cf_exclude_urls', '' );

			$lines = function ( $raw ) {
				return array_values( array_filter( array_map( 'trim', explode( "\n", (string) $raw ) ) ) );
			};

			// Tuning knobs with no UI. Any value already saved from when these
			// had settings fields is honoured as the starting point, so
			// upgrading does not silently change behaviour.
			$bypass_patterns = $lines( get_option( 'td_spa_cf_bypass_patterns', "/wp-admin\n/wp-json\n/wp-login\n/checkout\n/cart" ) );
			$default_cookies = "wordpress_logged_in_\nwoocommerce_\nwp_woocommerce_session_\nedd_\ncomment_author_\nwordpress_sec_";
			$bypass_cookies  = $lines( get_option( 'td_spa_cf_bypass_cookies', $default_cookies ) );
			$edge_ttl        = (int) get_option( 'td_spa_cf_edge_ttl', 3600 );

			/**
			 * Paths that always skip the cache.
			 *
			 * @param array $bypass_patterns Path prefixes.
			 */
			$bypass_patterns = (array) apply_filters( 'td_spa_cf_bypass_patterns', $bypass_patterns );

			/**
			 * Cookie name fragments that force a cache bypass.
			 *
			 * @param array $bypass_cookies Cookie name fragments.
			 */
			$bypass_cookies = (array) apply_filters( 'td_spa_cf_bypass_cookies', $bypass_cookies );

			/**
			 * How long a page stays cached at the edge, in seconds.
			 *
			 * @param int $edge_ttl Seconds.
			 */
			$edge_ttl = (int) apply_filters( 'td_spa_cf_edge_ttl', $edge_ttl );

			// Exclude list = user-entered + WooCommerce dynamic pages + the
			// per-page "don't cache" opt-outs + the posts and taxonomy terms
			// picked in settings.
			$exclude_urls = self::merge_excludes(
				$lines( $exclude_raw ),
				$this->wc_exclude_paths(),
				(array) get_option( 'td_spa_cf_page_excludes', array() ),
				$this->content_exclude_paths(),
				$this->special_exclude_paths()
			);

			return array(
				'kill'            => (bool) get_option( 'td_spa_cf_kill', false ),
				'edge_ttl'        => $edge_ttl,
				'bypass_patterns' => array_values( $bypass_patterns ),
				'bypass_cookies'  => array_values( $bypass_cookies ),
				'exclude_urls'    => $exclude_urls,
				'kv_pages'        => $this->kv_pages_enabled(),
				'generation'      => (int) get_option( self::GENERATION_OPTION, 1 ),
				'versions'        => (array) get_option( self::VERSIONS_OPTION, array() ),
				'refresh_token'   => $this->refresh_token(),
			);
		}

		/**
		 * Shared secret authorising a refresh ping to the worker.
		 *
		 * Generated once and kept in the database. Without it the worker's
		 * refresh path stays closed, so nobody can force origin fetches.
		 *
		 * @return string
		 */
		public function refresh_token() {
			$token = get_option( self::REFRESH_TOKEN_OPTION, '' );

			if ( empty( $token ) ) {
				$token = wp_generate_password( 40, false, false );
				update_option( self::REFRESH_TOKEN_OPTION, $token );
			}

			return $token;
		}

		/**
		 * Ask the worker to rebuild one page's cache entry now.
		 *
		 * The purge clears what was there; this puts the new version back
		 * without waiting for a visitor to walk into the gap. Best effort -
		 * the background refresh still covers it if this cannot get through.
		 *
		 * @param string $url Absolute URL on this site.
		 * @return bool True when the worker reported a rebuild.
		 */
		public function refresh_page( $url ) {
			if ( empty( get_option( 'td_spa_cf_route_id', '' ) ) ) {
				return false;
			}

			$response = wp_remote_get( $url, array(
				'timeout'     => 15,
				'redirection' => 0,
				'cookies'     => array(),
				'headers'     => array(
					'X-TD SPA-Refresh' => $this->refresh_token(),
				),
			) );

			if ( is_wp_error( $response ) ) {
				return false;
			}

			// The worker answers with this marker; anything else means the
			// request never reached it (local dev, worker not deployed).
			return 'REFRESHED' === wp_remote_retrieve_header( $response, 'x-td-spa-cache' );
		}

		/**
		 * Bump the version of one path so the worker treats its cached copy
		 * as stale and refreshes it in the background.
		 *
		 * This is what makes an edit visible without anyone waiting on a
		 * purge: the version travels in the config blob, and the moment the
		 * worker sees it, the next visitor gets the old copy instantly plus a
		 * background refresh.
		 *
		 * @param string $path Site path.
		 * @return int The new version.
		 */
		public function bump_page_version( $path ) {
			if ( ! $path ) {
				return 0;
			}

			$versions = (array) get_option( self::VERSIONS_OPTION, array() );

			// Re-insert at the end so the map stays in touched order and the
			// prune below drops the least recently changed pages.
			$next = isset( $versions[ $path ] ) ? (int) $versions[ $path ] + 1 : 1;
			unset( $versions[ $path ] );
			$versions[ $path ] = $next;

			if ( count( $versions ) > self::MAX_VERSION_ENTRIES ) {
				$versions = array_slice( $versions, -self::MAX_VERSION_ENTRIES, null, true );
			}

			update_option( self::VERSIONS_OPTION, $versions );

			return $next;
		}

		/**
		 * Current version of a path (0 when never edited since deploy).
		 *
		 * @param string $path Site path.
		 * @return int
		 */
		public function page_version( $path ) {
			$versions = (array) get_option( self::VERSIONS_OPTION, array() );
			return isset( $versions[ $path ] ) ? (int) $versions[ $path ] : 0;
		}

		/**
		 * Bump versions for a set of URLs at once.
		 *
		 * @param array $urls Absolute URLs.
		 * @return void
		 */
		public function bump_versions_for_urls( $urls ) {
			foreach ( (array) $urls as $url ) {
				$path = self::url_to_path( $url );
				if ( $path ) {
					$this->bump_page_version( $path );
				}
			}
		}

		/**
		 * Whether the KV second layer is usable.
		 *
		 * On automatically once a namespace exists, which deploy provisions -
		 * there is no reason to make people opt in to their own pages loading
		 * fast in regions the edge cache has not reached yet. The filter is
		 * the escape hatch for anyone who wants it off.
		 *
		 * @return bool
		 */
		public function kv_pages_enabled() {
			$enabled = ! empty( get_option( 'td_spa_cf_kv_namespace_id', '' ) );

			/**
			 * Whether to keep a globally replicated copy of pages in KV.
			 *
			 * @param bool $enabled True when a KV namespace is provisioned.
			 */
			return (bool) apply_filters( 'td_spa_cf_kv_pages', $enabled );
		}

		/**
		 * Put WooCommerce's per-customer pages into the visible exclude list.
		 *
		 * These must never be cached, but forcing them invisibly means the
		 * screen lies about what is excluded. Seeding them instead makes the
		 * state honest and removable.
		 *
		 * Runs once - tracked by its own option - so a deliberate removal is
		 * not undone on the next page load. Cart and checkout keep their path
		 * bypass regardless, because a cached checkout is a broken store.
		 *
		 * @return void
		 */
		public function seed_woocommerce_excludes() {
			if ( ! function_exists( 'wc_get_page_id' ) ) {
				return;
			}

			if ( get_option( 'td_spa_cf_seeded_wc', false ) ) {
				return;
			}

			$ids = array();
			foreach ( array( 'myaccount', 'cart', 'checkout' ) as $page ) {
				$id = (int) wc_get_page_id( $page );
				if ( $id > 0 ) {
					$ids[] = (string) $id;
				}
			}

			if ( ! empty( $ids ) ) {
				$existing = (array) get_option( 'td_spa_cf_exclude_posts', array() );
				update_option(
					'td_spa_cf_exclude_posts',
					array_values( array_unique( array_merge( $existing, $ids ) ) )
				);
			}

			update_option( 'td_spa_cf_seeded_wc', true );
		}

		/**
		 * Built-in screens that can be excluded but are not posts.
		 *
		 * Each maps to the path pattern the worker matches on. Resolved
		 * lazily because permalink structure and the posts page can change.
		 *
		 * 404s are deliberately absent: the worker only ever stores a 200, so
		 * a not-found response is never cached in the first place.
		 *
		 * @return array
		 */
		public static function special_pages() {
			$pages = array(
				'home' => array(
					'label' => __( 'Home page', 'td-spa' ),
					'path'  => self::url_to_path( home_url( '/' ) ),
				),
				'search' => array(
					'label' => __( 'Search results', 'td-spa' ),
					'path'  => '/search/*',
				),
				'author' => array(
					'label' => __( 'Author archives', 'td-spa' ),
					'path'  => '/author/*',
				),
			);

			// Blog index, when it is a separate page from the front page.
			$posts_page = (int) get_option( 'page_for_posts' );
			if ( $posts_page ) {
				$pages['blog'] = array(
					'label' => __( 'Blog / posts page', 'td-spa' ),
					'path'  => self::url_to_path( get_permalink( $posts_page ) ),
				);
			}

			// Archives for any public post type that has one (Shop, etc).
			$archive_types = get_post_types(
				array(
					'public'      => true,
					'has_archive' => true,
				),
				'objects'
			);

			foreach ( $archive_types as $type ) {
				$link = get_post_type_archive_link( $type->name );
				if ( ! $link ) {
					continue;
				}
				$pages[ 'archive_' . $type->name ] = array(
					/* translators: %s: post type label, e.g. "Products". */
					'label' => sprintf( __( '%s archive', 'td-spa' ), $type->labels->name ),
					'path'  => rtrim( self::url_to_path( $link ), '/' ) . '/*',
				);
			}

			return $pages;
		}

		/**
		 * Paths for the selected built-in screens.
		 *
		 * @return array
		 */
		public function special_exclude_paths() {
			$selected = (array) get_option( 'td_spa_cf_exclude_special', array() );
			if ( empty( $selected ) ) {
				return array();
			}

			$all   = self::special_pages();
			$paths = array();

			foreach ( $selected as $value ) {
				$key = str_replace( 'special:', '', $value );
				if ( isset( $all[ $key ] ) && $all[ $key ]['path'] ) {
					$paths[] = $all[ $key ]['path'];
				}
			}

			return $paths;
		}

		/**
		 * Paths excluded because of the post / taxonomy-term pickers.
		 *
		 * A selected term excludes its archive *and* the posts filed under it,
		 * which is what "don't cache this category" is normally taken to mean.
		 * That can expand a long way, so the total is capped - the worker
		 * matches this list per request and an unbounded list would make every
		 * request slower.
		 *
		 * @return array
		 */
		public function content_exclude_paths() {
			$paths = array();

			foreach ( (array) get_option( 'td_spa_cf_exclude_posts', array() ) as $post_id ) {
				$path = self::url_to_path( get_permalink( (int) $post_id ) );
				if ( $path ) {
					$paths[] = $path;
				}
			}

			foreach ( (array) get_option( 'td_spa_cf_exclude_terms', array() ) as $ref ) {
				$paths = array_merge( $paths, $this->term_exclude_paths( $ref ) );
				if ( count( $paths ) >= self::MAX_EXCLUDE_PATHS ) {
					break;
				}
			}

			return array_slice( $paths, 0, self::MAX_EXCLUDE_PATHS );
		}

		/**
		 * Archive path plus member-post paths for one "taxonomy:term_id" ref.
		 *
		 * @param string $ref Term reference, e.g. "category:12".
		 * @return array
		 */
		private function term_exclude_paths( $ref ) {
			$parts = explode( ':', (string) $ref );
			if ( count( $parts ) !== 2 ) {
				return array();
			}

			// Assigned one at a time: the ruleset bans both list() and its
			// short form, so destructuring is not an option here.
			$taxonomy = $parts[0];
			$term_id  = (int) $parts[1];

			$paths = array();

			$archive = get_term_link( $term_id, $taxonomy );
			if ( ! is_wp_error( $archive ) ) {
				$path = self::url_to_path( $archive );
				if ( $path ) {
					// Trailing wildcard so paged archives (/page/2) go too.
					$paths[] = rtrim( $path, '/' ) . '/*';
				}
			}

			$post_ids = get_posts( array(
				'post_type'        => 'any',
				'post_status'      => 'publish',
				'numberposts'      => self::MAX_EXCLUDE_PATHS,
				'fields'           => 'ids',
				'suppress_filters' => false,
				'tax_query'        => array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query
					array(
						'taxonomy' => $taxonomy,
						'field'    => 'term_id',
						'terms'    => $term_id,
					),
				),
			) );

			foreach ( $post_ids as $post_id ) {
				$path = self::url_to_path( get_permalink( $post_id ) );
				if ( $path ) {
					$paths[] = $path;
				}
			}

			return $paths;
		}

		/**
		 * Reduce a URL to the path the worker matches on.
		 *
		 * @param string|false|WP_Error $url URL.
		 * @return string
		 */
		public static function url_to_path( $url ) {
			if ( ! $url || is_wp_error( $url ) ) {
				return '';
			}
			$path = wp_parse_url( $url, PHP_URL_PATH );
			return $path ? $path : '';
		}

		/**
		 * Merge exclude-path sources into a clean, unique, normalized list.
		 *
		 * Pure so it can be unit tested. Full URLs are reduced to their path.
		 *
		 * @param array ...$lists Path/URL lists.
		 * @return array
		 */
		public static function merge_excludes( ...$lists ) {
			$out = array();
			foreach ( $lists as $list ) {
				foreach ( (array) $list as $entry ) {
					$entry = trim( (string) $entry );
					if ( '' === $entry ) {
						continue;
					}
					// Reduce a full URL to its path (+ trailing wildcard intact).
					if ( false !== strpos( $entry, '://' ) ) {
						$path  = wp_parse_url( $entry, PHP_URL_PATH );
						$entry = $path ? $path : $entry;
					}
					$out[ $entry ] = true;
				}
			}
			return array_keys( $out );
		}

		/**
		 * WooCommerce cart/checkout/account paths, when WooCommerce is active.
		 *
		 * @return array
		 */
		private function wc_exclude_paths() {
			if ( ! function_exists( 'wc_get_page_permalink' ) ) {
				return array();
			}

			$paths = array();
			foreach ( array( 'cart', 'checkout', 'myaccount' ) as $page ) {
				$url  = wc_get_page_permalink( $page );
				$path = $url ? wp_parse_url( $url, PHP_URL_PATH ) : '';
				if ( $path ) {
					$paths[] = $path;
				}
			}
			return $paths;
		}

		/**
		 * Rebuild the per-page exclude list from post meta and store it.
		 *
		 * @return array The list of excluded paths.
		 */
		public function rebuild_page_excludes() {
			$ids = get_posts( array(
				'post_type'      => 'any',
				'post_status'    => 'publish',
				'posts_per_page' => 500,
				'fields'         => 'ids',
				'meta_key'       => '_td_spa_cf_exclude', // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
				'meta_value'     => '1', // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_value
			) );

			$paths = array();
			foreach ( $ids as $id ) {
				$path = wp_parse_url( get_permalink( $id ), PHP_URL_PATH );
				if ( $path ) {
					$paths[] = $path;
				}
			}

			$paths = array_values( array_unique( $paths ) );
			update_option( 'td_spa_cf_page_excludes', $paths );
			return $paths;
		}

		/**
		 * Ensure a KV namespace exists, creating one on first deploy.
		 *
		 * @param string $account_id Account ID.
		 * @return string|WP_Error Namespace ID, or WP_Error on failure.
		 */
		private function ensure_kv_namespace( $account_id ) {
			$existing = get_option( 'td_spa_cf_kv_namespace_id', '' );
			if ( ! empty( $existing ) ) {
				return $existing;
			}

			$site_host = wp_parse_url( home_url(), PHP_URL_HOST );
			$result    = $this->api->create_kv_namespace( $account_id, 'td-spa-cache-' . $site_host );
			if ( is_wp_error( $result ) ) {
				return $result;
			}

			$namespace_id = isset( $result['result']['id'] ) ? $result['result']['id'] : '';
			if ( empty( $namespace_id ) ) {
				return new \WP_Error( 'cf_kv_no_id', __( 'Could not create KV namespace.', 'td-spa' ) );
			}

			update_option( 'td_spa_cf_kv_namespace_id', $namespace_id );
			return $namespace_id;
		}

		/**
		 * Write the current config to KV so the worker picks it up without a
		 * redeploy. No-op (returns false) when KV or the account is not set up.
		 *
		 * @return array|WP_Error|false
		 */
		public function sync_config() {
			$account_id   = get_option( 'td_spa_cf_account_id', '' );
			$namespace_id = get_option( 'td_spa_cf_kv_namespace_id', '' );
			if ( empty( $account_id ) || empty( $namespace_id ) ) {
				return false;
			}

			$result = $this->api->kv_put(
				$account_id,
				$namespace_id,
				self::KV_CONFIG_KEY,
				wp_json_encode( $this->build_config() )
			);

			// Only stamp the time when the edge actually took the update, so
			// "last synced" cannot claim success after a failed write.
			if ( ! is_wp_error( $result ) ) {
				update_option( self::LAST_SYNCED_OPTION, time() );
			}

			return $result;
		}

		/**
		 * KV key for one page path, under the current generation.
		 *
		 * @param string $path Site path.
		 * @return string
		 */
		public function kv_page_key( $path ) {
			return 'page:' . (int) get_option( self::GENERATION_OPTION, 1 ) . ':' . $path;
		}

		/**
		 * Fetch a URL from the origin and store its HTML in KV as the L2 copy.
		 *
		 * Called when content is published, so KV writes track edits rather
		 * than traffic. Anything that looks per-visitor (a Set-Cookie, a
		 * non-200, a non-HTML body) is skipped, matching the worker's own rule
		 * for what may be cached.
		 *
		 * @param string $url Absolute URL on this site.
		 * @return bool|WP_Error True when stored, false when deliberately skipped.
		 */
		public function push_page( $url ) {
			if ( ! $this->kv_pages_enabled() ) {
				return false;
			}

			$account_id   = get_option( 'td_spa_cf_account_id', '' );
			$namespace_id = get_option( 'td_spa_cf_kv_namespace_id', '' );
			if ( empty( $account_id ) || empty( $namespace_id ) ) {
				return false;
			}

			$path = self::url_to_path( $url );
			if ( ! $path ) {
				return false;
			}

			// Never warm a page the worker would refuse to serve from cache.
			$config = $this->build_config();
			if ( self::path_is_excluded( $path, $config['exclude_urls'] ) ) {
				return false;
			}
			foreach ( $config['bypass_patterns'] as $prefix ) {
				if ( 0 === strpos( $path, $prefix ) ) {
					return false;
				}
			}

			// Anonymous request: no cookies, and a marker so the origin can
			// tell a warm-up apart from a real visitor if it needs to.
			$response = wp_remote_get( $url, array(
				'timeout'     => 20,
				'redirection' => 0,
				'cookies'     => array(),
				'headers'     => array( 'X-TD SPA-Warm' => '1' ),
			) );

			if ( is_wp_error( $response ) ) {
				return $response;
			}

			if ( 200 !== wp_remote_retrieve_response_code( $response ) ) {
				return false;
			}
			if ( wp_remote_retrieve_header( $response, 'set-cookie' ) ) {
				return false;
			}

			$content_type = (string) wp_remote_retrieve_header( $response, 'content-type' );
			if ( false === strpos( $content_type, 'text/html' ) ) {
				return false;
			}

			$html = wp_remote_retrieve_body( $response );
			if ( '' === $html || strlen( $html ) > self::MAX_KV_PAGE_BYTES ) {
				return false;
			}

			return $this->api->kv_put(
				$account_id,
				$namespace_id,
				$this->kv_page_key( $path ),
				wp_json_encode( array(
					'html' => $html,
					'ct'   => $content_type,
					// Stored so a copy promoted from L2 into L1 carries the
					// version it was built at, rather than being assumed
					// current and never refreshing.
					'v'    => (int) $this->page_version( $path ),
				) )
			);
		}

		/**
		 * Drop one page from KV.
		 *
		 * @param string $url Absolute URL on this site.
		 * @return array|WP_Error|false
		 */
		public function delete_page( $url ) {
			$account_id   = get_option( 'td_spa_cf_account_id', '' );
			$namespace_id = get_option( 'td_spa_cf_kv_namespace_id', '' );
			$path         = self::url_to_path( $url );

			if ( empty( $account_id ) || empty( $namespace_id ) || ! $path ) {
				return false;
			}

			return $this->api->kv_delete_value(
				$account_id,
				$namespace_id,
				$this->kv_page_key( $path )
			);
		}

		/**
		 * Invalidate every L2 page at once by moving to a new key generation.
		 *
		 * Deleting keys individually would leave pages readable for up to a
		 * minute while the delete propagates; changing the key prefix takes
		 * effect as soon as the config reaches the worker. The orphaned keys
		 * age out on their own.
		 *
		 * @return int The new generation.
		 */
		public function bump_generation() {
			$next = (int) get_option( self::GENERATION_OPTION, 1 ) + 1;
			update_option( self::GENERATION_OPTION, $next );
			$this->sync_config();
			return $next;
		}

		/**
		 * Whether a path matches an exclude entry (mirrors the worker).
		 *
		 * @param string $path Path to test.
		 * @param array  $list Exclude entries.
		 * @return bool
		 */
		public static function path_is_excluded( $path, $list ) {
			foreach ( (array) $list as $entry ) {
				if ( '' === $entry ) {
					continue;
				}
				if ( '*' === substr( $entry, -1 ) ) {
					if ( 0 === strpos( $path, substr( $entry, 0, -1 ) ) ) {
						return true;
					}
				} elseif ( $path === $entry ) {
					return true;
				}
			}
			return false;
		}

		/**
		 * Flip the instant kill switch (pause/resume caching) and push it to
		 * the edge via KV. Falls back to a redeploy-free config write.
		 *
		 * @param bool $on True to pause caching.
		 * @return array|WP_Error|false
		 */
		public function set_kill( $on ) {
			update_option( 'td_spa_cf_kill', (bool) $on );
			return $this->sync_config();
		}

		/**
		 * Check if site domain matches a zone.
		 *
		 * @param string $site_host Site hostname.
		 * @param string $zone_name Zone name.
		 * @return bool
		 */
		private function domain_matches_zone( $site_host, $zone_name ) {
			if ( $site_host === $zone_name ) {
				return true;
			}
			if ( substr( $site_host, -strlen( '.' . $zone_name ) ) === '.' . $zone_name ) {
				return true;
			}
			return false;
		}

		/**
		 * Save deployment information.
		 *
		 * @param array  $zone       Zone info.
		 * @param string $route_id   Route ID.
		 * @param string $pattern    Route pattern.
		 * @param string $account_id Account ID.
		 */
		private function save_deployment_info( $zone, $route_id, $pattern, $account_id ) {
			update_option( 'td_spa_cf_cache_enabled', true );
			update_option( 'td_spa_cf_zone_id', $zone['id'] );
			update_option( 'td_spa_cf_zone_name', $zone['name'] );
			update_option( 'td_spa_cf_route_id', $route_id );
			update_option( 'td_spa_cf_route_pattern', $pattern );
			update_option( 'td_spa_cf_account_id', $account_id );
		}

		/**
		 * Remove worker and route (teardown).
		 *
		 * @return array|WP_Error
		 */
		public function teardown() {
			$zone_id    = get_option( 'td_spa_cf_zone_id', '' );
			$route_id   = get_option( 'td_spa_cf_route_id', '' );
			$account_id = get_option( 'td_spa_cf_account_id', '' );

			$errors = array();

			// Delete route.
			if ( $zone_id && $route_id ) {
				$route_result = $this->api->delete_route( $zone_id, $route_id );
				if ( is_wp_error( $route_result ) ) {
					$errors[] = $route_result->get_error_message();
				}
			}

			// Delete worker.
			if ( $account_id ) {
				$worker_result = $this->api->delete_worker( $account_id, self::WORKER_NAME );
				if ( is_wp_error( $worker_result ) ) {
					$errors[] = $worker_result->get_error_message();
				}
			}

			// Delete the KV namespace we created.
			$namespace_id = get_option( 'td_spa_cf_kv_namespace_id', '' );
			if ( $account_id && $namespace_id ) {
				$kv_result = $this->api->delete_kv_namespace( $account_id, $namespace_id );
				if ( is_wp_error( $kv_result ) ) {
					$errors[] = $kv_result->get_error_message();
				}
			}

			// Clear stored settings.
			$this->clear_settings();

			if ( ! empty( $errors ) ) {
				return new \WP_Error(
					'teardown_partial',
					implode( ' ', $errors )
				);
			}

			return array(
				'success' => true,
				'message' => __( 'Cloudflare cache disconnected successfully.', 'td-spa' ),
			);
		}

		/**
		 * Clear all CF settings.
		 */
		private function clear_settings() {
			delete_option( 'td_spa_cf_cache_enabled' );
			delete_option( 'td_spa_cf_zone_id' );
			delete_option( 'td_spa_cf_zone_name' );
			delete_option( 'td_spa_cf_route_id' );
			delete_option( 'td_spa_cf_route_pattern' );
			delete_option( 'td_spa_cf_account_id' );
			delete_option( 'td_spa_cf_kv_namespace_id' );
			delete_option( 'td_spa_cf_kill' );
			delete_option( self::WORKER_VERSION_OPTION );
			delete_option( self::WORKER_HASH_OPTION );
			delete_option( self::REDEPLOY_ATTEMPTS_OPTION );
			delete_option( self::REDEPLOY_FAILED_OPTION );
			delete_option( self::WARM_QUEUE_OPTION );
			delete_option( self::WARM_CURSOR_OPTION );
			delete_option( self::WARM_BUDGET_OPTION );
			delete_option( self::WARM_DONE_OPTION );
			delete_transient( self::REDEPLOY_LOCK );

			// Queued work would otherwise fire at a site that has just
			// disconnected: a redeploy would put the Worker back, and a warm
			// run would write pages into a namespace that is being deleted.
			foreach ( array( self::REDEPLOY_EVENT, self::WARM_EVENT ) as $event ) {
				$queued = wp_next_scheduled( $event );
				if ( $queued ) {
					wp_unschedule_event( $queued, $event );
				}
			}
		}

		/**
		 * Purge specific URLs.
		 *
		 * @param array $urls URLs to purge.
		 * @return array|WP_Error
		 */
		public function purge_urls( $urls ) {
			$zone_id = get_option( 'td_spa_cf_zone_id', '' );

			if ( empty( $zone_id ) ) {
				return new \WP_Error( 'not_configured', __( 'Cloudflare cache is not configured.', 'td-spa' ) );
			}

			if ( empty( $urls ) ) {
				return new \WP_Error( 'no_urls', __( 'No URLs provided to purge.', 'td-spa' ) );
			}

			// Batch URLs (max 30 per request).
			$batches = array_chunk( $urls, 30 );
			$results = array();

			foreach ( $batches as $batch ) {
				$result = $this->api->purge_urls( $zone_id, $batch );
				if ( is_wp_error( $result ) ) {
					return $result;
				}
				$results[] = $result;
			}

			return array(
				'success' => true,
				'purged'  => count( $urls ),
				'message' => sprintf(
					// translators: %d: number of URLs purged.
					__( 'Purged %d URL(s) from cache.', 'td-spa' ),
					count( $urls )
				),
			);
		}

		/**
		 * Purge all cache.
		 *
		 * @return array|WP_Error
		 */
		public function purge_all() {
			$zone_id = get_option( 'td_spa_cf_zone_id', '' );

			if ( empty( $zone_id ) ) {
				return new \WP_Error( 'not_configured', __( 'Cloudflare cache is not configured.', 'td-spa' ) );
			}

			$result = $this->api->purge_all( $zone_id );

			if ( is_wp_error( $result ) ) {
				return $result;
			}

			// L1 is now empty, so per-page versions have nothing left to
			// compare against and would only bloat the config blob.
			delete_option( self::VERSIONS_OPTION );

			// Move L2 to a fresh generation so stale pages cannot be served
			// from KV behind the emptied L1. bump_generation() re-syncs
			// config; otherwise do it here so the cleared versions travel.
			if ( $this->kv_pages_enabled() ) {
				$this->bump_generation();
			} else {
				$this->sync_config();
			}

			return array(
				'success' => true,
				'message' => __( 'Entire cache purged successfully.', 'td-spa' ),
			);
		}

		/**
		 * Get URLs related to a post for purging.
		 *
		 * @param int $post_id Post ID.
		 * @return array URLs to purge.
		 */
		public function get_post_urls( $post_id ) {
			$urls = array();

			// Post permalink.
			$permalink = get_permalink( $post_id );
			if ( $permalink ) {
				$urls[] = $permalink;
			}

			// Home page.
			$urls[] = home_url( '/' );

			// Post type archive.
			$post_type = get_post_type( $post_id );
			if ( $post_type && 'page' !== $post_type ) {
				$archive = get_post_type_archive_link( $post_type );
				if ( $archive ) {
					$urls[] = $archive;
				}
			}

			// Categories.
			$categories = get_the_category( $post_id );
			if ( $categories ) {
				foreach ( $categories as $category ) {
					$urls[] = get_category_link( $category->term_id );
				}
			}

			// Tags.
			$tags = get_the_tags( $post_id );
			if ( $tags ) {
				foreach ( $tags as $tag ) {
					$urls[] = get_tag_link( $tag->term_id );
				}
			}

			// Author archive.
			$author_id = get_post_field( 'post_author', $post_id );
			if ( $author_id ) {
				$urls[] = get_author_posts_url( $author_id );
			}

			// Apply filter for custom URLs.
			$urls = apply_filters( 'td_spa_cf_purge_post_urls', array_unique( $urls ), $post_id );

			return $urls;
		}

		/**
		 * Static helper to purge cache.
		 *
		 * Usage:
		 *   \TDSPA\Cloudflare\Cache::purge( 'https://example.com/page' );
		 *   \TDSPA\Cloudflare\Cache::purge( [ 'https://example.com/page1', 'https://example.com/page2' ] );
		 *   \TDSPA\Cloudflare\Cache::purge(); // Purge all
		 *
		 * @param string|array|null $urls URL(s) to purge, or null to purge all.
		 * @return array|WP_Error
		 */
		public static function purge( $urls = null ) {
			$cache = new self();

			if ( null === $urls ) {
				return $cache->purge_all();
			}

			if ( is_string( $urls ) ) {
				$urls = array( $urls );
			}

			return $cache->purge_urls( $urls );
		}
	}
}

/**
 * Global helper function to purge TD SPA cache.
 *
 * Usage:
 *   td_spa_purge_cache( 'https://example.com/page' );
 *   td_spa_purge_cache( [ 'url1', 'url2' ] );
 *   td_spa_purge_cache(); // Purge all
 *
 * @param string|array|null $urls URL(s) to purge, or null to purge all.
 * @return array|WP_Error
 */
function td_spa_purge_cache( $urls = null ) {
	return \TDSPA\Cloudflare\Cache::purge( $urls );
}
