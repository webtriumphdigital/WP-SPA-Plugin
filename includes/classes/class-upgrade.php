<?php
/**
 * Plugin update detection.
 *
 * @package TD SPA
 * @since 2.6.0
 */

namespace TDSPA;

defined( 'ABSPATH' ) || die();

if ( ! class_exists( __NAMESPACE__ . '\Upgrade' ) ) {

	/**
	 * Notices when the plugin files on disk stop matching the version the
	 * database last saw, and tells the rest of the plugin about it.
	 *
	 * WordPress has no reliable "the plugin was updated" hook.
	 * `upgrader_process_complete` only fires for updates that went through the
	 * updater, which misses FTP uploads, WP-CLI, git checkouts and rollbacks -
	 * and rollbacks matter as much as upgrades, because going back to an older
	 * build should put the older edge Worker back too.
	 *
	 * Comparing a stored version against the constant catches all of them, on
	 * the first admin page load after the files change.
	 */
	class Upgrade extends Base {

		/**
		 * Option holding the version the database was last seen at.
		 */
		const VERSION_OPTION = 'td_spa_version';

		/**
		 * Register actions.
		 */
		public function actions() {
			add_action( 'admin_init', array( $this, 'check' ) );

			// Fast path only. Runs in the same request as an updater-driven
			// update so the work starts a page load earlier, but nothing
			// depends on it firing.
			add_action( 'upgrader_process_complete', array( $this, 'check' ) );
		}

		/**
		 * Compare the stored version against this build and announce a change.
		 *
		 * @return void
		 */
		public function check() {
			$stored = (string) get_option( self::VERSION_OPTION, '' );

			if ( TD_SPA_VERSION === $stored ) {
				return;
			}

			// Written before the action fires, so a listener that throws or
			// times out cannot leave this running on every admin request.
			update_option( self::VERSION_OPTION, TD_SPA_VERSION );

			/**
			 * The plugin files changed version.
			 *
			 * Fires for upgrades, downgrades and first run alike. An empty
			 * $from means the option was never set: either a fresh install or
			 * a site upgrading from before this option existed.
			 *
			 * @param string $from Previously stored version, '' if none.
			 * @param string $to   Version now on disk.
			 */
			do_action( 'td_spa_upgraded', $stored, TD_SPA_VERSION );
		}
	}

	Upgrade::start();
}
