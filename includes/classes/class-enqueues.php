<?php
/**
 * TD SPA Enqueues.
 *
 * @package TD SPA
 * @since 2.0.0
 */
// Namespace.
namespace TDSPA;

// Exit if access directly.
defined( 'ABSPATH' ) || die( 'Uhu, we don\'t do this here' );

if ( ! class_exists( __NAMESPACE__ . '\Enqueues' ) ) {
	/**
	 * TD SPA Enqueues.
	 */
	class Enqueues extends \TDSPA\Base {
        /**
		 * Register actions.
		 */
		public function actions() {
			add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_scripts' ) );
			add_action( 'login_enqueue_scripts', array( $this, 'enqueue_login_scripts' ) );
			add_action( 'wp_footer', array( $this, 'dequeue_conflicting_script_modules' ), 0 );
		}

		/**
		 * Disable WordPress's own client-side navigation modules when TD SPA
		 * is providing SPA navigation.
		 *
		 * Block themes ship the Interactivity API router and the Navigation
		 * block's view module, which implement their own client-side routing.
		 * Running inside the TD SPA navigation iframe, these hijack the
		 * browser's Back button into a full top-level reload - destroying the
		 * shell and any persistent media. They are redundant under TD SPA
		 * (TD SPA is the navigator), so we dequeue them. The interactivity
		 * runtime itself (@wordpress/interactivity) is left intact so block
		 * interactivity that does not navigate (lightbox, etc.) keeps working.
		 *
		 * Hooked late on wp_footer (priority 0) so block render has already
		 * enqueued the modules but WordPress has not yet printed them. Opt out
		 * with the `td_spa_keep_block_navigation` filter.
		 *
		 * @return void
		 */
		public function dequeue_conflicting_script_modules() {
			if ( ! function_exists( 'wp_dequeue_script_module' ) ) {
				return;
			}

			if ( $this->is_bot() ) {
				return;
			}

			$options  = new \TDSPA\Options();
			$settings = $options->get_settings();

			if ( ! empty( $settings['disable_for_admins'] ) && current_user_can( 'manage_options' ) ) {
				return;
			}

			if ( ! apply_filters( 'td_spa_navigation', true ) ) {
				return;
			}

			if ( apply_filters( 'td_spa_keep_block_navigation', false ) ) {
				return;
			}

			wp_dequeue_script_module( '@wordpress/block-library/navigation/view' );
			wp_dequeue_script_module( '@wordpress/block-library/query/view' );
			wp_dequeue_script_module( '@wordpress/interactivity-router' );
		}

		/**
		 * Enqueue frontend scripts.
		 *
		 * @return void
		 */
		public function enqueue_scripts() {
			// Skip for bots/crawlers.
			if ( $this->is_bot() ) {
				return;
			}

			$options  = new \TDSPA\Options();
			$settings = $options->get_settings();

			// Skip SPA for logged-in admins if setting is enabled.
			if ( ! empty( $settings['disable_for_admins'] ) && current_user_can( 'manage_options' ) ) {
				return;
			}

			wp_enqueue_style( 'td-spa', TD_SPA_URL . 'public/css/td-spa.min.css', array(), TD_SPA_VERSION );

			// Inline CSS.
			$inline_css = $this->get_inline_css();
			wp_add_inline_style( 'td-spa', $inline_css );

			wp_enqueue_script( 'td-spa', TD_SPA_URL . 'public/js/td-spa.min.js', array(), TD_SPA_VERSION, true );

			// Inline script.
			$inline_script = $this->get_inline_script();
			wp_localize_script( 'td-spa', 'td_spa_vars', $inline_script );
		}

		/**
		 * Enqueue the SPA on wp-login.php.
		 *
		 * The wp_enqueue_scripts hook does not fire on wp-login.php, so without
		 * this the login screen is the one place on the site that never gets
		 * TD SPA and always hard-reloads. Loading the same bundle makes it a
		 * normal SPA page: the form posts through the navigation iframe, and a
		 * failed attempt re-renders without a reload.
		 *
		 * Opt out with the `td_spa_ajax_login` filter, or by turning on the
		 * full page reload setting for auth forms.
		 *
		 * @return bool
		 */
		public function enqueue_login_scripts() {
			if ( $this->is_bot() ) {
				return false;
			}

			// The interim-login / auth-check modal loads wp-login.php inside a
			// small iframe in wp-admin. Wrapping that in the SPA (and
			// intercepting its submit) breaks the modal's own flow - it must
			// stay plain WordPress.
			if ( isset( $_GET['interim-login'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
				return false;
			}

			$options  = new \TDSPA\Options();
			$settings = $options->get_settings();

			// Master SPA switch also governs the login screen.
			if ( empty( $settings['enable_navigation'] ) ) {
				return false;
			}

			// Respect the opt-in full page reload for auth forms.
			if ( ! empty( $settings['bypass_auth_forms'] ) ) {
				return false;
			}

			if ( ! apply_filters( 'td_spa_ajax_login', true ) ) {
				return false;
			}

			wp_enqueue_style( 'td-spa', TD_SPA_URL . 'public/css/td-spa.min.css', array(), TD_SPA_VERSION );
			wp_add_inline_style( 'td-spa', $this->get_inline_css() );

			wp_enqueue_script( 'td-spa', TD_SPA_URL . 'public/js/td-spa.min.js', array(), TD_SPA_VERSION, true );
			wp_localize_script( 'td-spa', 'td_spa_vars', $this->get_inline_script() );

			return true;
		}

		/**
		 * Get Inline Script.
		 *
		 * @return array
		 */
		public function get_inline_script() {
			$options = new \TDSPA\Options();
			$license = get_option( 'td_spa_license', [] );
			$settings = $options->get_settings();

			// The frontend only ever needs a validity flag. The full license
			// record (key, plan, activation counts) stays admin-side: anyone
			// can read frontend page source, and a leaked key can consume the
			// customer's activation seats.
			$is_license_active = ! empty( $license['key'] ) && 'active' === ( isset( $license['status'] ) ? $license['status'] : '' );

			$script = array(
				'rest' => array(
					'url' => rest_url('td-spa'),
					'nonce' => wp_create_nonce('wp_rest'),
				),

				'site' => array(
					'url' => get_site_url(),
					'name' => get_bloginfo('name'),
					'language' => get_bloginfo('language'),
				),

				'plugin' => array(
					'url' => plugin_dir_url(TD_SPA),
					'version' => TD_SPA_VERSION,
				),

				'settings' => $settings,
				'navigation' => apply_filters( 'td_spa_navigation', true ),
				'user_logged_in' => is_user_logged_in(),
				'license' => array(
					'valid' => $is_license_active,
				),
				'debug' => defined( 'WP_DEBUG' ) && WP_DEBUG,
			);

			return $script;
		}

		/**
		 * Get Inline CSS.
		 *
		 * @return string
		 */
		public function get_inline_css() {
			$settings = Options::get_instance()->get_settings();

			$cursor_mode        = isset( $settings['cursor_mode'] ) ? $settings['cursor_mode'] : 'auto';
			$animation_duration = floatval( isset( $settings['content_animation_duration'] ) ? $settings['content_animation_duration'] : 0.3 );

			$css = wp_sprintf( '
			:root {
				--td-spa-cursor-mode: %s;
				--td-spa-animation-duration: %ss;
			}', $cursor_mode, $animation_duration );

			// Content animations.
			$css .= '
			.td-spa-animate-fade {
				animation: td-spa-fade var(--td-spa-animation-duration) ease-in;
			}
			.td-spa-animate-slide-up {
				animation: td-spa-slide-up var(--td-spa-animation-duration) ease-out;
			}
			.td-spa-animate-slide-down {
				animation: td-spa-slide-down var(--td-spa-animation-duration) ease-out;
			}

			@keyframes td-spa-fade {
				from { opacity: 0; }
				to { opacity: 1; }
			}
			@keyframes td-spa-slide-up {
				from { transform: translateY(30px); opacity: 0; }
				to { transform: translateY(0); opacity: 1; }
			}
			@keyframes td-spa-slide-down {
				from { transform: translateY(-30px); opacity: 0; }
				to { transform: translateY(0); opacity: 1; }
			}

			.td-spa-animate-cursor {
				cursor: var(--td-spa-cursor-mode) !important;
			}
			.td-spa-animate-cursor * {
				cursor: var(--td-spa-cursor-mode) !important;
			}
			';

			return apply_filters( 'td_spa_inline_css', $css );
		}

		/**
		 * Check if current request is from a bot/crawler.
		 *
		 * @return bool
		 */
		private function is_bot() {
			if ( empty( $_SERVER['HTTP_USER_AGENT'] ) ) {
				return false;
			}

			$ua = strtolower( sanitize_text_field( wp_unslash( $_SERVER['HTTP_USER_AGENT'] ) ) );

			$bots = array(
				'googlebot',
				'bingbot',
				'slurp',
				'duckduckbot',
				'baiduspider',
				'yandexbot',
				'facebookexternalhit',
				'linkedinbot',
				'twitterbot',
				'applebot',
				'semrushbot',
				'ahrefsbot',
				'mj12bot',
				'dotbot',
				'petalbot',
				'bytespider',
			);

			foreach ( $bots as $bot ) {
				if ( strpos( $ua, $bot ) !== false ) {
					return true;
				}
			}

			return false;
		}
	}

	// Start.
	Enqueues::start();
}
