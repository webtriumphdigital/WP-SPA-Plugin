<?php
/**
 * Rating prompt.
 *
 * Shows a compact "rate us" banner on TD SPA admin pages 7 days after the
 * plugin was first seen. Closing it (or choosing a rating) means it never shows
 * again - a permanent rating link still lives at the bottom of the Help page. A
 * 4-5 star choice opens the WordPress.org review form; 1-3 stars shows a
 * thank-you and quietly hides.
 *
 * @package TD SPA
 */

namespace TDSPA\Admin;

// Prevent direct access.
if ( ! defined( 'ABSPATH' ) ) {
	exit();
}

if ( ! class_exists( __NAMESPACE__ . '\\Rating_Prompt' ) ) {

	/**
	 * Renders the rating prompt and records the user's choice.
	 */
	class Rating_Prompt {

		const INSTALLED_OPTION = 'td_spa_installed_at';
		const DONE_OPTION      = 'td_spa_rating_done';
		const DELAY_DAYS       = 7;
		const REVIEW_URL       = 'https://wordpress.org/support/plugin/td-spa/reviews/#new-post';

		/**
		 * Constructor.
		 */
		public function __construct() {
			add_action( 'admin_init', array( $this, 'remember_install_time' ) );
			add_action( 'admin_footer', array( $this, 'maybe_render' ) );
			add_action( 'wp_ajax_td_spa_rating_done', array( $this, 'mark_done' ) );
		}

		/**
		 * Record the first-seen timestamp once, so the 7-day timer can start.
		 *
		 * @return void
		 */
		public function remember_install_time(): void {
			if ( ! get_option( self::INSTALLED_OPTION ) ) {
				update_option( self::INSTALLED_OPTION, time() );
			}
		}

		/**
		 * Whether the prompt should show on this request.
		 *
		 * @return bool
		 */
		private function should_show(): bool {
			if ( ! current_user_can( 'manage_options' ) || get_option( self::DONE_OPTION ) ) {
				return false;
			}

			// Only on TD SPA's own admin screen.
			$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
			if ( ! $screen || false === strpos( (string) $screen->id, 'td-spa' ) ) {
				return false;
			}

			$installed = (int) get_option( self::INSTALLED_OPTION, time() );
			return ( time() - $installed ) >= ( self::DELAY_DAYS * DAY_IN_SECONDS );
		}

		/**
		 * Render the banner.
		 *
		 * @return void
		 */
		public function maybe_render(): void {
			if ( ! $this->should_show() ) {
				return;
			}

			$nonce = wp_create_nonce( 'td_spa_rating' );
			?>
			<div id="td-spa-rating" class="td-spa-rating" role="dialog" aria-modal="true" aria-label="<?php esc_attr_e( 'Rate TD SPA', 'td-spa' ); ?>">
				<div class="td-spa-rating__box">
					<button type="button" class="td-spa-rating__close" aria-label="<?php esc_attr_e( 'Dismiss', 'td-spa' ); ?>">&times;</button>
					<div class="td-spa-rating__main">
						<h3 class="td-spa-rating__title"><?php esc_html_e( 'Enjoying TD SPA?', 'td-spa' ); ?></h3>
						<p class="td-spa-rating__text"><?php esc_html_e( 'A quick rating helps us a lot. How would you rate it?', 'td-spa' ); ?></p>
						<div class="td-spa-rating__stars" role="radiogroup">
							<?php for ( $i = 1; $i <= 5; $i++ ) { ?>
								<button type="button" class="td-spa-rating__star" data-value="<?php echo esc_attr( (string) $i ); ?>" aria-label="<?php echo esc_attr( sprintf( /* translators: %d: star count */ _n( '%d star', '%d stars', $i, 'td-spa' ), $i ) ); ?>">&#9733;</button>
							<?php } ?>
						</div>
					</div>
					<p class="td-spa-rating__thanks" style="display:none;"><?php esc_html_e( 'Thanks for your feedback! Need help? Visit our support.', 'td-spa' ); ?></p>
				</div>
			</div>
			<style>
			.td-spa-rating{position:fixed;right:24px;bottom:24px;z-index:99999;max-width:360px}
			.td-spa-rating__box{position:relative;background:#fff;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 10px 30px rgba(15,23,42,.18);padding:20px 22px}
			.td-spa-rating__close{position:absolute;top:8px;right:10px;border:0;background:none;font-size:22px;line-height:1;color:#94a3b8;cursor:pointer}
			.td-spa-rating__close:hover{color:#475569}
			.td-spa-rating__title{margin:0 0 6px;font-size:16px;font-weight:600;color:#0f172a}
			.td-spa-rating__text{margin:0 0 12px;font-size:13px;color:#475569}
			.td-spa-rating__stars{display:flex;gap:4px}
			.td-spa-rating__star{border:0;background:none;cursor:pointer;font-size:30px;line-height:1;color:#d1d5db;transition:color .1s ease;padding:0}
			.td-spa-rating__star:hover,.td-spa-rating__star.is-on{color:#f59e0b}
			.td-spa-rating__thanks{margin:0;font-size:14px;color:#166534}
			</style>
			<script>
			( function () {
				var box   = document.getElementById( 'td-spa-rating' );
				if ( ! box ) { return; }
				var stars = box.querySelectorAll( '.td-spa-rating__star' );
				var main  = box.querySelector( '.td-spa-rating__main' );
				var thanks = box.querySelector( '.td-spa-rating__thanks' );
				var nonce  = <?php echo wp_json_encode( $nonce ); ?>;
				var reviewUrl = <?php echo wp_json_encode( self::REVIEW_URL ); ?>;

				function record() {
					var body = new URLSearchParams( { action: 'td_spa_rating_done', _wpnonce: nonce } );
					fetch( ajaxurl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString(), credentials: 'same-origin' } );
				}

				function paint( upto ) {
					stars.forEach( function ( s, i ) { s.classList.toggle( 'is-on', i < upto ); } );
				}

				stars.forEach( function ( star ) {
					star.addEventListener( 'mouseenter', function () { paint( parseInt( star.getAttribute( 'data-value' ), 10 ) ); } );
					star.addEventListener( 'mouseleave', function () { paint( 0 ); } );
					star.addEventListener( 'click', function () {
						var value = parseInt( star.getAttribute( 'data-value' ), 10 );
						record();
						if ( value >= 4 ) {
							window.open( reviewUrl, '_blank', 'noopener' );
							box.style.display = 'none';
						} else {
							main.style.display = 'none';
							thanks.style.display = 'block';
							setTimeout( function () { box.style.display = 'none'; }, 3500 );
						}
					} );
				} );

				box.querySelector( '.td-spa-rating__close' ).addEventListener( 'click', function () {
					record();
					box.style.display = 'none';
				} );
			} )();
			</script>
			<?php
		}

		/**
		 * Mark the prompt as resolved so it never shows again.
		 *
		 * @return void
		 */
		public function mark_done(): void {
			if ( ! current_user_can( 'manage_options' ) ) {
				wp_send_json_error( '', 403 );
			}
			check_ajax_referer( 'td_spa_rating' );
			update_option( self::DONE_OPTION, 1 );
			wp_send_json_success();
		}
	}

	new Rating_Prompt();
}
