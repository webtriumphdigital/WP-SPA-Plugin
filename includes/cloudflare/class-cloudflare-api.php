<?php
/**
 * Cloudflare API Client.
 *
 * @package TD SPA
 * @since 2.4.0
 */

namespace TDSPA\Cloudflare;

defined( 'ABSPATH' ) || die();

if ( ! class_exists( __NAMESPACE__ . '\API' ) ) {

	/**
	 * Cloudflare API v4 client.
	 */
	class API {

		/**
		 * API base URL.
		 */
		const API_BASE = 'https://api.cloudflare.com/client/v4';

		/**
		 * API token.
		 *
		 * @var string
		 */
		private $token;

		/**
		 * Constructor.
		 *
		 * @param string $token API token.
		 */
		public function __construct( $token = '' ) {
			$this->token = ! empty( $token ) ? $token : $this->get_stored_token();
		}

		/**
		 * Get stored token from options.
		 *
		 * @return string
		 */
		private function get_stored_token() {
			// Prefer an OAuth access token when connected; the pasted API
			// token is the fallback.
			if ( class_exists( __NAMESPACE__ . '\OAuth' ) ) {
				$oauth = new OAuth( $this );
				if ( $oauth->is_connected() ) {
					$access = $oauth->get_access_token();
					if ( ! is_wp_error( $access ) && ! empty( $access ) ) {
						return $access;
					}
				}
			}

			$encrypted = get_option( 'td_spa_cf_api_token', '' );
			$token = $this->decrypt_token( $encrypted );

			return $token;
		}

		/**
		 * Encrypt token for storage.
		 *
		 * @param string $token Plain token.
		 * @return string Encrypted token.
		 */
		public function encrypt_token( $token ) {
			if ( empty( $token ) ) {
				return '';
			}
			$key = $this->get_encryption_key();
			$iv  = openssl_random_pseudo_bytes( 16 );
			$encrypted = openssl_encrypt( $token, 'AES-256-CBC', $key, OPENSSL_RAW_DATA, $iv );
			return base64_encode( $iv . $encrypted );
		}

		/**
		 * Decrypt stored token.
		 *
		 * @param string $encrypted_data Encrypted token.
		 * @return string Plain token.
		 */
		public function decrypt_token( $encrypted_data ) {
			if ( empty( $encrypted_data ) ) {
				return '';
			}
			$key  = $this->get_encryption_key();
			$data = base64_decode( $encrypted_data );
			if ( strlen( $data ) < 16 ) {
				return '';
			}
			$iv        = substr( $data, 0, 16 );
			$encrypted = substr( $data, 16 );
			$decrypted = openssl_decrypt( $encrypted, 'AES-256-CBC', $key, OPENSSL_RAW_DATA, $iv );
			return false !== $decrypted ? $decrypted : '';
		}

		/**
		 * Get encryption key.
		 *
		 * @return string
		 */
		private function get_encryption_key() {
			if ( defined( 'TD_SPA_ENCRYPTION_KEY' ) ) {
				return TD_SPA_ENCRYPTION_KEY;
			}
			return wp_salt( 'auth' );
		}

		/**
		 * Make API request.
		 *
		 * @param string $endpoint API endpoint.
		 * @param string $method   HTTP method.
		 * @param array  $body     Request body.
		 * @return array|WP_Error
		 */
		private function request( $endpoint, $method = 'GET', $body = null ) {
			if ( empty( $this->token ) ) {
				return new \WP_Error( 'cf_no_token', __( 'API token is not configured.', 'td-spa' ) );
			}

			$url = self::API_BASE . $endpoint;

			$args = array(
				'timeout' => 30,
				'headers' => array(
					'Authorization' => 'Bearer ' . $this->token,
				),
			);

			if ( null !== $body ) {
				$args['headers']['Content-Type'] = 'application/json';
				$args['body'] = wp_json_encode( $body );
			}

			// Use appropriate WP HTTP function based on method.
			if ( 'GET' === $method ) {
				$response = wp_remote_get( $url, $args );
			} elseif ( 'POST' === $method ) {
				$response = wp_remote_post( $url, $args );
			} else {
				$args['method'] = $method;
				$response = wp_remote_request( $url, $args );
			}

			if ( is_wp_error( $response ) ) {
				return $response;
			}

			$code = wp_remote_retrieve_response_code( $response );
			$response_body = json_decode( wp_remote_retrieve_body( $response ), true );

			// Handle HTTP errors.
			if ( $code >= 400 ) {
				$error_msg = isset( $response_body['errors'][0]['message'] )
					? $response_body['errors'][0]['message']
					: __( 'API request failed', 'td-spa' );
				return new \WP_Error( 'cf_api_error', $error_msg, array( 'status' => $code ) );
			}

			// Handle CF API errors (success: false).
			if ( isset( $response_body['success'] ) && false === $response_body['success'] ) {
				$error_msg = isset( $response_body['errors'][0]['message'] )
					? $response_body['errors'][0]['message']
					: __( 'Cloudflare API returned an error', 'td-spa' );
				return new \WP_Error( 'cf_api_error', $error_msg );
			}

			return $response_body;
		}

		/**
		 * Verify token validity.
		 *
		 * @return array|WP_Error Token verification result.
		 */
		public function verify_token() {
			return $this->request( '/user/tokens/verify' );
		}

		/**
		 * Get user details.
		 *
		 * @return array|WP_Error
		 */
		public function get_user() {
			return $this->request( '/user' );
		}

		/**
		 * List zones (domains) in account.
		 *
		 * @param string $account_id Optional account ID filter.
		 * @return array|WP_Error
		 */
		public function list_zones( $account_id = '' ) {
			$endpoint = '/zones?per_page=50&status=active';
			if ( $account_id ) {
				$endpoint .= '&account.id=' . $account_id;
			}
			return $this->request( $endpoint );
		}

		/**
		 * Get zone details.
		 *
		 * @param string $zone_id Zone ID.
		 * @return array|WP_Error
		 */
		public function get_zone( $zone_id ) {
			return $this->request( '/zones/' . $zone_id );
		}

		/**
		 * List accounts.
		 *
		 * @return array|WP_Error
		 */
		public function list_accounts() {
			return $this->request( '/accounts' );
		}

		/**
		 * Upload worker script (ES modules format).
		 *
		 * @param string $account_id Account ID.
		 * @param string $script_name Worker script name.
		 * @param string $script_content Worker script content.
		 * @return array|WP_Error
		 */
		public function upload_worker( $account_id, $script_name, $script_content, $bindings = array() ) {
			$url = self::API_BASE . '/accounts/' . $account_id . '/workers/scripts/' . $script_name;

			// Build multipart form data for ES modules.
			$boundary = wp_generate_password( 24, false );

			// Metadata specifying the entry module and any bindings (e.g. KV).
			$metadata = wp_json_encode( $this->build_worker_metadata( $bindings ) );

			// Build multipart body.
			$body = '';

			// Metadata part.
			$body .= '--' . $boundary . "\r\n";
			$body .= 'Content-Disposition: form-data; name="metadata"' . "\r\n";
			$body .= 'Content-Type: application/json' . "\r\n\r\n";
			$body .= $metadata . "\r\n";

			// Worker script part.
			$body .= '--' . $boundary . "\r\n";
			$body .= 'Content-Disposition: form-data; name="worker.js"; filename="worker.js"' . "\r\n";
			$body .= 'Content-Type: application/javascript+module' . "\r\n\r\n";
			$body .= $script_content . "\r\n";

			// End boundary.
			$body .= '--' . $boundary . '--' . "\r\n";

			$response = wp_remote_request( $url, array(
				'method'  => 'PUT',
				'timeout' => 30,
				'headers' => array(
					'Authorization' => 'Bearer ' . $this->token,
					'Content-Type'  => 'multipart/form-data; boundary=' . $boundary,
				),
				'body'    => $body,
			) );

			if ( is_wp_error( $response ) ) {
				return $response;
			}

			$code = wp_remote_retrieve_response_code( $response );
			$response_body = json_decode( wp_remote_retrieve_body( $response ), true );

			if ( $code >= 400 ) {
				$error_msg = isset( $response_body['errors'][0]['message'] )
					? $response_body['errors'][0]['message']
					: 'Failed to upload worker';
				return new \WP_Error( 'cf_worker_error', $error_msg );
			}

			return $response_body;
		}

		/**
		 * Delete worker script.
		 *
		 * @param string $account_id Account ID.
		 * @param string $script_name Worker script name.
		 * @return array|WP_Error
		 */
		public function delete_worker( $account_id, $script_name ) {
			return $this->request(
				'/accounts/' . $account_id . '/workers/scripts/' . $script_name,
				'DELETE'
			);
		}

		/**
		 * Create worker route.
		 *
		 * @param string $zone_id Zone ID.
		 * @param string $pattern Route pattern (e.g., example.com/*).
		 * @param string $script_name Worker script name.
		 * @return array|WP_Error
		 */
		public function create_route( $zone_id, $pattern, $script_name ) {
			return $this->request(
				'/zones/' . $zone_id . '/workers/routes',
				'POST',
				array(
					'pattern' => $pattern,
					'script'  => $script_name,
				)
			);
		}

		/**
		 * List worker routes.
		 *
		 * @param string $zone_id Zone ID.
		 * @return array|WP_Error
		 */
		public function list_routes( $zone_id ) {
			return $this->request( '/zones/' . $zone_id . '/workers/routes' );
		}

		/**
		 * Delete worker route.
		 *
		 * @param string $zone_id Zone ID.
		 * @param string $route_id Route ID.
		 * @return array|WP_Error
		 */
		public function delete_route( $zone_id, $route_id ) {
			return $this->request(
				'/zones/' . $zone_id . '/workers/routes/' . $route_id,
				'DELETE'
			);
		}

		/**
		 * Purge cache by URLs.
		 *
		 * @param string $zone_id Zone ID.
		 * @param array  $urls    URLs to purge (max 30).
		 * @return array|WP_Error
		 */
		public function purge_urls( $zone_id, $urls ) {
			return $this->request(
				'/zones/' . $zone_id . '/purge_cache',
				'POST',
				array( 'files' => array_slice( $urls, 0, 30 ) )
			);
		}

		/**
		 * Purge entire cache for zone.
		 *
		 * @param string $zone_id Zone ID.
		 * @return array|WP_Error
		 */
		public function purge_all( $zone_id ) {
			return $this->request(
				'/zones/' . $zone_id . '/purge_cache',
				'POST',
				array( 'purge_everything' => true )
			);
		}

		/**
		 * Build the worker upload metadata (entry module + bindings).
		 *
		 * Split out so the binding shape can be unit tested without HTTP.
		 *
		 * @param array $bindings Binding definitions.
		 * @return array Metadata array for the multipart upload.
		 */
		public function build_worker_metadata( $bindings = array() ) {
			$metadata = array(
				'main_module' => 'worker.js',
			);

			if ( ! empty( $bindings ) ) {
				$metadata['bindings'] = array_values( $bindings );
			}

			return $metadata;
		}

		/**
		 * Build a KV namespace binding definition.
		 *
		 * @param string $name         Variable name exposed to the worker.
		 * @param string $namespace_id KV namespace ID.
		 * @return array
		 */
		public function kv_binding( $name, $namespace_id ) {
			return array(
				'type'         => 'kv_namespace',
				'name'         => $name,
				'namespace_id' => $namespace_id,
			);
		}

		/**
		 * Create a KV namespace.
		 *
		 * @param string $account_id Account ID.
		 * @param string $title      Namespace title.
		 * @return array|WP_Error
		 */
		public function create_kv_namespace( $account_id, $title ) {
			return $this->request(
				'/accounts/' . $account_id . '/storage/kv/namespaces',
				'POST',
				array( 'title' => $title )
			);
		}

		/**
		 * Delete a KV namespace.
		 *
		 * @param string $account_id   Account ID.
		 * @param string $namespace_id Namespace ID.
		 * @return array|WP_Error
		 */
		public function delete_kv_namespace( $account_id, $namespace_id ) {
			return $this->request(
				'/accounts/' . $account_id . '/storage/kv/namespaces/' . $namespace_id,
				'DELETE'
			);
		}

		/**
		 * Write a single KV key/value.
		 *
		 * Values are stored as plain text; callers pass pre-encoded JSON.
		 *
		 * @param string $account_id   Account ID.
		 * @param string $namespace_id Namespace ID.
		 * @param string $key          Key name.
		 * @param string $value        Value (already serialized).
		 * @return array|WP_Error
		 */
		public function kv_put( $account_id, $namespace_id, $key, $value ) {
			$url = self::API_BASE . '/accounts/' . $account_id . '/storage/kv/namespaces/' . $namespace_id . '/values/' . rawurlencode( $key );

			$response = wp_remote_request( $url, array(
				'method'  => 'PUT',
				'timeout' => 30,
				'headers' => array(
					'Authorization' => 'Bearer ' . $this->token,
					'Content-Type'  => 'text/plain',
				),
				'body'    => $value,
			) );

			if ( is_wp_error( $response ) ) {
				return $response;
			}

			$code = wp_remote_retrieve_response_code( $response );
			$body = json_decode( wp_remote_retrieve_body( $response ), true );

			if ( $code >= 400 ) {
				$error_msg = isset( $body['errors'][0]['message'] )
					? $body['errors'][0]['message']
					: __( 'Failed to write KV value', 'td-spa' );
				return new \WP_Error( 'cf_kv_error', $error_msg );
			}

			return $body;
		}

		/**
		 * Delete a single KV key.
		 *
		 * @param string $account_id   Account ID.
		 * @param string $namespace_id Namespace ID.
		 * @param string $key          Key name.
		 * @return array|WP_Error
		 */
		public function kv_delete_value( $account_id, $namespace_id, $key ) {
			return $this->request(
				'/accounts/' . $account_id . '/storage/kv/namespaces/' . $namespace_id . '/values/' . rawurlencode( $key ),
				'DELETE'
			);
		}

		/**
		 * Absolute path to the Worker template on disk.
		 *
		 * Shared so the hash Cache stores is taken from exactly the file that
		 * gets uploaded, not a second guess at where it lives.
		 *
		 * @return string
		 */
		public static function worker_template_path() {
			return __DIR__ . '/worker-template.js';
		}

		/**
		 * Get worker script for caching.
		 *
		 * Reads worker-template.js and injects the deploy-time default config.
		 * Runtime config is read from KV by the Worker itself; these defaults
		 * are the fallback used until (or unless) KV is bound.
		 *
		 * Every key the Worker reads has to be baked here, or the Worker falls
		 * back to its own literal default whenever KV is unreadable - which is
		 * exactly the moment the defaults matter. `refresh_token` is the one
		 * deliberate omission: with no token baked in, the refresh path stays
		 * shut unless KV config says otherwise, which is the safe direction.
		 *
		 * @param array $options Configuration options.
		 * @return string Worker script content.
		 */
		public function get_worker_script( $options = array() ) {
			$config = array(
				'kill'            => ! empty( $options['kill'] ),
				'edge_ttl'        => isset( $options['edge_ttl'] ) ? (int) $options['edge_ttl'] : 3600,
				'bypass_patterns' => isset( $options['bypass_patterns'] )
					? array_values( $options['bypass_patterns'] )
					: array( '/wp-admin', '/wp-json', '/wp-login', '/checkout', '/cart' ),
				'bypass_cookies'  => isset( $options['bypass_cookies'] )
					? array_values( $options['bypass_cookies'] )
					: array( 'wordpress_logged_in_' ),
				'exclude_urls'    => isset( $options['exclude_urls'] )
					? array_values( $options['exclude_urls'] )
					: array(),

				// L2 keys are namespaced by generation. Leaving this out meant
				// the Worker fell back to generation 0 while the plugin wrote
				// under 1, so an unreadable KV config turned into a silent,
				// total L2 miss instead of a degraded but working cache.
				'kv_pages'        => ! empty( $options['kv_pages'] ),
				'generation'      => isset( $options['generation'] ) ? (int) $options['generation'] : 1,
			);

			$template = file_get_contents( self::worker_template_path() ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- Local plugin file, not a remote request.

			return str_replace(
				'__TD_SPA_CONFIG__',
				wp_json_encode( $config ),
				$template
			);
		}
	}
}
