import IframeContainer, { isBuilderSession } from "./features/iframe-container";
import './styles.css';


(() => {
    /**
     * Iframe Container - wraps page in iframe for SPA navigation
     *
     * Never boots on a page-builder editing session. Divi, Bricks and the rest
     * load the frontend URL with a query flag and expect to own the document
     * they started on; wrapping that in the SPA shell is what leaves the
     * builder blank.
     */
    if ( td_spa_vars.settings.enable_navigation && ! isBuilderSession() ) {
        IframeContainer()
    }
})()
