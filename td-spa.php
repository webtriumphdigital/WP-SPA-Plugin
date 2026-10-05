<?php
/**
 * Plugin Name:       TD SPA
 * Plugin URI:        https://www.triumphdigital.co.th
 * Description:       Instant page loads with zero reload. AJAX navigation, persistent audio/video players, and prefetch. Only 14KB frontend footprint. Perfect for radio, podcast, and media sites.
 * Version:           0.1.0
 * Requires at least: 5.3
 * Requires PHP:      7.1
 * Author:            Triumph Digital
 * Author URI:        https://www.triumphdigital.co.th
 * License:           GPLv3
 * License URI:       https://www.gnu.org/licenses/gpl-3.0.html
 * Text Domain:       td-spa
 *
 * @package           TD SPA
 **/

// Exit if access directly.
defined(  'ABSPATH' ) || die( 'Uhu, we don\'t do this here' );

if ( defined('TD_SPA') ) {
	return;
}

// Define file constants.
define( 'TD_SPA', __FILE__ );
define( 'TD_SPA_VERSION', '0.1.0' );

// Require the boot loader.
require_once __DIR__ . '/includes/class-boot.php';
/**
 * Plugin activation hook.
 * Reset diagnostic permission on activation.
 *
 * @return void
 */
function td_spa_plugin_activation() {
	delete_option( 'td_spa_diagnostic_permission' );



	// Reset tour state for all users on activation.
	delete_metadata( 'user', 0, 'td_spa_tour_completed', '', true );
	delete_metadata( 'user', 0, 'td_spa_tour_mode', '', true );
	delete_metadata( 'user', 0, 'td_spa_tour_dismissed_at', '', true );
}
register_activation_hook( TD_SPA, 'td_spa_plugin_activation' );

