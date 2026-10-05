<?php

/**
 * Admin Assets Class for TD SPA
 * Handles all admin assets and scripts.
 *
 * @package TD SPA
 * @since 2.0.0
 */
// Namespace.
namespace TDSPA\Admin;

// Exit if access directly.
defined('ABSPATH') || die('Uhu, we don\'t do this here');

if ( ! class_exists(__NAMESPACE__ . '\Enqueues') ) {
	/**
	 * Admin Assets Class for TD SPA
	 * Handles all admin assets and scripts.
	 */
	class Enqueues extends \TDSPA\Base {


		/**
		 * Actions
		 */
		public function actions() {
			add_action('admin_enqueue_scripts', array( $this, 'enqueue_scripts' ));
			add_action('admin_enqueue_scripts', array( $this, 'enqueue_admin_spa' ));
		}

		/**
		 * Enqueue Admin SPA scripts on all admin pages.
		 *
		 * @return bool
		 */
		public function enqueue_admin_spa() {
			$options  = new \TDSPA\Options();
			$settings = $options->get_settings();

			// Only load if admin SPA is enabled.
			if ( empty( $settings['enable_admin_spa'] ) ) {
				return false;
			}

			wp_enqueue_style( 'td-spa', TD_SPA_URL . 'public/css/td-spa.min.css', array(), TD_SPA_VERSION );
			wp_enqueue_script( 'td-spa', TD_SPA_URL . 'public/js/td-spa.min.js', array(), TD_SPA_VERSION, true );

			// Pass settings to script.
			wp_localize_script( 'td-spa', 'td_spa_vars', $this->get_admin_spa_vars( $settings ) );

			return true;
		}

		/**
		 * Get Admin SPA variables for localization.
		 *
		 * @param array $settings Plugin settings.
		 * @return array
		 */
		private function get_admin_spa_vars( $settings ) {
			return array(
				'settings'  => $settings,
				'is_admin'  => true,
				'admin_url' => admin_url(),
			);
		}

		/**
		 * Enqueue admin scripts.
         *
		 * @param string $screen Current screen.
		 * @return bool
		 */
		public function enqueue_scripts( $screen ) {

			// Load menu icon on all admin pages (needed for sidebar menu).
			$this->load_menu_icon();

			// Early return if not on plugin's admin page (prevents loading heavy data).
			if ( 'toplevel_page_td-spa' !== $screen && 'settings_page_td-spa' !== $screen ) {
				return false;
			}

			wp_enqueue_media();

			// Enqueue code editor for syntax highlighting
			wp_enqueue_code_editor(array(
				'type' => 'text/javascript',
				'codemirror' => array(
					'mode' => 'javascript',
					'lineNumbers' => true,
					'indentUnit' => 2,
					'tabSize' => 2,
				),
			));

			wp_enqueue_style('td-spa-admin', TD_SPA_URL . 'public/css/admin.min.css', array(), TD_SPA_VERSION);
			wp_enqueue_script('td-spa-admin', TD_SPA_URL . 'public/js/admin.min.js', array(), TD_SPA_VERSION, true);

			// Inline CSS.
			$inline_css = $this->get_inline_css();
			wp_add_inline_style('td-spa-admin', $inline_css);

			// Inline script.
			$inline_script = $this->get_inline_script();
			wp_localize_script('td-spa-admin', 'td_spa_admin_vars', $inline_script);

			do_action('td_spa_loaded');

			return true;
		}

		/**
		 * Load TD SPA menu icon.
		 *
		 * @return void
		 */
		public function load_menu_icon() {
			$css = '.wp-menu-image.dashicons-td-spa {
				position: relative;
				transform: rotate(45deg);
				}
			.wp-menu-image.dashicons-td-spa:after  {
				content: "";
				position: absolute;
				left: 0;
				top: 50%;
				transform: translateY(-50%);
				background: url(' . TD_SPA_URL . '/public/images/logo.gif) no-repeat center center;
				background-size: 80%;
				width:  36px;
    			height: 34px;
			}';

			wp_enqueue_style('td_spa_menu_icon', esc_url(TD_SPA_URL) . '/public/css/blank.css', array(), TD_SPA_VERSION);
			wp_add_inline_style('td_spa_menu_icon', $css);
		}


		/**
		 * Get Inline CSS.
		 *
		 * @return string
		 */
		public function get_inline_css() {
			$css = '#wpcontent {
				padding-left: 0 !important;
			}';

			return $css;
		}

		/**
		 * Get server information.
		 *
		 * @return array
		 */
		private function get_server_info() {
			global $wpdb;

			$server_software = isset( $_SERVER['SERVER_SOFTWARE'] ) ? sanitize_text_field( wp_unslash( $_SERVER['SERVER_SOFTWARE'] ) ) : 'N/A';
			$platform        = 'N/A';

			if ( stripos( $server_software, 'nginx' ) !== false ) {
				$platform = 'nginx';
			} elseif ( stripos( $server_software, 'apache' ) !== false ) {
				$platform = 'apache';
			} elseif ( stripos( $server_software, 'litespeed' ) !== false ) {
				$platform = 'litespeed';
			} elseif ( stripos( $server_software, 'iis' ) !== false ) {
				$platform = 'iis';
			} elseif ( 'N/A' !== $server_software ) {
				$platform = $server_software;
			}

			return array(
				'php_version'     => phpversion(),
				'mysql_version'   => $wpdb->db_version(),
				'server_platform' => $platform,
				'server_os'       => function_exists( 'php_uname' ) ? php_uname( 's' ) : PHP_OS,
				'server_software' => $server_software,
			);
		}

		/**
		 * Get Inline Script.
		 *
		 * @return array
		 */
		public function get_inline_script() {
			$options = new \TDSPA\Options();

			$script = array(
				'rest' => array(
					'url' => rest_url('td-spa'),
					'nonce' => wp_create_nonce('wp_rest'),
				),

				'site' => array(
					'url' => get_site_url(),
					'name' => get_bloginfo('name'),
					'language' => get_bloginfo('language'),
					'admin_email' => get_bloginfo('admin_email'),
					'active_plugins' => get_option('active_plugins', array()),
					'active_theme' => get_option('template', ''),
					'is_multisite' => is_multisite(),
					'wp_version' => get_bloginfo('version'),
					'timezone' => wp_timezone_string(),
				),
				'plugin' => array(
					'url' => plugin_dir_url(TD_SPA),
					'version' => TD_SPA_VERSION,
				),
				'server_info' => $this->get_server_info(),

				// WordPress 7.0 ships its own admin navigation, which makes the
				// plugin's Admin SPA redundant (and a second navigator running
				// alongside it is asking for conflicts). The settings screen
				// uses this to recommend leaving it off on 7.0+, and to
				// promote it on older versions where it is the only option.
				'wp' => array(
					'version'              => get_bloginfo( 'version' ),
					'has_native_admin_spa' => version_compare( get_bloginfo( 'version' ), '7.0', '>=' ),
				),

				'strings' => array(),
				'default_settings' => $options->get_default_settings(),
				'settings' => $options->get_settings(),



				// CF status from options (no API call).
				'cf_status' => array(
					'enabled'           => (bool) get_option( 'td_spa_cf_cache_enabled', false ),
					'connected'         => ! empty( get_option( 'td_spa_cf_zone_id', '' ) ) && ! empty( get_option( 'td_spa_cf_route_id', '' ) ),
					'zone_name'         => get_option( 'td_spa_cf_zone_name', '' ),
					'route_pattern'     => get_option( 'td_spa_cf_route_pattern', '' ),
					'auto_purge'        => (bool) get_option( 'td_spa_cf_auto_purge', true ),
					'kv_connected'      => ! empty( get_option( 'td_spa_cf_kv_namespace_id', '' ) ),
					'paused'            => (bool) get_option( 'td_spa_cf_kill', false ),
					'oauth_configured'  => class_exists( '\TDSPA\Cloudflare\OAuth' ) && ( new \TDSPA\Cloudflare\OAuth() )->is_configured(),
					'account_connected' => class_exists( '\TDSPA\Cloudflare\Cache' ) && '' !== \TDSPA\Cloudflare\Cache::auth_method(),
					'auth_method'       => class_exists( '\TDSPA\Cloudflare\Cache' ) ? \TDSPA\Cloudflare\Cache::auth_method() : '',
					'cached_pages'      => count( (array) get_option( 'td_spa_cf_page_versions', array() ) ),
					'last_synced_human' => class_exists( '\TDSPA\Cloudflare\Cache' ) ? \TDSPA\Cloudflare\Cache::last_synced_human() : '',
				),
			);

			return $script;
		}
	}

	// Let's start.
	Enqueues::start();
}
