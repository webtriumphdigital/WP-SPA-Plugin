<?php
/**
 * TD SPA Templates Hooks.
 *
 * @package TD SPA
 * @since 2.0.0
 */
// Namespace.
namespace TDSPA;

// Exit if access directly.
defined( 'ABSPATH' ) || die( 'Uhu, we don\'t do this here' );

if ( ! class_exists( __NAMESPACE__ . '\Templates' ) ) {
	/**
	 * TD SPA Templates Hooks.
	 */
	class Templates extends \TDSPA\Base {
        /**
		 * Register actions.
		 */
		public function actions() {
			add_action('wp_footer', array( $this, 'load_templates' ));
		}

		/**
		 * Is TD SPA Ajax request.
		 *
		 * @return bool
		 */
		public function is_ajax_request() {
			if ( function_exists( 'getallheaders' ) ) {
				$headers = getallheaders();
				return isset( $headers['Ajaxpress-Ajax'] ) && 'true' === $headers['Ajaxpress-Ajax'];
			}

			return isset( $_SERVER['HTTP_TD_SPA_AJAX'] ) && 'true' === sanitize_text_field( wp_unslash( $_SERVER['HTTP_TD_SPA_AJAX'] ) );
		}

		/**
		 * Load templates.
		 */
		public function load_templates() {

			$settings = Options::get_instance()->get_settings();

			// Progressbar.
			if ( wp_validate_boolean( $settings['progressbar'] ) ) {
				include_once TD_SPA_PATH . 'templates/progressbar.php';
			}

			// Loader.
			if ( wp_validate_boolean( $settings['loader'] ) ) {
				include_once TD_SPA_PATH . 'templates/loader.php';
			}
		}


		/**
		 * Hex to RGBA.
		 *
		 * @param string $color
		 * @param int $opacity
		 * @return string
		 */
		public function hex2rgba( $color, $opacity = 100 ) {
			if ( empty( $color ) ) {
				return 'rgba(255, 255, 255, ' . ( $opacity / 100 ) . ')';
			}
			$color = str_replace('#', '', $color);
			switch ( strlen( $color ) ) {
				case 6:
					$r = $color[0] . $color[1];
					$g = $color[2] . $color[3];
					$b = $color[4] . $color[5];
					break;
				case 3:
					$r = $color[0] . $color[0];
					$g = $color[1] . $color[1];
					$b = $color[2] . $color[2];
					break;
				default:
					return '';
			}

			$r = hexdec( $r );
			$g = hexdec( $g );
			$b = hexdec( $b );

			$opacity = $opacity / 100;
			return "rgba({$r}, {$g}, {$b}, {$opacity})";
		}
	}


	// Start.
	Templates::start();
}
