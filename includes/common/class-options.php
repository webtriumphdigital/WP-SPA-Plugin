<?php
/**
 * TD SPA Default Options.
 *
 * @package TD SPA
 * @since 2.0.0
 */
// Namespace.
namespace TDSPA;

// Exit if access directly.
defined( 'ABSPATH' ) || die( 'Uhu, we don\'t do this here' );

if ( ! class_exists( __NAMESPACE__ . '\Options' ) ) {
	/**
	 * TD SPA Default Options.
	 */
	class Options extends \TDSPA\Base {

        /**
         * Default settings.
         *
         * @return array
         */
        public function get_default_settings() {
            $options = array(
                // Basic Controls.
                'enable_navigation' => true,
                'enable_admin_spa' => false,
                'enable_prefetch' => false,
                'disable_for_admins' => false,
                'block_keyboard_reload' => false,
                'bypass_auth_forms' => false,

                // Cache/Prefetch settings.
                'prefetch_on_mousedown' => false,
                'prefetch_ignore_visited' => false,

                // Advanced.
                'ignore_elements' => '',
                'ignore_links' => '',

                // Loader type (progressbar, spinner, none)
                'loader_type' => 'progressbar',

                // Progressbar.
                'progressbar' => true,
                'progressbar_position' => 'top',
                'progressbar_class' => '',
                'progressbar_id' => '',
                'progressbar_color' => '#037bff',
                'progressbar_weight' => 'thin',
                'progressbar_weight_custom' => '7px',
                'progressbar_opacity' => 80,
                'progressbar_animate' => true,
                'progressbar_animation_speed' => 1.5,
                'progressbar_auto_hide' => true,

                // Spinner.
                'loader' => false,
                'loader_layout' => 'icon_only',
                'loader_class' => '',
                'loader_id' => '',
                'animate_cursor' => true,
                'cursor_mode' => 'wait',
                'disable_mouse_clicks' => false,
                'loader_image' => TD_SPA_URL . 'public/images/loading/1.gif',
                'loader_image_size' => 40,
                'loader_image_rotation' => 0,
                'loader_gap' => 10,
                'loader_message' => 'Loading...',
                'loader_color' => '#000000',
                'loader_font_family' => '',
                'loader_font_weight' => 'normal',
                'loader_font_size' => 14,
                'loader_letter_spacing' => 0,
                'loader_background' => '#ffffff',
                'loader_background_opacity' => 70,

                // Scroll behavior.
                'scroll_to_top' => true,

                // Content animation.
                'content_animation' => false,
                'content_animation_name' => 'fade',
                'content_animation_duration' => '0.3',

                // Custom CSS.
                'custom_css' => '',

                // Cloudflare Cache settings.
                //
                // Only the exclusion settings are user-facing. Edge TTL,
                // bypass patterns and bypass cookies are tuning knobs that
                // the defaults get right for almost everyone, so they are
                // controlled through the td_spa_cf_* filters instead of
                // cluttering the screen. The second cache layer and
                // keeping pages fresh are simply always on.
                'cf_exclude_urls' => '',
                // Post IDs, and "taxonomy:term_id" refs, chosen in the UI.
                'cf_exclude_posts' => array(),
                'cf_exclude_terms' => array(),
                // Built-in screens (home, search, archives) - "special:key".
                'cf_exclude_special' => array(),
            );

            return apply_filters( 'td_spa_default_options', $options );
        }

        public function get_settings() {
            global $wpdb;

            $defaults = $this->get_default_settings();

            if ( empty( $defaults ) ) {
                return array();
            }

            // Fetch all td-spa options in a single query.
            $prefix = $wpdb->esc_like( TD_SPA_PREFIX ) . '%';
            $results = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT option_name, option_value FROM {$wpdb->options} WHERE option_name LIKE %s",
                    $prefix
                ),
                ARRAY_A
            );

            // Build options array from query results.
            $options_from_db = array();
            if ( ! empty( $results ) ) {
                foreach ( $results as $row ) {
                    $option_name = str_replace( TD_SPA_PREFIX, '', $row['option_name'] );
                    $options_from_db[ $option_name ] = maybe_unserialize( $row['option_value'] );
                }
            }

            // Run v2.3.0 migration if needed.
            $migrated_version = get_option( 'td_spa_migrated_version', '0' );
            if ( version_compare( $migrated_version, '2.3.0', '<' ) ) {
                $migrated_values = $this->run_migration_230( $options_from_db );
                $options_from_db = array_merge( $options_from_db, $migrated_values );
                update_option( 'td_spa_migrated_version', '2.3.0' );
            }

            // Merge with defaults (use DB values if exist, otherwise use defaults).
            $settings = array();
            foreach ( $defaults as $name => $default_value ) {
                $settings[ $name ] = isset( $options_from_db[ $name ] ) ? $options_from_db[ $name ] : $default_value;
            }

            // Migrate legacy settings.
            $settings = $this->migrate_legacy_settings( $settings, $options_from_db );

            return $settings;
        }

        /**
         * Migrate legacy settings for backward compatibility.
         *
         * @param array $settings Current settings.
         * @param array $options_from_db Raw options from database.
         * @return array Migrated settings.
         */
        protected function migrate_legacy_settings( $settings, $options_from_db ) {
            // Migrate loader_type from legacy progressbar/loader booleans.
            // Only migrate if loader_type was never explicitly set by user.
            if ( ! isset( $options_from_db['loader_type'] ) ) {
                $progressbar_enabled = wp_validate_boolean( isset( $settings['progressbar'] ) ? $settings['progressbar'] : true );
                $loader_enabled      = wp_validate_boolean( isset( $settings['loader'] ) ? $settings['loader'] : false );

                if ( $progressbar_enabled ) {
                    $settings['loader_type'] = 'progressbar';
                } elseif ( $loader_enabled ) {
                    $settings['loader_type'] = 'spinner';
                } else {
                    $settings['loader_type'] = 'none';
                }
            }

            // Migrate loader_image_position → loader_layout.
            if ( isset( $options_from_db['loader_image_position'] ) && ! isset( $options_from_db['loader_layout'] ) ) {
                $position_map = array(
                    'left'   => 'icon_left',
                    'right'  => 'icon_right',
                    'top'    => 'icon_top',
                    'bottom' => 'icon_bottom',
                );
                $old_position            = $options_from_db['loader_image_position'];
                $settings['loader_layout'] = isset( $position_map[ $old_position ] )
                    ? $position_map[ $old_position ]
                    : 'icon_left';
            }

            // Migrate disable_logged_in_users → disable_for_admins.
            if ( isset( $options_from_db['disable_logged_in_users'] ) && ! isset( $options_from_db['disable_for_admins'] ) ) {
                $settings['disable_for_admins'] = wp_validate_boolean( $options_from_db['disable_logged_in_users'] );
            }

            return $settings;
        }

        /**
         * Run migration for v2.3.0 (iframe-based SPA).
         *
         * @param array $options_from_db Raw options from database.
         * @return array Migrated values to merge back.
         */
        protected function run_migration_230( $options_from_db ) {
            $migrated = array();

            // 1. Migrate disable_logged_in_users → disable_for_admins.
            if ( isset( $options_from_db['disable_logged_in_users'] ) ) {
                $old_value = wp_validate_boolean( $options_from_db['disable_logged_in_users'] );
                if ( $old_value && ! isset( $options_from_db['disable_for_admins'] ) ) {
                    update_option( TD_SPA_PREFIX . 'disable_for_admins', true );
                    $migrated['disable_for_admins'] = true;
                }
            }

            // 2. Migrate loader_image_position → loader_layout.
            if ( isset( $options_from_db['loader_image_position'] ) && ! isset( $options_from_db['loader_layout'] ) ) {
                $position_map = array(
                    'left'   => 'icon_left',
                    'right'  => 'icon_right',
                    'top'    => 'icon_top',
                    'bottom' => 'icon_bottom',
                );
                $old_position = $options_from_db['loader_image_position'];
                $new_layout   = isset( $position_map[ $old_position ] ) ? $position_map[ $old_position ] : 'icon_left';
                update_option( TD_SPA_PREFIX . 'loader_layout', $new_layout );
                $migrated['loader_layout'] = $new_layout;
            }

            // 3. Cleanup removed options.
            $removed_keys = array(
                'enable_comments',
                'enable_search',
                'enable_live_search',
                'enable_forms',
                'forms_mode',
                'ignore_forms',
                'include_forms',
                'prevent_reloads',
                'prevent_reloads_title',
                'prevent_reloads_message',
                'prevent_reloads_cancel',
                'prevent_reloads_confirm',
                'disable_for_mobile',
                'disable_logged_in_users',
                'target',
                'loader_image_position',
                'content_animation_delay',
                'content_animation_duration_custom',
                'reduce_motion',
                'enhanced_focus',
                'execute_script_before_loading',
                'execute_script_when_loading_started',
                'execute_script_after_loaded',
                'reinit_scripts',
                'reinit_scripts_exclude',
            );

            foreach ( $removed_keys as $key ) {
                delete_option( TD_SPA_PREFIX . $key );
            }

            return $migrated;
        }

        /**
         * Update settings.
         *
         * @param $new_settings New settings Array.
         * @return bool
         */
        public function update_settings( $new_settings = array() ) {
            $default_keys = array_keys( $this->get_default_settings() );

            if ( empty( $default_keys ) ) {
                return false;
            }

            foreach ( $default_keys as $name ) {
                update_option( TD_SPA_PREFIX . $name, $new_settings[ $name ] );
            }

            return true;
        }
	}
}
