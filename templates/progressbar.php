<?php
/**
 * ProgressBar template.
 *
 * @package TD SPA
 */
// Exit if access directly.
defined( 'ABSPATH' ) || die( 'Uhu, we don\'t do this here' );

$settings = \TDSPA\Options::get_instance()->get_settings();
$width = \TDSPA\Templates::get_instance()->is_ajax_request() ? '100%' : '0%';

// Calculate height based on thickness setting
$thickness = $settings['progressbar_weight'];
if ( 'thin' === $thickness ) {
	$height = '3px';
} elseif ( 'normal' === $thickness ) {
	$height = '7px';
} elseif ( 'large' === $thickness ) {
	$height = '12px';
} elseif ( 'custom' === $thickness ) {
	$custom_value = ! empty( $settings['progressbar_weight_custom'] ) ? $settings['progressbar_weight_custom'] : '7px';
	// Validate custom value (allow px, rem, em, %, vh, vw, etc.)
	if ( preg_match( '/^-?\d+(\.\d+)?(px|rem|em|%|vh|vw|vmin|vmax|ch|ex)$/i', trim( $custom_value ) ) ) {
		$height = $custom_value;
	} else {
		$height = '7px'; // Fallback to default if invalid
	}
} else {
	// Fallback for old numeric values
	$height = $thickness . 'px';
}

?>

<?php
$wave_class = wp_validate_boolean( $settings['progressbar_animate'] ) ? 'progressbar-wave' : '';
$animation_speed = ! empty( $settings['progressbar_animation_speed'] ) ? $settings['progressbar_animation_speed'] : '1.5';
?>
<div class="td-spa-progressbar <?php echo esc_attr( $wave_class ); ?> <?php echo ! empty( $settings['progressbar_class'] ) ? esc_attr( $settings['progressbar_class'] ) : ''; ?>" id="<?php echo ! empty( $settings['progressbar_id'] ) ? esc_attr( $settings['progressbar_id'] ) : 'td-spa-progressbar'; ?>" style="
<?php
echo wp_sprintf(
	'top: %s; bottom: %s; height: %s; opacity: %d%%; width: %s; --progressbar-color: %s; --animation-speed: %ss;%s',
	'top' === $settings['progressbar_position'] ? ( did_action( 'admin_bar_menu' ) ? '32px' : 0 ) : 'auto',
	'bottom' === $settings['progressbar_position'] ? '0' : 'auto',
	esc_attr( $height ),
	esc_attr( $settings['progressbar_opacity'] ),
	esc_attr( $width ),
	esc_attr( $settings['progressbar_color'] ),
	esc_attr( $animation_speed ),
	wp_validate_boolean( $settings['progressbar_animate'] ) ? '' : ' background-color: ' . esc_attr( $settings['progressbar_color'] ) . ';'
);
?>
"></div>
