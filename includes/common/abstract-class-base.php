<?php
/**
 * TD SPA Base Class.
 *
 * @package TD SPA
 * @since 2.0.0
 */
// Namespace.
namespace TDSPA;

// Exit if access directly.
defined( 'ABSPATH' ) || die( 'Uhu, we don\'t do this here' );

if ( ! \class_exists( __NAMESPACE__ . '\Base' ) ) {
    /**
     * TD SPA Base Class.
     */
    abstract class Base {
        /**
         * Singleton instance
         *
         * @var array
         */
        private static $instances = array();

        /**
         * Get singleton instance
         *
         * @return object
         */
        public static function get_instance() {
            $class = get_called_class();

            if ( ! isset( self::$instances[ $class ] ) ) {
                self::$instances[ $class ] = new $class();
            }

            return self::$instances[ $class ];
        }

        /**
         * Static Start
         *
         * @since 1.3.0
         */
        public static function start() {
            $instance = self::get_instance();

            $instance->actions();
            $instance->filters();
        }

        /**
         * Actions
         *
         * @since 1.3.0
         */
        public function actions() {}

        /**
         * Filters
         *
         * @since 1.3.0
         */
        public function filters() {}

        /**
         * Is License Active.
         *
         * @return bool
         */
        public function is_license_active() {
            $license   = get_option( 'td_spa_license', [] );
            $is_active = ! empty( $license['key'] ) && 'active' === ( isset( $license['status'] ) ? $license['status'] : '' );
            return apply_filters( 'td_spa_is_license_active', $is_active );
        }
    }
}
