<?php
/**
 * Cloudflare Auto-Purge Hooks.
 *
 * @package TD SPA
 * @since 2.4.0
 */

namespace TDSPA\Cloudflare;

defined( 'ABSPATH' ) || die();

if ( ! class_exists( __NAMESPACE__ . '\Hooks' ) ) {

	/**
	 * Cloudflare Auto-Purge Hooks.
	 */
	class Hooks extends \TDSPA\Base {

		/**
		 * Pending URLs to purge (debounce).
		 *
		 * @var array
		 */
		private static $pending_urls = array();

		/**
		 * Whether a KV config re-sync is already queued this request.
		 *
		 * @var bool
		 */
		private static $config_resync_queued = false;

		/**
		 * How long to wait after each failure, in seconds.
		 *
		 * Spread wide on purpose. A Cloudflare outage or a revoked token is
		 * not going to resolve in thirty seconds, and hammering the API from
		 * every site running this plugin would be its own problem. The length
		 * of this list is also the attempt cap.
		 */
		const REDEPLOY_BACKOFF = array( 300, 1800, 7200 );

		/**
		 * Register actions.
		 */
		public function actions() {
			// Admin bar (always if CF is connected).
			if ( $this->is_connected() ) {
				add_action( 'admin_bar_menu', array( $this, 'admin_bar_menu' ), 100 );
				add_action( 'wp_footer', array( $this, 'admin_bar_script' ), 100 );
				add_action( 'admin_footer', array( $this, 'admin_bar_script' ), 100 );
			}

			// Per-page "don't cache" control - editor UI + meta, always
			// available so pages can be marked before/without a connection.
			add_action( 'init', array( $this, 'register_exclude_meta' ) );
			add_action( 'add_meta_boxes', array( $this, 'add_exclude_metabox' ) );
			add_action( 'save_post', array( $this, 'save_exclude_metabox' ), 10, 1 );
			add_action( 'enqueue_block_editor_assets', array( $this, 'enqueue_editor_assets' ) );

			// Rebuild + sync the exclude list whenever the meta changes
			// (covers both the classic metabox and the Gutenberg panel).
			add_action( 'added_post_meta', array( $this, 'on_exclude_meta_change' ), 10, 3 );
			add_action( 'updated_post_meta', array( $this, 'on_exclude_meta_change' ), 10, 3 );
			add_action( 'deleted_post_meta', array( $this, 'on_exclude_meta_change' ), 10, 3 );

			// Re-push config to KV when a cache config option is saved.
			add_action( 'updated_option', array( $this, 'on_cf_config_option' ), 10, 1 );

			// Keep the deployed edge Worker in step with the plugin. Both
			// paths matter: the upgrade covers a plugin update, admin_init
			// covers a template edit that never came with one, and a site
			// where an earlier redeploy failed and is still behind.
			add_action( 'td_spa_upgraded', array( $this, 'maybe_schedule_worker_redeploy' ) );
			add_action( 'admin_init', array( $this, 'maybe_schedule_worker_redeploy' ) );
			add_action( Cache::REDEPLOY_EVENT, array( $this, 'run_worker_redeploy' ) );
			add_action( Cache::WARM_EVENT, array( $this, 'run_warm_batch' ) );

			if ( ! $this->should_auto_purge() ) {
				return;
			}

			// Post hooks.
			add_action( 'save_post', array( $this, 'on_post_save' ), 20, 2 );
			add_action( 'delete_post', array( $this, 'on_post_delete' ), 20 );
			add_action( 'trashed_post', array( $this, 'on_post_delete' ), 20 );
			add_action( 'transition_post_status', array( $this, 'on_status_change' ), 20, 3 );

			// Term hooks.
			add_action( 'edited_term', array( $this, 'on_term_edit' ), 20, 3 );
			add_action( 'delete_term', array( $this, 'on_term_delete' ), 20, 4 );

			// Comment hooks.
			add_action( 'comment_post', array( $this, 'on_comment' ), 20, 2 );
			add_action( 'edit_comment', array( $this, 'on_comment_edit' ), 20 );
			add_action( 'transition_comment_status', array( $this, 'on_comment_status' ), 20, 3 );

			// Process pending purges on shutdown.
			add_action( 'shutdown', array( $this, 'process_pending_purges' ) );
		}

		/**
		 * Check if CF is connected.
		 *
		 * @return bool
		 */
		private function is_connected() {
			return (bool) get_option( 'td_spa_cf_cache_enabled', false );
		}

		/**
		 * Queue a background Worker redeploy when the deployed one is behind.
		 *
		 * Deliberately does no work itself. Uploading a Worker means several
		 * Cloudflare round trips, and doing that inside the request that
		 * finished a plugin update is how an update ends on a white screen.
		 * The 30 second delay also lets a multi-plugin update settle before
		 * anything reaches out over the network.
		 *
		 * Safe to call repeatedly: an already-queued event blocks a second
		 * one, and the handler no-ops once the versions line up again.
		 *
		 * @return void
		 */
		public function maybe_schedule_worker_redeploy() {
			if ( ! Cache::needs_worker_redeploy() ) {
				return;
			}

			if ( wp_next_scheduled( Cache::REDEPLOY_EVENT ) ) {
				return;
			}

			// Retries are spent. Re-queueing here would restart the backoff
			// from the top on the next admin page load and leave the site
			// calling a failing API forever. It waits for the manual button.
			if ( get_option( Cache::REDEPLOY_FAILED_OPTION, false ) ) {
				return;
			}

			wp_schedule_single_event( time() + 30, Cache::REDEPLOY_EVENT );
		}

		/**
		 * Upload the current Worker. Runs from WP-Cron, never from a request
		 * a person is waiting on.
		 *
		 * @return void
		 */
		public function run_worker_redeploy() {
			// Cron can overlap, and two simultaneous uploads of the same
			// script is at best wasted API calls. The TTL is the ceiling on
			// how long one attempt can hold the lock if it dies mid-flight.
			if ( get_transient( Cache::REDEPLOY_LOCK ) ) {
				return;
			}
			set_transient( Cache::REDEPLOY_LOCK, time(), 5 * MINUTE_IN_SECONDS );

			// Something else may have deployed since this was queued, in which
			// case there is nothing left to do. This is also what makes a
			// second run a no-op.
			if ( ! Cache::needs_worker_redeploy() ) {
				$this->clear_redeploy_state();
				delete_transient( Cache::REDEPLOY_LOCK );
				return;
			}

			$result = $this->cache()->redeploy_worker();

			if ( ! is_wp_error( $result ) ) {
				$this->clear_redeploy_state();
				delete_transient( Cache::REDEPLOY_LOCK );
				return;
			}

			$this->schedule_redeploy_retry( $result );
			delete_transient( Cache::REDEPLOY_LOCK );
		}

		/**
		 * Warm the next batch of pages into L2.
		 *
		 * @return void
		 */
		public function run_warm_batch() {
			$this->cache()->warm_next_batch();
		}

		/**
		 * The cache manager this handler drives.
		 *
		 * Its own method purely so tests can hand in a stand-in rather than
		 * letting a unit test reach Cloudflare.
		 *
		 * @return Cache
		 */
		protected function cache() {
			return new Cache();
		}

		/**
		 * Back off after a failed attempt, or give up and record why.
		 *
		 * @param \WP_Error $error What went wrong.
		 * @return void
		 */
		private function schedule_redeploy_retry( $error ) {
			$attempt = (int) get_option( Cache::REDEPLOY_ATTEMPTS_OPTION, 0 ) + 1;
			update_option( Cache::REDEPLOY_ATTEMPTS_OPTION, $attempt );

			$backoff = self::REDEPLOY_BACKOFF;

			// Attempt 1 has just failed, so the delay for the next one is the
			// first entry. Running past the end of the list means done trying.
			if ( $attempt > count( $backoff ) ) {
				update_option(
					Cache::REDEPLOY_FAILED_OPTION,
					array(
						'code'     => $error->get_error_code(),
						'message'  => $error->get_error_message(),
						'attempts' => $attempt,
						'time'     => time(),
					)
				);
				return;
			}

			wp_schedule_single_event( time() + $backoff[ $attempt - 1 ], Cache::REDEPLOY_EVENT );
		}

		/**
		 * Forget the retry counter and any recorded failure.
		 *
		 * @return void
		 */
		private function clear_redeploy_state() {
			delete_option( Cache::REDEPLOY_ATTEMPTS_OPTION );
			delete_option( Cache::REDEPLOY_FAILED_OPTION );
		}

		/**
		 * Add admin bar menu.
		 *
		 * @param WP_Admin_Bar $wp_admin_bar Admin bar instance.
		 */
		public function admin_bar_menu( $wp_admin_bar ) {
			if ( ! current_user_can( 'manage_options' ) ) {
				return;
			}

			// Parent menu (icon only).
			$wp_admin_bar->add_node(
				array(
					'id'    => 'td-spa-cache',
					'title' => '<span class="ab-icon dashicons dashicons-cloud" style="font-family:dashicons;font-size:20px;"></span>',
					'href'  => '#',
					'meta'  => array(
						'title' => 'TD SPA Cache',
					),
				)
			);

			// Purge current URL.
			$current_url = is_admin() ? home_url( '/' ) : $this->get_current_url();
			$wp_admin_bar->add_node(
				array(
					'id'     => 'td-spa-purge-url',
					'parent' => 'td-spa-cache',
					'title'  => 'Purge This Page',
					'href'   => '#',
					'meta'   => array(
						'onclick' => 'return tdSpaPurge("url", "' . esc_js( $current_url ) . '");',
					),
				)
			);

			// Purge all.
			$wp_admin_bar->add_node(
				array(
					'id'     => 'td-spa-purge-all',
					'parent' => 'td-spa-cache',
					'title'  => 'Purge Everything',
					'href'   => '#',
					'meta'   => array(
						'onclick' => 'return tdSpaPurge("all");',
					),
				)
			);
		}

		/**
		 * Admin bar inline script for AJAX purge.
		 */
		public function admin_bar_script() {
			if ( ! current_user_can( 'manage_options' ) || ! is_admin_bar_showing() ) {
				return;
			}
			?>
			<script>
			function tdSpaPurge(type, url) {
				var icon = document.querySelector('#wp-admin-bar-td-spa-cache .ab-icon');
				if (icon) icon.style.opacity = '0.5';

				var endpoint = '<?php echo esc_url( rest_url( 'td-spa/cf/' ) ); ?>';
				var nonce = '<?php echo esc_js( wp_create_nonce( 'wp_rest' ) ); ?>';

				var fetchUrl = type === 'all' ? endpoint + 'purge-all' : endpoint + 'purge';
				var body = type === 'all' ? {} : { urls: [url] };

				fetch(fetchUrl, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'X-WP-Nonce': nonce
					},
					body: JSON.stringify(body)
				})
				.then(function(res) { return res.json(); })
				.then(function(data) {
					if (icon) icon.style.opacity = '1';
					if (data.success) {
						// If inside iframe, use TD SPA navigation (background swap)
						if (window.self !== window.top) {
							window.parent.postMessage({
								type: 'TD_SPA_NAVIGATE',
								url: window.location.href
							}, window.location.origin);
						} else {
							// Not in iframe, regular reload
							location.reload();
						}
					}
				})
				.catch(function() {
					if (icon) icon.style.opacity = '1';
				});

				return false;
			}
			</script>
			<?php
		}

		/**
		 * Get current frontend URL.
		 *
		 * @return string
		 */
		private function get_current_url() {
			$protocol = is_ssl() ? 'https://' : 'http://';
			$host = isset( $_SERVER['HTTP_HOST'] ) ? sanitize_text_field( wp_unslash( $_SERVER['HTTP_HOST'] ) ) : '';
			$uri  = isset( $_SERVER['REQUEST_URI'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REQUEST_URI'] ) ) : '';
			return $protocol . $host . $uri;
		}

		/**
		 * Check if auto-purge is enabled.
		 *
		 * @return bool
		 */
		private function should_auto_purge() {
			$enabled = (bool) get_option( 'td_spa_cf_cache_enabled', false );

			/**
			 * Whether edits refresh the cache.
			 *
			 * Always on: a cache that serves what you just replaced is a bug,
			 * not a preference. The filter exists for the rare site that
			 * drives purging itself.
			 *
			 * @param bool $enabled True when the cache is deployed.
			 */
			return (bool) apply_filters( 'td_spa_cf_auto_purge', $enabled );
		}

		/**
		 * Handle post save.
		 *
		 * @param int     $post_id Post ID.
		 * @param WP_Post $post    Post object.
		 */
		public function on_post_save( $post_id, $post ) {
			// Skip autosaves and revisions.
			if ( wp_is_post_autosave( $post_id ) || wp_is_post_revision( $post_id ) ) {
				return;
			}

			// Only purge published posts.
			if ( 'publish' !== $post->post_status ) {
				return;
			}

			$this->queue_post_purge( $post_id );
		}

		/**
		 * Handle post deletion.
		 *
		 * @param int $post_id Post ID.
		 */
		public function on_post_delete( $post_id ) {
			$this->queue_post_purge( $post_id );
		}

		/**
		 * Handle post status transition.
		 *
		 * @param string  $new_status New status.
		 * @param string  $old_status Old status.
		 * @param WP_Post $post       Post object.
		 */
		public function on_status_change( $new_status, $old_status, $post ) {
			// Purge when publishing or unpublishing.
			if ( 'publish' === $new_status || 'publish' === $old_status ) {
				$this->queue_post_purge( $post->ID );
			}
		}

		/**
		 * Queue URLs for a post.
		 *
		 * @param int $post_id Post ID.
		 */
		private function queue_post_purge( $post_id ) {
			$cache = new Cache();
			$urls  = $cache->get_post_urls( $post_id );

			foreach ( $urls as $url ) {
				self::$pending_urls[ $url ] = true;
			}
		}

		/**
		 * Handle term edit.
		 *
		 * @param int    $term_id  Term ID.
		 * @param int    $tt_id    Term taxonomy ID.
		 * @param string $taxonomy Taxonomy slug.
		 */
		public function on_term_edit( $term_id, $tt_id, $taxonomy ) {
			$this->queue_term_purge( $term_id, $taxonomy );
		}

		/**
		 * Handle term deletion.
		 *
		 * @param int    $term_id      Term ID.
		 * @param int    $tt_id        Term taxonomy ID.
		 * @param string $taxonomy     Taxonomy slug.
		 * @param mixed  $deleted_term Deleted term object.
		 */
		public function on_term_delete( $term_id, $tt_id, $taxonomy, $deleted_term ) {
			// Home page.
			self::$pending_urls[ home_url( '/' ) ] = true;
		}

		/**
		 * Queue URLs for a term.
		 *
		 * @param int    $term_id  Term ID.
		 * @param string $taxonomy Taxonomy slug.
		 */
		private function queue_term_purge( $term_id, $taxonomy ) {
			$term_link = get_term_link( $term_id, $taxonomy );
			if ( ! is_wp_error( $term_link ) ) {
				self::$pending_urls[ $term_link ] = true;
			}

			// Home page.
			self::$pending_urls[ home_url( '/' ) ] = true;
		}

		/**
		 * Handle new comment.
		 *
		 * @param int        $comment_id       Comment ID.
		 * @param int|string $comment_approved Approval status.
		 */
		public function on_comment( $comment_id, $comment_approved ) {
			if ( 1 === $comment_approved ) {
				$comment = get_comment( $comment_id );
				if ( $comment ) {
					$this->queue_post_purge( $comment->comment_post_ID );
				}
			}
		}

		/**
		 * Handle comment edit.
		 *
		 * @param int $comment_id Comment ID.
		 */
		public function on_comment_edit( $comment_id ) {
			$comment = get_comment( $comment_id );
			if ( $comment && '1' === $comment->comment_approved ) {
				$this->queue_post_purge( $comment->comment_post_ID );
			}
		}

		/**
		 * Handle comment status transition.
		 *
		 * @param string     $new_status New status.
		 * @param string     $old_status Old status.
		 * @param WP_Comment $comment    Comment object.
		 */
		public function on_comment_status( $new_status, $old_status, $comment ) {
			if ( 'approved' === $new_status || 'approved' === $old_status ) {
				$this->queue_post_purge( $comment->comment_post_ID );
			}
		}

		/**
		 * Process pending purges on shutdown.
		 */
		public function process_pending_purges() {
			if ( empty( self::$pending_urls ) ) {
				return;
			}

			$urls  = array_keys( self::$pending_urls );
			$cache = new Cache();

			// If too many URLs, purge everything instead.
			if ( count( $urls ) > 25 ) {
				$cache->purge_all();
				self::$pending_urls = array();
				return;
			}

			// Order matters.
			//
			// 1. Bump versions, so any copy anywhere is already marked stale.
			//    A colo still holding one serves it instantly and refreshes
			//    behind the visitor rather than making them wait.
			$cache->bump_versions_for_urls( $urls );

			// 2. Push the new versions to the edge before asking the worker to
			//    rebuild, or it would re-store pages under the old version and
			//    look fresh while being stale.
			$cache->sync_config();

			// 3. Purge, which empties the edge cache globally.
			$cache->purge_urls( $urls );

			// Refresh the L2 copy of each purged page. Doing it here rather
			// than on every visitor miss is what keeps KV writes tied to
			// editing instead of traffic. A page that can no longer be warmed
			// - deleted, unpublished, newly excluded - must have its old copy
			// removed, or KV would keep serving it after it stopped existing.
			if ( $cache->kv_pages_enabled() ) {
				foreach ( $urls as $url ) {
					$stored = $cache->push_page( $url );
					if ( true !== $stored && ! is_array( $stored ) ) {
						$cache->delete_page( $url );
					}
				}
			}

			// 4. Ask the worker to rebuild each entry now, so the cache is
			//    warm again immediately instead of waiting for someone to
			//    walk into the gap the purge just made.
			foreach ( $urls as $url ) {
				$cache->refresh_page( $url );
			}

			self::$pending_urls = array();
		}

		/**
		 * Re-sync KV once per request when a cache config option is saved.
		 *
		 * The settings form writes each key separately; debounce to a single
		 * sync on shutdown so one save is one KV write.
		 *
		 * @param string $option Option name.
		 */
		public function on_cf_config_option( $option ) {
			static $config_keys = array(
				'td_spa_cf_bypass_patterns',
				'td_spa_cf_bypass_cookies',
				'td_spa_cf_exclude_urls',
				'td_spa_cf_edge_ttl',
				'td_spa_cf_exclude_posts',
				'td_spa_cf_exclude_terms',
				'td_spa_cf_exclude_special',
				'td_spa_cf_kv_pages',
			);
			if ( ! in_array( $option, $config_keys, true ) ) {
				return;
			}
			if ( self::$config_resync_queued || ! $this->is_connected() ) {
				return;
			}
			self::$config_resync_queued = true;
			add_action( 'shutdown', function () {
				( new Cache() )->sync_config();
			}, 5 );
		}

		/**
		 * Register the per-page "don't cache" meta (REST-exposed for Gutenberg).
		 */
		public function register_exclude_meta() {
			foreach ( array( 'post', 'page' ) as $post_type ) {
				register_post_meta( $post_type, '_td_spa_cf_exclude', array(
					'show_in_rest'  => true,
					'single'        => true,
					'type'          => 'boolean',
					'default'       => false,
					'auth_callback' => function () {
						return current_user_can( 'edit_posts' );
					},
				) );
			}
		}

		/**
		 * Add the classic-editor metabox.
		 */
		public function add_exclude_metabox() {
			foreach ( array( 'post', 'page' ) as $post_type ) {
				add_meta_box(
					'td-spa-cf-exclude',
					__( 'TD SPA Cache', 'td-spa' ),
					array( $this, 'render_exclude_metabox' ),
					$post_type,
					'side',
					'default'
				);
			}
		}

		/**
		 * Render the classic metabox checkbox.
		 *
		 * @param \WP_Post $post Post being edited.
		 */
		public function render_exclude_metabox( $post ) {
			wp_nonce_field( 'td_spa_cf_exclude', 'td_spa_cf_exclude_nonce' );
			$excluded = '1' === get_post_meta( $post->ID, '_td_spa_cf_exclude', true );
			?>
			<label>
				<input type="checkbox" name="td_spa_cf_exclude" value="1" <?php checked( $excluded ); ?> />
				<?php esc_html_e( "Don't cache this page", 'td-spa' ); ?>
			</label>
			<p class="description"><?php esc_html_e( 'Always serve this page fresh from your site.', 'td-spa' ); ?></p>
			<?php
		}

		/**
		 * Save the classic metabox. Guarded by its nonce so it never runs for
		 * Gutenberg REST saves (which persist the meta directly).
		 *
		 * @param int $post_id Post ID.
		 */
		public function save_exclude_metabox( $post_id ) {
			if ( ! isset( $_POST['td_spa_cf_exclude_nonce'] ) ) {
				return;
			}
			if ( ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['td_spa_cf_exclude_nonce'] ) ), 'td_spa_cf_exclude' ) ) {
				return;
			}
			if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
				return;
			}
			if ( ! current_user_can( 'edit_post', $post_id ) ) {
				return;
			}

			if ( ! empty( $_POST['td_spa_cf_exclude'] ) ) {
				update_post_meta( $post_id, '_td_spa_cf_exclude', '1' );
			} else {
				delete_post_meta( $post_id, '_td_spa_cf_exclude' );
			}
		}

		/**
		 * Enqueue the Gutenberg exclude panel.
		 */
		public function enqueue_editor_assets() {
			wp_enqueue_script(
				'td-spa-cache-editor',
				TD_SPA_URL . 'assets/js/cache-editor.js',
				array( 'wp-plugins', 'wp-editor', 'wp-components', 'wp-data', 'wp-element', 'wp-core-data', 'wp-i18n' ),
				TD_SPA_VERSION,
				true
			);
		}

		/**
		 * When the exclude meta changes (either editor), rebuild the list,
		 * push it to the edge via KV, and purge the affected page.
		 *
		 * Registered on added/updated/deleted_post_meta, which share the
		 * (meta_id, object_id, meta_key) argument positions.
		 *
		 * @param int|array $meta_id  Meta id(s) (unused).
		 * @param int       $post_id  Post ID.
		 * @param string    $meta_key Meta key.
		 */
		public function on_exclude_meta_change( $meta_id, $post_id, $meta_key ) {
			if ( '_td_spa_cf_exclude' !== $meta_key ) {
				return;
			}

			$cache = new Cache();
			$cache->rebuild_page_excludes();

			if ( ! $this->is_connected() ) {
				return;
			}

			$cache->sync_config();
			$url = get_permalink( $post_id );
			if ( $url ) {
				$cache->purge_urls( array( $url ) );
			}
		}
	}

	Hooks::start();
}
