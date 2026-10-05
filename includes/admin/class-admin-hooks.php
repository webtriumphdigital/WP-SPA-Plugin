<?php

/**
 * Admin Hooks for TD SPA
 *
 * @package TD SPA
 * @since 2.0.0
 */
// Namespace.
namespace TDSPA\Admin;

// Exit if access directly.
defined('ABSPATH') || die('Uhu, we don\'t do this here');

/**
 * Admin Hooks for TD SPA
 */
class Hooks extends \TDSPA\Base {


	/**
	 * Register actions.
	 */
	public function actions() {
		add_action('admin_menu', array( $this, 'register_admin_menu' ));
	}

	/**
	 * Filters.
	 */
	public function filters() {
		add_filter( 'plugin_action_links_' . plugin_basename(TD_SPA), array( $this, 'plugin_action_links' ) );

		// Admin footer text - only on TD SPA page
		add_action( 'current_screen', array( $this, 'maybe_add_footer_filters' ) );
	}

	/**
	 * Add footer filters only on TD SPA page.
	 */
	public function maybe_add_footer_filters() {
		if ( $this->is_td_spa_page() ) {
			add_filter( 'admin_footer_text', array( $this, 'admin_footer_text' ) );
			add_filter( 'update_footer', array( $this, 'update_footer' ), 999 );
		}
	}

	/**
	 * Add admin menu
	 */
	public function register_admin_menu() {
		add_options_page(
			__('TD SPA Settings', 'td-spa'),
			__('TD SPA', 'td-spa'),
			'manage_options',
			'td-spa',
			array( $this, 'render_settings_page' )
		);
	}

	/**
	 * Settings page
	 */
	public function render_settings_page() {
		echo '<div id="td-spa-app"></div>';
	}

	/**
	 * Plugin action links
	 *
	 * @param array $links Plugin action links.
	 * @return array
	 */
	public function plugin_action_links( $links ) {

		// Unshift settings.
		array_unshift(
			$links,
			wp_sprintf(
				'<a href="%s">%s</a>',
				admin_url('options-general.php?page=td-spa'),
				__('Settings', 'td-spa')
			)
		);

		return $links;
	}

	/**
	 * Check if current page is TD SPA admin page.
	 *
	 * @return bool
	 */
	private function is_td_spa_page() {
		$screen = \get_current_screen();
		return $screen && strpos( $screen->id, 'td-spa' ) !== false;
	}

	/**
	 * Admin footer text.
	 *
	 * @param string $text Footer text.
	 * @return string
	 */
	public function admin_footer_text( $text ) {
		return 'TD SPA ' . TD_SPA_VERSION;
	}

	/**
	 * Update footer.
	 *
	 * @param string $text Footer text.
	 * @return string
	 */
	public function update_footer( $text ) {
		return 'TD SPA ' . TD_SPA_VERSION;
	}


}

// Let's start.
Hooks::start();
