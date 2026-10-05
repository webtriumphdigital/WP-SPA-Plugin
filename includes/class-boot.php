<?php
/**
 * TD SPA Boot Loader Class.
 *
 * @package TD SPA
 * @since 1.3.0
 */
// Namespace.
namespace TDSPA;

// Exit if access directly.
defined( 'ABSPATH' ) || die( 'Uhu, we don\'t do this here' );

if ( ! class_exists( __NAMESPACE__ . '\Boot') ) {

	/**
	 * TD SPA Boot Loader Class.
	 */
	class Boot {

		/**
		 * Start the plugin
		 *
		 * @return void
		 */
		public static function start() {
			$self = new self();
			$self->constants();
			$self->includes();
		}

		/**
		 * Define plugin constants.
		 *
		 * @return void
		 */
		private function constants() {
			define('TD_SPA_URL', plugin_dir_url( TD_SPA ));
			define('TD_SPA_PATH', plugin_dir_path( TD_SPA ));
			define('TD_SPA_INCLUDES', TD_SPA_PATH . '/includes/');
			define('TD_SPA_PREFIX', 'td_spa_');
		}

		/**
		 * Include plugin files.
		 *
		 * @return void
		 */
		private function includes() {
			$this->include_common_files();
			$this->include_admin_files();
		}

		/**
		 * Include common files.
		 *
		 * @return void.
		 */
		private function include_common_files() {
			// For everyone.
			require_once TD_SPA_INCLUDES . 'common/abstract-class-base.php';
			require_once TD_SPA_INCLUDES . 'common/class-options.php';

			// Update detection. Loaded for everyone, not just admin, because
			// the version check runs on admin_init and the hooks that listen
			// to it are registered on the front end too.
			require_once TD_SPA_INCLUDES . 'classes/class-upgrade.php';

			// Cloudflare cache (always load for auto-purge hooks).
			require_once TD_SPA_INCLUDES . 'cloudflare/class-cloudflare-api.php';
			require_once TD_SPA_INCLUDES . 'cloudflare/class-cloudflare-oauth.php';
			require_once TD_SPA_INCLUDES . 'cloudflare/class-cloudflare-cache.php';
			require_once TD_SPA_INCLUDES . 'cloudflare/class-cloudflare-hooks.php';

			// For only frontend.
			if ( ! is_admin() ) {
				require_once TD_SPA_INCLUDES . 'classes/class-enqueues.php';
				require_once TD_SPA_INCLUDES . 'classes/class-templates.php';
			}
		}

		/**
		 * Include admin files.
		 *
		 * @return void.
		 */
		private function include_admin_files() {
			if ( is_admin() ) {
				require_once TD_SPA_INCLUDES . 'admin/class-admin-enqueues.php';
				require_once TD_SPA_INCLUDES . 'admin/class-admin-hooks.php';
				require_once TD_SPA_INCLUDES . 'admin/class-rating-prompt.php';
				// Deactivation feedback now uses the PackEdge SDK modal
				// (assets/js/packedge.js, wired in td-spa.php), not this
				// plugin's old custom modal.
			}

			require_once TD_SPA_INCLUDES . 'admin/class-admin-rest.php';
		}
	}

	// Let's start dude.
	Boot::start();
}
