<?php
/**
 * Loader/Spinner template.
 *
 * @package TD SPA
 */
// Exit if access directly.
defined( 'ABSPATH' ) || die( 'Uhu, we don\'t do this here' );

$settings = \TDSPA\Options::get_instance()->get_settings();

// Extract settings with defaults
$background          = isset( $settings['loader_background'] ) ? $settings['loader_background'] : '#ffffff';
$background_opacity  = isset( $settings['loader_background_opacity'] ) ? $settings['loader_background_opacity'] : 70;
$background_rgb      = $this->hex2rgba( $background, $background_opacity );
$hidden_class        = \TDSPA\Templates::get_instance()->is_ajax_request() ? '' : 'td-spa-spinner-hidden';
$animate_cursor      = isset( $settings['animate_cursor'] ) ? wp_validate_boolean( $settings['animate_cursor'] ) : true;
$cursor_mode         = isset( $settings['cursor_mode'] ) ? $settings['cursor_mode'] : 'wait';
$loader_image_size   = isset( $settings['loader_image_size'] ) ? $settings['loader_image_size'] : 40;
$loader_image_rotation = isset( $settings['loader_image_rotation'] ) ? $settings['loader_image_rotation'] : 0;
$loader_color        = isset( $settings['loader_color'] ) ? $settings['loader_color'] : '#000000';
$loader_font_family  = isset( $settings['loader_font_family'] ) ? $settings['loader_font_family'] : 'sans-serif';
$loader_font_weight  = isset( $settings['loader_font_weight'] ) ? $settings['loader_font_weight'] : 500;
$loader_font_size    = isset( $settings['loader_font_size'] ) ? $settings['loader_font_size'] : 13;
$loader_letter_spacing = isset( $settings['loader_letter_spacing'] ) ? $settings['loader_letter_spacing'] : 1.1;
?>
<div class="td-spa-spinner <?php echo ! empty( $settings['loader_class'] ) ? esc_attr( $settings['loader_class'] ) : ''; ?> <?php echo esc_attr( $hidden_class ); ?>" id="
                                        <?php
										echo ! empty( $settings['loader_id'] ) ? esc_attr( $settings['loader_id'] ) : 'td-spa-spinner'
                                        ?>
                                        " style="<?php echo esc_attr( wp_sprintf('background: %s; cursor: %s', $background_rgb, $animate_cursor ? esc_attr( $cursor_mode ) : 'default') ); ?>">

    <!-- container  -->
     <div class="td-spa-spinner-content" style="
     <?php
		// Use loader_layout if available, otherwise fall back to loader_image_position for backwards compatibility
		$layout = ! empty( $settings['loader_layout'] ) ? $settings['loader_layout'] : ( isset( $settings['loader_image_position'] ) ? $settings['loader_image_position'] : 'left' );

		$flex_direction = 'row';
		if ( 'icon_top' === $layout || 'top' === $layout ) {
			$flex_direction = 'column';
		} elseif ( 'icon_bottom' === $layout || 'bottom' === $layout ) {
			$flex_direction = 'column-reverse';
		} elseif ( 'icon_right' === $layout || 'right' === $layout ) {
			$flex_direction = 'row-reverse';
		}
		$loader_gap = isset( $settings['loader_gap'] ) ? $settings['loader_gap'] : 5;
		echo esc_attr( wp_sprintf( 'flex-direction: %s; gap: %dpx', $flex_direction, $loader_gap ) );
		?>
                        ">
     <?php
		// Show image if layout is not text_only
		$show_image = 'text_only' !== $layout && ! empty( $settings['loader_image'] );
		$show_message = 'icon_only' !== $layout && ! empty( $settings['loader_message'] );

		if ( $show_image && ( 'icon_top' === $layout || 'icon_left' === $layout || 'icon_only' === $layout || 'top' === $layout || 'left' === $layout || ( empty( $layout ) && ! empty( $settings['loader_image'] ) ) ) ) :
			?>
     <img class="td-spa-spinner-image" src="<?php echo esc_attr( $settings['loader_image'] ); ?>" style="<?php echo esc_attr( wp_sprintf( 'width: %dpx; height: auto; transform: rotate(%ddeg)', $loader_image_size, $loader_image_rotation ) ); ?>">
		<?php endif; ?>
     <?php if ( $show_message ) : ?>
        <span class="td-spa-spinner-text" style="
			<?php
			echo esc_attr( wp_sprintf( 'color: %s; font-family: %s; font-weight: %s; font-size: %spx; letter-spacing: %spx',
				$loader_color,
				$loader_font_family,
				$loader_font_weight,
				$loader_font_size,
				$loader_letter_spacing
			) );
			?>
     "><?php echo wp_kses_post( $settings['loader_message'] ); ?></span>
     <?php endif; ?>
     <?php if ( $show_image && ( 'icon_bottom' === $layout || 'icon_right' === $layout || 'bottom' === $layout || 'right' === $layout ) ) : ?>
     <img class="td-spa-spinner-image" src="<?php echo esc_attr( $settings['loader_image'] ); ?>" style="<?php echo esc_attr( wp_sprintf( 'width: %dpx; height: auto; transform: rotate(%ddeg)', $loader_image_size, $loader_image_rotation ) ); ?>">
     <?php endif; ?>
     </div>
</div>