<?php

/**
 * Admin REST API for TD SPA.
 *
 * @package TD SPA
 * @since 2.0.0
 */
// Namespace.
namespace TDSPA\Admin;

// Exit if access directly.
defined('ABSPATH') || die('Uhu, we don\'t do this here');

if ( ! class_exists(__NAMESPACE__ . '\REST') ) {
	/**
	 * Admin REST API for TD SPA.
	 */
	class REST extends \TDSPA\Base {


		/**
		 * Actions
		 */
		public function actions() {
			add_action('rest_api_init', array( $this, 'register_rest_endpoints' ));
		}

		/**
		 * Register REST Endpoints.
		 *
		 * @return void
		 */
		public function register_rest_endpoints() {

			// Save settings.
			register_rest_route('td-spa', 'settings', array(
				'methods' => array( 'POST' ),
				'permission_callback' => array( $this, 'permission_callback' ),
				'callback' => array( $this, 'save_settings' ),
			));



			// Deactivate feedback.
			register_rest_route('td-spa', 'deactivate-feedback', array(
				'methods' => array( 'POST' ),
				'permission_callback' => array( $this, 'permission_callback' ),
				'callback' => array( $this, 'save_deactivate_feedback' ),
			));

			// Save diagnostic permission.
			register_rest_route('td-spa', 'diagnostic-permission', array(
				'methods' => array( 'POST' ),
				'permission_callback' => array( $this, 'permission_callback' ),
				'callback' => array( $this, 'save_diagnostic_permission' ),
			));

			// Tour state.
			register_rest_route('td-spa', 'tour', array(
				'methods' => array( 'GET', 'POST' ),
				'permission_callback' => array( $this, 'permission_callback' ),
				'callback' => array( $this, 'handle_tour_state' ),
			));

			// Cloudflare: Verify token.
			register_rest_route('td-spa', 'cf/verify-token', array(
				'methods' => array( 'POST' ),
				'permission_callback' => array( $this, 'permission_callback' ),
				'callback' => array( $this, 'cf_verify_token' ),
			));

			// Cloudflare: List zones.
			register_rest_route('td-spa', 'cf/zones', array(
				'methods' => array( 'GET' ),
				'permission_callback' => array( $this, 'permission_callback' ),
				'callback' => array( $this, 'cf_list_zones' ),
			));

			// Cloudflare: Deploy.
			register_rest_route('td-spa', 'cf/deploy', array(
				'methods' => array( 'POST' ),
				'permission_callback' => array( $this, 'permission_callback' ),
				'callback' => array( $this, 'cf_deploy' ),
			));

			// Cloudflare: OAuth start (returns the relay URL to redirect to).
			register_rest_route('td-spa', 'cf/oauth-start', array(
				'methods' => array( 'POST' ),
				'permission_callback' => array( $this, 'permission_callback' ),
				'callback' => array( $this, 'cf_oauth_start' ),
			));

			// Cloudflare: OAuth exchange (code handed back by the relay).
			register_rest_route('td-spa', 'cf/oauth-exchange', array(
				'methods' => array( 'POST' ),
				'permission_callback' => array( $this, 'permission_callback' ),
				'callback' => array( $this, 'cf_oauth_exchange' ),
			));

			// Cloudflare: Search posts / taxonomy terms for the exclude pickers.
			register_rest_route('td-spa', 'cf/content-search', array(
				'methods' => array( 'GET' ),
				'permission_callback' => array( $this, 'permission_callback' ),
				'callback' => array( $this, 'cf_content_search' ),
			));

			// Cloudflare: Unlink the account without tearing down a deployment.
			register_rest_route('td-spa', 'cf/disconnect', array(
				'methods' => array( 'POST' ),
				'permission_callback' => array( $this, 'permission_callback' ),
				'callback' => array( $this, 'cf_disconnect' ),
			));

			// Cloudflare: Status.
			register_rest_route('td-spa', 'cf/status', array(
				'methods' => array( 'GET' ),
				'permission_callback' => array( $this, 'permission_callback' ),
				'callback' => array( $this, 'cf_status' ),
			));

			// Cloudflare: Teardown.
			register_rest_route('td-spa', 'cf/teardown', array(
				'methods' => array( 'POST' ),
				'permission_callback' => array( $this, 'permission_callback' ),
				'callback' => array( $this, 'cf_teardown' ),
			));

			// Cloudflare: Purge URLs.
			register_rest_route('td-spa', 'cf/purge', array(
				'methods' => array( 'POST' ),
				'permission_callback' => array( $this, 'permission_callback' ),
				'callback' => array( $this, 'cf_purge' ),
			));

			// Cloudflare: Purge all.
			register_rest_route('td-spa', 'cf/purge-all', array(
				'methods' => array( 'POST' ),
				'permission_callback' => array( $this, 'permission_callback' ),
				'callback' => array( $this, 'cf_purge_all' ),
			));

			// Cloudflare: Pause / resume caching (KV kill switch).
			register_rest_route('td-spa', 'cf/pause', array(
				'methods' => array( 'POST' ),
				'permission_callback' => array( $this, 'permission_callback' ),
				'callback' => array( $this, 'cf_pause' ),
			));

			// Cloudflare: Push the current edge worker (manual retry).
			register_rest_route('td-spa', 'cf/redeploy-worker', array(
				'methods' => array( 'POST' ),
				'permission_callback' => array( $this, 'permission_callback' ),
				'callback' => array( $this, 'cf_redeploy_worker' ),
			));

			// Cloudflare: Warm the whole site into the KV layer now.
			register_rest_route('td-spa', 'cf/warm', array(
				'methods' => array( 'POST' ),
				'permission_callback' => array( $this, 'permission_callback' ),
				'callback' => array( $this, 'cf_warm' ),
			));

			// Cloudflare: Cache health (samples URLs and reads the cache header).
			register_rest_route('td-spa', 'cf/health', array(
				'methods' => array( 'GET' ),
				'permission_callback' => array( $this, 'permission_callback' ),
				'callback' => array( $this, 'cf_health' ),
			));
		}

		/**
		 * Permission callback.
		 *
		 * @return bool
		 */
		public function permission_callback() {
			return current_user_can( 'manage_options' );
		}

		/**
		 * Save settings.
		 *
		 * @param $request WP REST Request.
		 * @return \WP_REST_Response
		 */
		public function save_settings( $request ) {
			$requested_settings = $request->get_param('settings');

			$options = new \TDSPA\Options();

			$options->update_settings($requested_settings);

			return rest_ensure_response(array(
				'success' => true,
				'message' => __('Settings updated.', 'td-spa'),
			));
		}

		/**
		 * Save deactivate feedback.
		 *
		 * @param $request
		 * @return \WP_REST_Response
		 */
		public function save_deactivate_feedback( $request ) {

			$reason = sanitize_text_field( $request->get_param('reason') );
			$comment = sanitize_textarea_field( $request->get_param('comment') );

			// No username: the site URL is enough to follow a report up, and a
			// WordPress account name is personal data we have no reason to send
			// off site. The local copy carries the same fields as the sent one.
			$feedback = array(
				'reason' => $reason,
				'comment' => $comment,
				'timestamp' => current_time('mysql'),
				'site_url' => get_site_url(),
			);

			// Store locally (autoload=false to prevent loading on every page).
			$feedbacks = get_option('td_spa_deactivate_feedbacks', array());
			$feedbacks[] = $feedback;
			update_option('td_spa_deactivate_feedbacks', $feedbacks, false);

			// Send to server.
			$url = 'https://arraystory.com/?feedback&product=td-spa';

			wp_remote_post( $url, array(
				'timeout' => 15,
				'body' => wp_json_encode( $feedback ),
				'headers' => array(
					'Content-Type' => 'application/json',
				),
			));

			return rest_ensure_response(array(
				'success' => true,
				'message' => __('Thank you for your feedback.', 'td-spa'),
			));
		}

		/**
		 * Save diagnostic permission.
		 *
		 * @param $request
		 * @return \WP_REST_Response
		 */
		public function save_diagnostic_permission( $request ) {

			$allowed = $request->get_param('allowed');
			$allowed = filter_var( $allowed, FILTER_VALIDATE_BOOLEAN );

			update_option( 'td_spa_diagnostic_permission', $allowed ? 'allowed' : 'denied', false );

			return rest_ensure_response(array(
				'success' => true,
				'message' => __('Permission saved.', 'td-spa'),
			));
		}

		/**
		 * Handle tour state (GET/POST).
		 *
		 * @param $request
		 * @return \WP_REST_Response
		 */
		public function handle_tour_state( $request ) {
			$user_id = get_current_user_id();

			if ( $request->get_method() === 'GET' ) {
				$mode         = get_user_meta( $user_id, 'td_spa_tour_mode', true );
				$dismissed_at = get_user_meta( $user_id, 'td_spa_tour_dismissed_at', true );

				return rest_ensure_response(array(
					'success'      => true,
					'completed'    => (bool) get_user_meta( $user_id, 'td_spa_tour_completed', true ),
					'mode'         => $mode ? $mode : 'quick',
					'dismissed_at' => $dismissed_at ? $dismissed_at : null,
				));
			}

			// POST - update tour state
			if ( $request->has_param('completed') ) {
				update_user_meta( $user_id, 'td_spa_tour_completed', (bool) $request->get_param('completed') );
			}

			if ( $request->has_param('mode') ) {
				$mode = sanitize_text_field( $request->get_param('mode') );
				if ( in_array( $mode, array( 'quick', 'extended' ), true ) ) {
					update_user_meta( $user_id, 'td_spa_tour_mode', $mode );
				}
			}

			if ( $request->has_param('dismissed_at') ) {
				$dismissed_at = $request->get_param('dismissed_at');
				update_user_meta( $user_id, 'td_spa_tour_dismissed_at', $dismissed_at ? (int) $dismissed_at : null );
			}

			return rest_ensure_response(array(
				'success' => true,
				'message' => __('Tour state updated.', 'td-spa'),
			));
		}

		/**
		 * Verify Cloudflare token.
		 *
		 * @param WP_REST_Request $request Request object.
		 * @return WP_REST_Response
		 */
		public function cf_verify_token( $request ) {
			// Use preg_replace to only allow valid API token characters (alphanumeric, hyphens, underscores).
			$raw_token = $request->get_param('token');
			$token = preg_replace( '/[^a-zA-Z0-9_\-]/', '', $raw_token );

			if ( empty( $token ) ) {
				return rest_ensure_response(array(
					'success' => false,
					'message' => __('API token is required.', 'td-spa'),
				));
			}

			$api    = new \TDSPA\Cloudflare\API( $token );
			$result = $api->verify_token();

			if ( is_wp_error( $result ) ) {
				$error_data = $result->get_error_data();
				$status_info = isset( $error_data['status'] ) ? ' (HTTP ' . $error_data['status'] . ')' : '';
				return rest_ensure_response(array(
					'success' => false,
					'message' => $result->get_error_message() . $status_info,
				));
			}

			// Check if result has expected structure.
			if ( ! isset( $result['result'] ) ) {
				return rest_ensure_response(array(
					'success' => false,
					'message' => __( 'Unexpected response from Cloudflare API.', 'td-spa' ),
				));
			}

			// Token is valid, store it encrypted.
			$encrypted = $api->encrypt_token( $token );
			update_option( 'td_spa_cf_api_token', $encrypted );

			// Get accounts.
			$accounts_result = $api->list_accounts();
			$accounts = array();
			if ( ! is_wp_error( $accounts_result ) && ! empty( $accounts_result['result'] ) ) {
				foreach ( $accounts_result['result'] as $account ) {
					$accounts[] = array(
						'id'   => $account['id'],
						'name' => $account['name'],
					);
				}
			}

			return rest_ensure_response(array(
				'success'  => true,
				'message'  => __('Token verified successfully.', 'td-spa'),
				'accounts' => $accounts,
			));
		}

		/**
		 * List Cloudflare zones (filtered to match site domain).
		 *
		 * @param WP_REST_Request $request Request object.
		 * @return WP_REST_Response
		 */
		public function cf_list_zones( $request ) {
			$api    = new \TDSPA\Cloudflare\API();
			$result = $api->list_zones();

			if ( is_wp_error( $result ) ) {
				return rest_ensure_response(array(
					'success' => false,
					'message' => $result->get_error_message(),
				));
			}

			// Get site domain.
			$site_host = wp_parse_url( home_url(), PHP_URL_HOST );

			$zones = array();
			$matched_zone = null;

			if ( ! empty( $result['result'] ) ) {
				foreach ( $result['result'] as $zone ) {
					$zone_data = array(
						'id'     => $zone['id'],
						'name'   => $zone['name'],
						'status' => $zone['status'],
						'paused' => $zone['paused'],
					);
					$zones[] = $zone_data;

					// Check if this zone matches the site domain.
					if ( $this->domain_matches_zone( $site_host, $zone['name'] ) ) {
						$matched_zone = $zone_data;
					}
				}
			}

			return rest_ensure_response(array(
				'success'      => true,
				'zones'        => $zones,
				'site_host'    => $site_host,
				'matched_zone' => $matched_zone,
			));
		}

		/**
		 * Check if site domain matches a zone.
		 * Handles subdomains: blog.example.com matches zone example.com
		 *
		 * @param string $site_host Site hostname (e.g., blog.example.com).
		 * @param string $zone_name Zone name (e.g., example.com).
		 * @return bool
		 */
		private function domain_matches_zone( $site_host, $zone_name ) {
			// Exact match.
			if ( $site_host === $zone_name ) {
				return true;
			}

			// Subdomain match: site_host ends with .zone_name
			if ( substr( $site_host, -strlen( '.' . $zone_name ) ) === '.' . $zone_name ) {
				return true;
			}

			return false;
		}

		/**
		 * Deploy Cloudflare worker and route.
		 *
		 * @param WP_REST_Request $request Request object.
		 * @return WP_REST_Response
		 */
		public function cf_deploy( $request ) {
			$zone_id = sanitize_text_field( $request->get_param('zone_id') );

			if ( empty( $zone_id ) ) {
				return rest_ensure_response(array(
					'success' => false,
					'message' => __('Zone ID is required.', 'td-spa'),
				));
			}

			$cache  = new \TDSPA\Cloudflare\Cache();
			$result = $cache->deploy( $zone_id );

			if ( is_wp_error( $result ) ) {
				return rest_ensure_response(array(
					'success' => false,
					'message' => $result->get_error_message(),
				));
			}

			return rest_ensure_response( $result );
		}

		/**
		 * Begin the OAuth connect flow: return the relay URL to redirect to.
		 *
		 * @param WP_REST_Request $request Request object.
		 * @return WP_REST_Response
		 */
		public function cf_oauth_start( $request ) {
			$return_url = esc_url_raw( $request->get_param( 'return_url' ) );
			if ( empty( $return_url ) ) {
				$return_url = admin_url( 'options-general.php?page=td-spa#/cache' );
			}

			$oauth  = new \TDSPA\Cloudflare\OAuth();
			$result = $oauth->start( $return_url );

			if ( is_wp_error( $result ) ) {
				return rest_ensure_response( array(
					'success' => false,
					'message' => $result->get_error_message(),
				) );
			}

			return rest_ensure_response( array(
				'success'      => true,
				'authorize_url' => $result,
			) );
		}

		/**
		 * Exchange the authorization code (handed back by the relay) for
		 * tokens, then deploy against the matched zone.
		 *
		 * @param WP_REST_Request $request Request object.
		 * @return WP_REST_Response
		 */
		public function cf_oauth_exchange( $request ) {
			$code  = sanitize_text_field( $request->get_param( 'code' ) );
			$state = sanitize_text_field( $request->get_param( 'state' ) );

			if ( empty( $code ) || empty( $state ) ) {
				return rest_ensure_response( array(
					'success' => false,
					'message' => __( 'Missing authorization code.', 'td-spa' ),
				) );
			}

			$oauth  = new \TDSPA\Cloudflare\OAuth();
			$result = $oauth->exchange( $code, $state );

			if ( is_wp_error( $result ) ) {
				return rest_ensure_response( array(
					'success' => false,
					'message' => $result->get_error_message(),
				) );
			}

			// Connected. Report zones so the UI can complete deploy (same as
			// the token path); the site domain is auto-matched there.
			$api   = new \TDSPA\Cloudflare\API();
			$zones = $api->list_zones();

			return rest_ensure_response( array(
				'success' => true,
				'zones'   => is_wp_error( $zones ) ? array() : ( isset( $zones['result'] ) ? $zones['result'] : array() ),
			) );
		}

		/**
		 * Search posts or taxonomy terms for the cache-exclude pickers.
		 *
		 * Also resolves already-selected ids, so the UI can show real labels
		 * for saved values instead of bare numbers on first paint.
		 *
		 * @param WP_REST_Request $request Request object.
		 * @return WP_REST_Response
		 */
		public function cf_content_search( $request ) {
			$type    = (string) $request->get_param( 'type' );
			$search  = sanitize_text_field( (string) $request->get_param( 'q' ) );
			$include = array_filter( array_map( 'sanitize_text_field', (array) $request->get_param( 'include' ) ) );

			if ( 'post' === $type ) {
				$items = $this->search_posts( $search, $include );
			} elseif ( 'term' === $type ) {
				$items = $this->search_terms( $search, $include );
			} else {
				// One list covering all three, so the UI needs a single
				// control. Values stay tellable apart on the way back: posts
				// are numeric, specials are "special:key", terms are
				// "taxonomy:id".
				$post_ids = $this->numeric_only( $include );
				$specials = $this->specials_only( $include );
				$term_refs = array_diff( $this->refs_only( $include ), $specials );

				if ( ! empty( $include ) ) {
					// Resolving saved values: ask each side only for what it
					// actually owns, otherwise the side with nothing to
					// resolve would run a search and return unrelated rows.
					$items = array_merge(
						$this->special_pages( '', $specials ),
						empty( $post_ids ) ? array() : $this->search_posts( '', $post_ids ),
						empty( $term_refs ) ? array() : $this->search_terms( '', $term_refs )
					);
				} else {
					// Specials first: "home" should not be buried under every
					// post whose title happens to contain the word.
					$items = array_merge(
						$this->special_pages( $search, array() ),
						$this->search_posts( $search, array() ),
						$this->search_terms( $search, array() )
					);
				}
			}

			return rest_ensure_response(array(
				'success' => true,
				'items'   => $items,
			));
		}

		/**
		 * Built-in WordPress screens that are not posts, so they cannot be
		 * found by searching content - the front page, the blog index,
		 * search results and the archive types.
		 *
		 * @param string $search  Search text.
		 * @param array  $include Specific "special:key" values to resolve.
		 * @return array
		 */
		private function special_pages( $search, $include ) {
			$all = \TDSPA\Cloudflare\Cache::special_pages();
			$out = array();

			foreach ( $all as $key => $definition ) {
				$value = 'special:' . $key;

				if ( ! empty( $include ) ) {
					if ( ! in_array( $value, $include, true ) ) {
						continue;
					}
				} elseif ( '' !== $search && false === stripos( $definition['label'], $search ) ) {
					continue;
				}

				$out[] = array(
					'value' => $value,
					'label' => $definition['label'],
					'meta'  => __( 'WordPress', 'td-spa' ),
				);
			}

			return $out;
		}

		/**
		 * "special:key" entries only.
		 *
		 * @param array $values Mixed selection values.
		 * @return array
		 */
		private function specials_only( $values ) {
			return array_values( array_filter( $values, function ( $v ) {
				return 0 === strpos( $v, 'special:' );
			} ) );
		}

		/**
		 * Numeric entries only (post ids).
		 *
		 * @param array $values Mixed selection values.
		 * @return array
		 */
		private function numeric_only( $values ) {
			return array_values( array_filter( $values, function ( $v ) {
				return false === strpos( $v, ':' );
			} ) );
		}

		/**
		 * "taxonomy:term_id" entries only.
		 *
		 * @param array $values Mixed selection values.
		 * @return array
		 */
		private function refs_only( $values ) {
			return array_values( array_filter( $values, function ( $v ) {
				return false !== strpos( $v, ':' );
			} ) );
		}

		/**
		 * Post results for the exclude picker.
		 *
		 * @param string $search  Search text.
		 * @param array  $include Specific post IDs to resolve.
		 * @return array
		 */
		private function search_posts( $search, $include ) {
			$args = array(
				'post_type'        => array_values( get_post_types( array( 'public' => true ) ) ),
				'post_status'      => 'publish',
				'numberposts'      => 20,
				'suppress_filters' => false,
			);

			if ( ! empty( $include ) ) {
				$args['include']     = array_map( 'absint', $include );
				$args['numberposts'] = count( $include );
			} elseif ( '' !== $search ) {
				$args['s'] = $search;
			}

			$items = array();
			foreach ( get_posts( $args ) as $post ) {
				$type_obj = get_post_type_object( $post->post_type );
				$items[]  = array(
					'value' => (string) $post->ID,
					'label' => $post->post_title ? $post->post_title : __( '(no title)', 'td-spa' ),
					'meta'  => $type_obj ? $type_obj->labels->singular_name : $post->post_type,
				);
			}

			return $items;
		}

		/**
		 * Taxonomy-term results for the exclude picker.
		 *
		 * Values are "taxonomy:term_id" so one list can mix taxonomies.
		 *
		 * @param string $search  Search text.
		 * @param array  $include Specific "taxonomy:term_id" refs to resolve.
		 * @return array
		 */
		private function search_terms( $search, $include ) {
			$items = array();

			if ( ! empty( $include ) ) {
				foreach ( $include as $ref ) {
					$parts = explode( ':', $ref );
					if ( count( $parts ) !== 2 ) {
						continue;
					}
					$term = get_term( (int) $parts[1], $parts[0] );
					if ( $term && ! is_wp_error( $term ) ) {
						$items[] = $this->term_item( $term );
					}
				}
				return $items;
			}

			$terms = get_terms( array(
				'taxonomy'   => array_values( get_taxonomies( array( 'public' => true ) ) ),
				'hide_empty' => false,
				'number'     => 20,
				'search'     => $search,
			) );

			if ( is_wp_error( $terms ) ) {
				return array();
			}

			foreach ( $terms as $term ) {
				$items[] = $this->term_item( $term );
			}

			return $items;
		}

		/**
		 * Shape one term for the picker.
		 *
		 * @param WP_Term $term Term.
		 * @return array
		 */
		private function term_item( $term ) {
			return array(
				'value' => $term->taxonomy . ':' . $term->term_id,
				'label' => $term->name,
				'meta'  => $this->taxonomy_label( $term->taxonomy ),
			);
		}

		/**
		 * Human label for a taxonomy, kept unique.
		 *
		 * Several taxonomies can share a display name - WooCommerce's
		 * product_cat calls itself "Category", exactly like core's category -
		 * which would show two identical-looking rows in the picker. Where the
		 * name is shared, the slug is appended so the choice is unambiguous.
		 *
		 * @param string $taxonomy Taxonomy slug.
		 * @return string
		 */
		private function taxonomy_label( $taxonomy ) {
			static $counts = null;

			$tax = get_taxonomy( $taxonomy );
			if ( ! $tax ) {
				return $taxonomy;
			}

			$name = $tax->labels->singular_name;

			if ( null === $counts ) {
				$counts = array();
				foreach ( get_taxonomies( array( 'public' => true ), 'objects' ) as $candidate ) {
					$label            = $candidate->labels->singular_name;
					$counts[ $label ] = isset( $counts[ $label ] ) ? $counts[ $label ] + 1 : 1;
				}
			}

			return ( isset( $counts[ $name ] ) && $counts[ $name ] > 1 )
				? $name . ' (' . $taxonomy . ')'
				: $name;
		}

		/**
		 * Unlink the Cloudflare account.
		 *
		 * Drops the stored credentials only. A deployed worker/route is left
		 * alone - that is what cf/teardown is for - so this is the safe way
		 * out of a connect that never reached a zone.
		 *
		 * @param WP_REST_Request $request Request object.
		 * @return WP_REST_Response
		 */
		public function cf_disconnect( $request ) {
			if ( class_exists( '\TDSPA\Cloudflare\OAuth' ) ) {
				( new \TDSPA\Cloudflare\OAuth() )->disconnect();
			}
			delete_option( 'td_spa_cf_api_token' );

			return rest_ensure_response(array(
				'success' => true,
				'message' => __( 'Cloudflare account disconnected.', 'td-spa' ),
			));
		}

		/**
		 * Get Cloudflare cache status.
		 *
		 * @param WP_REST_Request $request Request object.
		 * @return WP_REST_Response
		 */
		public function cf_status( $request ) {
			$cache  = new \TDSPA\Cloudflare\Cache();
			$status = $cache->get_status();

			// Check if token is still valid.
			if ( $status['connected'] ) {
				$api          = new \TDSPA\Cloudflare\API();
				$token_result = $api->verify_token();
				$status['token_valid'] = ! is_wp_error( $token_result );
			}

			return rest_ensure_response(array(
				'success' => true,
				'status'  => $status,
			));
		}

		/**
		 * Teardown Cloudflare cache.
		 *
		 * @param WP_REST_Request $request Request object.
		 * @return WP_REST_Response
		 */
		public function cf_teardown( $request ) {
			$cache  = new \TDSPA\Cloudflare\Cache();
			$result = $cache->teardown();

			// Also delete the stored token.
			delete_option( 'td_spa_cf_api_token' );

			if ( is_wp_error( $result ) ) {
				return rest_ensure_response(array(
					'success' => false,
					'message' => $result->get_error_message(),
				));
			}

			return rest_ensure_response( $result );
		}

		/**
		 * Purge specific URLs.
		 *
		 * @param WP_REST_Request $request Request object.
		 * @return WP_REST_Response
		 */
		public function cf_purge( $request ) {
			$urls = $request->get_param('urls');

			if ( empty( $urls ) || ! is_array( $urls ) ) {
				return rest_ensure_response(array(
					'success' => false,
					'message' => __('URLs array is required.', 'td-spa'),
				));
			}

			// Sanitize URLs.
			$urls = array_map( 'esc_url_raw', $urls );

			$cache  = new \TDSPA\Cloudflare\Cache();
			$result = $cache->purge_urls( $urls );

			if ( is_wp_error( $result ) ) {
				return rest_ensure_response(array(
					'success' => false,
					'message' => $result->get_error_message(),
				));
			}

			return rest_ensure_response( $result );
		}

		/**
		 * Purge all cache.
		 *
		 * @param WP_REST_Request $request Request object.
		 * @return WP_REST_Response
		 */
		public function cf_purge_all( $request ) {
			$cache  = new \TDSPA\Cloudflare\Cache();
			$result = $cache->purge_all();

			if ( is_wp_error( $result ) ) {
				return rest_ensure_response(array(
					'success' => false,
					'message' => $result->get_error_message(),
				));
			}

			return rest_ensure_response( $result );
		}

		/**
		 * Pause or resume edge caching via the KV kill switch.
		 *
		 * @param WP_REST_Request $request Request object.
		 * @return WP_REST_Response
		 */
		public function cf_pause( $request ) {
			$paused = rest_sanitize_boolean( $request->get_param( 'paused' ) );

			$cache  = new \TDSPA\Cloudflare\Cache();
			$result = $cache->set_kill( $paused );

			if ( is_wp_error( $result ) ) {
				return rest_ensure_response( array(
					'success' => false,
					'message' => $result->get_error_message(),
				) );
			}

			return rest_ensure_response( array(
				'success' => true,
				'paused'  => $paused,
			) );
		}

		/**
		 * Upload the current edge worker now.
		 *
		 * The background path handles this on its own; this is the way out
		 * when it has given up after exhausting its retries. Clearing the
		 * failure record first is the point of the button as much as the
		 * upload is: while that record exists, the automatic path stays out
		 * of the way, so a manual attempt has to put it back in play whether
		 * or not this particular attempt succeeds.
		 *
		 * @param WP_REST_Request $request Request object.
		 * @return WP_REST_Response
		 */
		public function cf_redeploy_worker( $request ) {
			delete_option( \TDSPA\Cloudflare\Cache::REDEPLOY_FAILED_OPTION );
			delete_option( \TDSPA\Cloudflare\Cache::REDEPLOY_ATTEMPTS_OPTION );

			$cache  = new \TDSPA\Cloudflare\Cache();
			$result = $cache->redeploy_worker();

			if ( is_wp_error( $result ) ) {
				return rest_ensure_response( array(
					'success' => false,
					'message' => $result->get_error_message(),
				) );
			}

			return rest_ensure_response( array(
				'success' => true,
				'status'  => $cache->get_status(),
				'message' => __( 'Edge worker updated.', 'td-spa' ),
			) );
		}

		/**
		 * Warm the whole site into the KV layer now.
		 *
		 * The connect-time crawl handles this on its own, but only on a fresh
		 * deploy and only once WP-Cron fires. This is the on-demand version:
		 * it re-arms the crawl and runs the first batch inline so pages start
		 * landing in KV immediately, then leaves WP-Cron to finish the rest.
		 *
		 * @param WP_REST_Request $request Request object.
		 * @return WP_REST_Response
		 */
		public function cf_warm( $request ) {
			$cache = new \TDSPA\Cloudflare\Cache();

			if ( ! $cache->kv_pages_enabled() ) {
				return rest_ensure_response( array(
					'success' => false,
					'message' => __( 'The global (KV) layer is not active on this site yet.', 'td-spa' ),
				) );
			}

			$cache->queue_warm_pages();

			// Run the first batch here so the user sees pages appear now rather
			// than waiting on the next cron tick.
			$warmed = $cache->warm_next_batch();

			return rest_ensure_response( array(
				'success' => true,
				'warmed'  => $warmed,
				'more'    => $cache->warm_has_more(),
				'status'  => $cache->get_status(),
				'message' => $cache->warm_has_more()
					? __( 'Caching started. Pages are being added to the edge in the background.', 'td-spa' )
					: __( 'Every page is cached.', 'td-spa' ),
			) );
		}

		/**
		 * Return a handful of representative URLs for the browser to probe.
		 *
		 * The measurement is done client-side on purpose: a request from the
		 * origin server to its own domain usually resolves straight to the
		 * origin and bypasses Cloudflare, so it would never see the edge
		 * cache header. The admin browser goes through Cloudflare.
		 *
		 * @param WP_REST_Request $request Request object.
		 * @return WP_REST_Response
		 */
		public function cf_health( $request ) {
			$urls = array( home_url( '/' ) );
			foreach ( get_posts( array(
				'post_type'      => array( 'post', 'page' ),
				'post_status'    => 'publish',
				'posts_per_page' => 4,
				'fields'         => 'ids',
			) ) as $id ) {
				$urls[] = get_permalink( $id );
			}

			return rest_ensure_response( array(
				'success' => true,
				'urls'    => array_values( array_unique( array_filter( $urls ) ) ),
			) );
		}
	}

	// Let's start.
	REST::start();
}
