/**
 * TD SPA - Gutenberg "don't cache this page" panel.
 *
 * Hand-authored against the wp.* runtime globals (like assets/js/packedge.js),
 * so it needs no build step. Adds a document sidebar toggle bound to the
 * _td_spa_cf_exclude post meta; the PHP side rebuilds the edge exclude list
 * when that meta changes.
 */
( function ( wp ) {
	if ( ! wp || ! wp.plugins || ! wp.element ) {
		return;
	}

	var el = wp.element.createElement;
	var registerPlugin = wp.plugins.registerPlugin;
	// PluginDocumentSettingPanel moved from edit-post to editor in WP 6.6+.
	var Panel =
		( wp.editor && wp.editor.PluginDocumentSettingPanel ) ||
		( wp.editPost && wp.editPost.PluginDocumentSettingPanel );
	var ToggleControl = wp.components && wp.components.ToggleControl;
	var useSelect = wp.data && wp.data.useSelect;
	var useEntityProp = wp.coreData && wp.coreData.useEntityProp;
	var __ = ( wp.i18n && wp.i18n.__ ) || function ( s ) { return s; };

	if ( ! Panel || ! ToggleControl || ! useSelect || ! useEntityProp ) {
		return;
	}

	var META = '_td_spa_cf_exclude';
	var SUPPORTED = [ 'post', 'page' ];

	function CachePanel() {
		var postType = useSelect( function ( select ) {
			return select( 'core/editor' ).getCurrentPostType();
		}, [] );

		if ( SUPPORTED.indexOf( postType ) === -1 ) {
			return null;
		}

		var entity = useEntityProp( 'postType', postType, 'meta' );
		var meta = entity[ 0 ] || {};
		var setMeta = entity[ 1 ];
		var excluded = !! meta[ META ];

		return el(
			Panel,
			{ name: 'td-spa-cache', title: __( 'TD SPA Cache', 'td-spa' ) },
			el( ToggleControl, {
				label: __( "Don't cache this page", 'td-spa' ),
				help: excluded
					? __( 'Always served fresh from your site.', 'td-spa' )
					: __( 'Eligible for edge caching.', 'td-spa' ),
				checked: excluded,
				onChange: function ( value ) {
					var next = {};
					next[ META ] = value;
					setMeta( Object.assign( {}, meta, next ) );
				},
			} )
		);
	}

	registerPlugin( 'td-spa-cache-panel', { render: CachePanel } );
} )( window.wp );
