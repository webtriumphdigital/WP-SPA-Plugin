<?php
/**
 * Cloudflare OAuth2 client (public / PKCE).
 *
 * One-click connect. The plugin runs a PKCE authorization-code flow via a
 * stateless relay - a dedicated Cloudflare Worker whose `/callback` URL is the
 * one thing registered on the OAuth client, since Cloudflare needs a fixed
 * redirect URI and every install has a different wp-admin URL. The relay only
 * performs the authorize redirect and hands the auth code back to this site;
 * it never sees the PKCE verifier or any token. This site then exchanges the
 * code directly at Cloudflare's token endpoint; being a public client, no
 * secret is involved.
 *
 * Relay source and deployment live outside this plugin, in the
 * td-spa-oauth-relay project.
 *
 * The connection endpoints (client id, token endpoint, scopes, relay base,
 * redirect URI) are supplied through the `td_spa_cf_oauth_config` filter
 * rather than hard-coded, so the flow stays dormant and fails safe until the
 * OAuth client is registered and the relay deployed. Until then only the
 * API-token paste path is offered.
 *
 * @package TD SPA
 * @since 2.4.0
 */

namespace TDSPA\Cloudflare;

defined( 'ABSPATH' ) || die();

if ( ! class_exists( __NAMESPACE__ . '\OAuth' ) ) {

	/**
	 * Cloudflare OAuth2 client.
	 */
	class OAuth {

		/**
		 * Transient prefix for pending PKCE flows.
		 */
		const STATE_PREFIX = 'td_spa_cf_oauth_';

		/**
		 * Option holding the encrypted token bundle.
		 */
		const TOKEN_OPTION = 'td_spa_cf_oauth';

		/**
		 * API instance (used for encrypt/decrypt only).
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
		 * Connection config, supplied by the vendor via filter.
		 *
		 * @return array{client_id:string,token_endpoint:string,scopes:string,relay_base:string,redirect_uri:string}
		 */
		public function config() {
			$relay = 'https://ajaxpress-oauth.astory.workers.dev';

			return apply_filters( 'td_spa_cf_oauth_config', array(
				// Public PKCE client registered against the relay's /callback.
				// Not a secret - that is the point of a public client - so it
				// ships as a default and one-click works on every install.
				'client_id'      => 'f8f599a4d795d4e8e51118e469dc9001',

				// From Cloudflare's OpenID discovery document:
				// https://dash.cloudflare.com/.well-known/openid-configuration
				'token_endpoint' => 'https://dash.cloudflare.com/oauth2/token',

				// Cloudflare's OAuth scope identifiers are dot/hyphen style
				// (workers-scripts.write), not the colon style wrangler prints
				// for API tokens (workers_scripts:write). These must match the
				// scopes ticked on the registered client or the authorize
				// request is rejected with invalid_scope.
				//
				// invalid_scope fails the whole authorize step, so a wrong
				// entry here does not degrade one feature - it breaks connect
				// outright, edge caching included. Nothing goes in this string
				// that has not been read off the client registration screen
				// and confirmed through a real connect.
				//
				// The AI work (2.7.0+) needs Vectorize, D1 and Workers AI
				// scopes added here. Widening early is deliberate, so tokens
				// accumulate the capability quietly and existing sites do not
				// all need a reconnect later - but it waits on those exact
				// identifiers, which are not published anywhere public.
				'scopes'         => 'workers-kv-storage.read workers-kv-storage.write workers-routes.read workers-routes.write workers-scripts.read workers-scripts.write zone.read cache.purge user-details.read',

				// Deployed relay Worker. Its /callback is the single redirect
				// URI registered on the OAuth client.
				'relay_base'     => $relay,
				'redirect_uri'   => $relay . '/callback',
			) );
		}

		/**
		 * Whether OAuth is configured and can be offered.
		 *
		 * All four are required: without the relay we have nowhere to send the
		 * user, and without the redirect URI the token exchange cannot match
		 * what was registered.
		 *
		 * @return bool
		 */
		public function is_configured() {
			$config = $this->config();
			return ! empty( $config['client_id'] )
				&& ! empty( $config['token_endpoint'] )
				&& ! empty( $config['relay_base'] )
				&& ! empty( $config['redirect_uri'] );
		}

		/**
		 * Whether we currently hold OAuth tokens.
		 *
		 * @return bool
		 */
		public function is_connected() {
			$tokens = $this->get_tokens();
			return ! empty( $tokens['access_token'] );
		}

		/**
		 * Generate a PKCE verifier + S256 challenge pair.
		 *
		 * @return array{verifier:string,challenge:string}
		 */
		public function generate_pkce() {
			$verifier  = self::base64url( random_bytes( 32 ) );
			$challenge = self::base64url( hash( 'sha256', $verifier, true ) );
			return array(
				'verifier'  => $verifier,
				'challenge' => $challenge,
			);
		}

		/**
		 * Begin a flow: stash the verifier and return the relay start URL.
		 *
		 * @param string $return_url Where the relay should send the user back.
		 * @return string|WP_Error
		 */
		public function start( $return_url ) {
			if ( ! $this->is_configured() ) {
				return new \WP_Error( 'cf_oauth_unconfigured', __( 'Cloudflare OAuth is not available. Use an API token instead.', 'td-spa' ) );
			}

			$config = $this->config();
			$pkce   = $this->generate_pkce();
			$state  = self::base64url( random_bytes( 24 ) );

			set_transient(
				self::STATE_PREFIX . $state,
				array(
					'verifier' => $pkce['verifier'],
					'return'   => $return_url,
				),
				15 * MINUTE_IN_SECONDS
			);

			return $config['relay_base'] . '/start?' . http_build_query( array(
				'state'          => $state,
				'code_challenge' => $pkce['challenge'],
				'return'         => $return_url,
				'site'           => home_url(),
				'scope'          => $config['scopes'],
			) );
		}

		/**
		 * Exchange an authorization code (handed back by the relay) for tokens.
		 *
		 * @param string $code  Authorization code.
		 * @param string $state State value from the start step.
		 * @return true|WP_Error
		 */
		public function exchange( $code, $state ) {
			if ( ! $this->is_configured() ) {
				return new \WP_Error( 'cf_oauth_unconfigured', __( 'Cloudflare OAuth is not available.', 'td-spa' ) );
			}

			$pending = get_transient( self::STATE_PREFIX . $state );
			if ( empty( $pending['verifier'] ) ) {
				return new \WP_Error( 'cf_oauth_state', __( 'Login session expired. Please try connecting again.', 'td-spa' ) );
			}
			delete_transient( self::STATE_PREFIX . $state );

			$config = $this->config();
			$result = $this->token_request( array(
				'grant_type'    => 'authorization_code',
				'code'          => $code,
				'redirect_uri'  => $config['redirect_uri'],
				'client_id'     => $config['client_id'],
				'code_verifier' => $pending['verifier'],
			) );

			return is_wp_error( $result ) ? $result : true;
		}

		/**
		 * Return a valid access token, refreshing if it is about to expire.
		 *
		 * @return string|WP_Error
		 */
		public function get_access_token() {
			$tokens = $this->get_tokens();
			if ( empty( $tokens['access_token'] ) ) {
				return new \WP_Error( 'cf_oauth_none', __( 'Not connected via OAuth.', 'td-spa' ) );
			}

			$expires_at = isset( $tokens['expires_at'] ) ? (int) $tokens['expires_at'] : 0;
			if ( $expires_at > time() + 60 ) {
				return $tokens['access_token'];
			}

			if ( empty( $tokens['refresh_token'] ) ) {
				return $tokens['access_token'];
			}

			$refreshed = $this->refresh( $tokens['refresh_token'] );
			if ( is_wp_error( $refreshed ) ) {
				return $refreshed;
			}

			$tokens = $this->get_tokens();
			return isset( $tokens['access_token'] ) ? $tokens['access_token'] : '';
		}

		/**
		 * Refresh the access token.
		 *
		 * @param string $refresh_token Refresh token.
		 * @return true|WP_Error
		 */
		public function refresh( $refresh_token ) {
			$config = $this->config();
			$result = $this->token_request( array(
				'grant_type'    => 'refresh_token',
				'refresh_token' => $refresh_token,
				'client_id'     => $config['client_id'],
			) );

			return is_wp_error( $result ) ? $result : true;
		}

		/**
		 * Disconnect: drop stored tokens.
		 */
		public function disconnect() {
			delete_option( self::TOKEN_OPTION );
		}

		/**
		 * POST to the token endpoint and persist the resulting tokens.
		 *
		 * @param array $body Form body.
		 * @return array|WP_Error Parsed token response.
		 */
		private function token_request( $body ) {
			$config = $this->config();

			$response = wp_remote_post( $config['token_endpoint'], array(
				'timeout' => 30,
				'headers' => array(
					'Content-Type' => 'application/x-www-form-urlencoded',
					'Accept'       => 'application/json',
				),
				'body'    => $body,
			) );

			if ( is_wp_error( $response ) ) {
				return $response;
			}

			$code = wp_remote_retrieve_response_code( $response );
			$data = json_decode( wp_remote_retrieve_body( $response ), true );

			if ( $code >= 400 || empty( $data['access_token'] ) ) {
				$msg = isset( $data['error_description'] ) ? $data['error_description'] : __( 'Token request failed.', 'td-spa' );
				return new \WP_Error( 'cf_oauth_token', $msg );
			}

			$this->store_tokens( $data );
			return $data;
		}

		/**
		 * Persist tokens (encrypted), preserving the refresh token on refresh.
		 *
		 * @param array $data Token endpoint response.
		 */
		private function store_tokens( $data ) {
			$existing = $this->get_tokens();

			$tokens = array(
				'access_token'  => $data['access_token'],
				'refresh_token' => ! empty( $data['refresh_token'] )
					? $data['refresh_token']
					: ( isset( $existing['refresh_token'] ) ? $existing['refresh_token'] : '' ),
				'expires_at'    => time() + ( isset( $data['expires_in'] ) ? (int) $data['expires_in'] : 3600 ),

				// What was actually granted, which is not always what was
				// asked for: a token issued before a scope was added to the
				// client will not carry it. Storing it means a feature can
				// check before calling, instead of discovering the gap as a
				// mid-operation 403. Carried over on refresh, where the
				// response often omits it.
				'scope'         => ! empty( $data['scope'] )
					? (string) $data['scope']
					: ( isset( $existing['scope'] ) ? $existing['scope'] : '' ),
			);

			update_option(
				self::TOKEN_OPTION,
				$this->api->encrypt_token( wp_json_encode( $tokens ) )
			);
		}

		/**
		 * Scopes the stored token actually carries.
		 *
		 * Empty means either no connection or a token issued before scopes
		 * were recorded, so callers must treat empty as "cannot tell" rather
		 * than "nothing granted".
		 *
		 * @return array
		 */
		public function granted_scopes() {
			$tokens = $this->get_tokens();

			if ( empty( $tokens['scope'] ) ) {
				return array();
			}

			return array_values( array_filter( preg_split( '/\s+/', trim( $tokens['scope'] ) ) ) );
		}

		/**
		 * Whether the stored token carries a scope.
		 *
		 * An unknown scope set answers false. A feature that needs a scope
		 * should prompt for a reconnect rather than assume it is there.
		 *
		 * @param string $scope Scope identifier.
		 * @return bool
		 */
		public function has_scope( $scope ) {
			return in_array( $scope, $this->granted_scopes(), true );
		}

		/**
		 * Scopes this build asks for that the stored token does not carry.
		 *
		 * Empty when nothing is missing, or when the token predates scope
		 * recording and there is nothing to compare against.
		 *
		 * @return array
		 */
		public function missing_scopes() {
			$granted = $this->granted_scopes();

			if ( empty( $granted ) ) {
				return array();
			}

			$config = $this->config();
			$wanted = array_values( array_filter( preg_split( '/\s+/', trim( $config['scopes'] ) ) ) );

			return array_values( array_diff( $wanted, $granted ) );
		}

		/**
		 * Read and decrypt stored tokens.
		 *
		 * @return array
		 */
		private function get_tokens() {
			$encrypted = get_option( self::TOKEN_OPTION, '' );
			if ( empty( $encrypted ) ) {
				return array();
			}
			$json = $this->api->decrypt_token( $encrypted );
			$data = json_decode( $json, true );
			return is_array( $data ) ? $data : array();
		}

		/**
		 * URL-safe base64 without padding (RFC 7636).
		 *
		 * @param string $bin Raw bytes.
		 * @return string
		 */
		private static function base64url( $bin ) {
			return rtrim( strtr( base64_encode( $bin ), '+/', '-_' ), '=' );
		}
	}
}
