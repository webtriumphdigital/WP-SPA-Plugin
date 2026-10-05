/**
 * Iframe Container
 *
 * Wraps the entire page in an iframe for SPA-like navigation.
 * If already inside an iframe, notifies parent of URL/title changes.
 * Supports persistent elements (players) that survive navigation.
 *
 * @package TD SPA
 * @since 2.3.0
 */

let initialized = false

// URL patterns that should bypass iframe (load in parent/normally) - for frontend.
//
// wp-login.php is deliberately NOT here: the login screen loads the SPA too
// (see Enqueues::enqueue_login_scripts), so it navigates and submits like any
// other page. A login that redirects somewhere TD SPA does not run - the
// dashboard, most often - is caught by the background-iframe load handler,
// which finishes the trip as a real top-level navigation.
const BYPASS_PATTERNS = [
    '/wp-admin',
    '/wp-content',
    '/wp-json',
    'wp-admin.php'
]

// Frontend page-builder sessions.
//
// Visual builders do not run in wp-admin. Divi, Bricks, Beaver Builder and the
// rest load the real frontend URL with a query flag and then take the document
// over as their own JavaScript application. That is the one thing the SPA shell
// cannot host: the builder expects to own the page it booted on, and inside the
// shell it comes up blank or unresponsive. A URL carrying any of these flags is
// therefore not ours - TD SPA does not boot on it, and does not intercept
// links pointing at it.
const BUILDER_QUERY_FLAGS = [
    'et_fb',                    // Divi visual builder, Divi 5 included
    'et_bfb',                   // Divi backend builder frame
    'et_pb_preview',            // Divi module preview
    'bricks',                   // Bricks (?bricks=run)
    'elementor-preview',        // Elementor editor preview frame
    'ct_builder',               // Oxygen
    'fl_builder',               // Beaver Builder
    'breakdance',               // Breakdance (?breakdance=builder)
    'vc_editable',              // WPBakery inline editor
    'vcv-editable',             // Visual Composer
    'zionbuilder-preview',      // Zion Builder
    'tve',                      // Thrive Architect
    'brizy-edit',               // Brizy
    'brizy-edit-iframe',        // Brizy preview frame
    'customize_changeset_uuid'  // Customizer preview frame
]

/**
 * True when a URL is a page-builder editing session rather than a page to
 * navigate to. Matches on the presence of the flag, whatever its value, since
 * builders vary the value between versions.
 *
 * @param {string} [url] URL to test. Defaults to the current page.
 * @return {boolean}
 */
export const isBuilderSession = (url = window.location.href) => {
    try {
        const params = new URL(url, window.location.origin).searchParams
        return BUILDER_QUERY_FLAGS.some((flag) => params.has(flag))
    } catch {
        return false
    }
}

// Admin-specific bypass patterns (when running in admin context)
const ADMIN_BYPASS_PATTERNS = [
    'update.php',
    'update-core.php',
    'plugins.php?action=activate',
    'plugins.php?action=deactivate',
    'themes.php?action=activate',
    'options.php',
    'admin-post.php',
    'admin-ajax.php',
    'customize.php',
    'plugin-install.php',
    'theme-install.php',
    'plugin-editor.php',
    'theme-editor.php',
    'export.php',
    'import.php',
    'site-health.php',
    'authorize-application.php'
]

// Detect if we're in admin context
const isAdminContext = () => {
    return window.td_spa_vars?.is_admin === true ||
           window.location.href.includes('/wp-admin/')
}

// Is this URL part of wp-admin?
const isAdminUrl = (url) => {
    try {
        return new URL(url, window.location.origin).pathname.includes('/wp-admin')
    } catch (err) {
        return false
    }
}

/**
 * True when a URL sits on the other side of the frontend/wp-admin divide
 * from the current shell.
 *
 * The two are separate applications and must never share a shell. They share
 * the persistent-element container, so crossing inside one shell would carry
 * a frontend radio player straight into the dashboard and keep it playing
 * there. Crossing therefore has to be a real top-level navigation, which
 * replaces the document and takes the player with it.
 *
 * This became reachable when wp-login.php joined the SPA: logging in there
 * redirects to the dashboard, bridging the two in a single shell.
 */
const crossesAdminBoundary = (url) => isAdminUrl(url) !== isAdminContext()

// Get bypass patterns based on context
const getBypassPatterns = () => {
    if (isAdminContext()) {
        // In admin: use admin-specific bypasses, allow wp-admin navigation
        return [...ADMIN_BYPASS_PATTERNS, '/wp-login', '/wp-content', '/wp-json']
    }
    return BYPASS_PATTERNS
}

// Known auth forms that may lack a visible password input at submit time
// (themes/plugins sometimes swap the input for a custom component).
const AUTH_FORM_SELECTOR = '.woocommerce-form-login, .woocommerce-form-register, #loginform, #registerform, #lostpasswordform'

// Auth forms (login/registration/password) must submit natively: they set
// auth cookies and redirect, which requires a real top-level page load.
const isAuthForm = (form) =>
    !!form.querySelector('input[type="password"]') || form.matches(AUTH_FORM_SELECTOR)

// A form's action, resolved absolute. Read via getAttribute because a control
// named "action" shadows the property (HTMLFormElement overrides built-ins
// with named controls) and would hand back an <input> instead of a URL.
const getFormAction = (form) => {
    const actionAttr = form.getAttribute('action')
    if (!actionAttr) return window.location.href
    try {
        return new URL(actionAttr, window.location.href).href
    } catch (err) {
        return actionAttr
    }
}

// Opt out of submit interception for a form or a whole region.
const IGNORE_SUBMIT_SELECTOR = '[data-td-spa-ignore-submit]'

/**
 * Move our document-level submit listener to the back of the queue once the
 * page has loaded.
 *
 * Listeners on the same target fire in registration order, and this bundle is
 * a plain footer script: it registers while parsing, ahead of every page
 * script that binds its handlers on DOMContentLoaded or jQuery ready. A plugin
 * that delegates on the document - `$( document ).on( 'submit', sel, fn )` -
 * therefore runs *after* us, so defaultPrevented is still false when we look,
 * and we replay the POST while its own AJAX fires as well: one submission
 * lands twice, and the crossfade tears down the page mid-request so the
 * plugin's success callback never runs.
 *
 * Re-registering on load puts us behind those handlers, which is where the
 * defaultPrevented check was always meant to sit. Handlers bound on the form
 * element itself (Elementor Pro, Contact Form 7, Gravity Forms) already win on
 * their own - the target phase runs before the document sees the event.
 *
 * Interception is live the whole time; this only changes our position in the
 * queue, so a submit before load is still handled.
 */
const reRegisterSubmitLast = (handler) => {
    const move = () => {
        document.removeEventListener('submit', handler, false)
        document.addEventListener('submit', handler, false)
    }
    if (document.readyState === 'complete') {
        move()
    } else {
        window.addEventListener('load', move, { once: true })
    }
}

// Serialize a form to a plain object. The submitter must be included: a bare
// new FormData(form) drops the pressed button's name/value, and server code
// routinely branches on it (WooCommerce login checks $_POST['login'], WP
// admin checks save/publish/doaction), so omitting it makes the request a
// no-op.
const serializeForm = (form, submitter) => {
    let formData
    try {
        formData = new FormData(form, submitter)
    } catch (err) {
        // Older engines: no submitter argument - append it manually.
        formData = new FormData(form)
        if (submitter && submitter.name && !submitter.disabled) {
            formData.append(submitter.name, submitter.value || '')
        }
    }

    const data = {}
    for (const [key, value] of formData.entries()) {
        // Handle multiple values with same name (e.g., checkboxes)
        if (data[key] !== undefined) {
            if (!Array.isArray(data[key])) {
                data[key] = [data[key]]
            }
            data[key].push(value)
        } else {
            data[key] = value
        }
    }
    return data
}

// Schemes that should always bypass
const BYPASS_SCHEMES = [
    'mailto:',
    'tel:',
    'sms:',
    'javascript:',
    'data:',
    'blob:',
    'ftp:',
    'file:'
]

// Effective browsing-context target for an anchor or form: its own target
// attribute, else the document's <base target>. Lowercased because the
// spec matches _blank/_top/_parent case-insensitively.
const getEffectiveTarget = (el) => (
    el.getAttribute('target') ||
    document.querySelector('base[target]')?.getAttribute('target') ||
    ''
).toLowerCase()

/**
 * Notify theme/plugin code in the parent that a new page is fully visible.
 * Dispatched after the head sync runs, so listeners can read the fresh
 * canonical / OG / JSON-LD off document.head and trust window.location.
 *
 * Use case: re-initializing third-party scripts (ads, analytics widgets)
 * that need to run on every navigation.
 */
const dispatchAjaxpressReady = (iframeWindow) => {
    let url, title
    try {
        url = iframeWindow?.location?.href || window.location.href
        title = iframeWindow?.document?.title || document.title
    } catch {
        url = window.location.href
        title = document.title
    }
    document.dispatchEvent(new CustomEvent('td-spa:ready', {
        bubbles: true,
        detail: { url, title },
    }))
}

/**
 * Selectors for head tags that the iframe owns: anything page-specific that
 * search engines and social-share unfurlers read off the top-level document.
 * Parent shell starts with the initial URL's copies; we replace them on every
 * sync with whatever the iframe doc currently shows.
 */
const PARENT_HEAD_SYNC_SELECTORS = [
    'link[rel="canonical"]',
    'meta[name="description"]',
    'meta[name="robots"]',
    'meta[property^="og:"]',
    'meta[name^="twitter:"]',
]

/**
 * Sync canonical, description, robots, OpenGraph, and Twitter Card tags from
 * the iframe document into the parent <head>. Same intent as the JSON-LD sync:
 * crawlers and social previews read the parent shell, so it must reflect the
 * page the user is actually viewing - not the URL we initially loaded.
 */
const syncMetaToParent = (iframeWindow) => {
    let iframeDoc
    try { iframeDoc = iframeWindow?.document } catch { return }
    if (!iframeDoc) return

    PARENT_HEAD_SYNC_SELECTORS.forEach(selector => {
        // Skip tags TD SPA injected for the iframe's own benefit
        // (e.g., the noindex robots meta the iframe child adds to itself).
        const fresh = Array.from(iframeDoc.head.querySelectorAll(selector))
            .filter(node => !node.hasAttribute('data-td-spa-iframe-only'))
        if (fresh.length === 0) return
        document.head.querySelectorAll(selector).forEach(node => node.remove())
        fresh.forEach(node => {
            document.head.appendChild(document.importNode(node, true))
        })
    })
}

/**
 * Sync JSON-LD structured data from the iframe document into the parent <head>.
 * The parent shell retains its original page's schema in its DOM after the iframe
 * is wrapped over it. Without this sync, search engines see the parent's stale
 * (or duplicated) JSON-LD instead of the page the user is actually viewing.
 *
 * The iframe's own copy is left intact - stripping it broke navigations that
 * revisit a URL whose iframe doc the browser doesn't re-fetch (the stripped
 * state persisted, so the next sync had nothing to lift).
 */
const syncJsonLdToParent = (iframeWindow) => {
    let iframeDoc
    try { iframeDoc = iframeWindow?.document } catch { return }
    if (!iframeDoc) return

    const selector = 'script[type="application/ld+json"]'
    const fresh = Array.from(iframeDoc.querySelectorAll(selector))
    if (fresh.length === 0) return

    document.querySelectorAll(selector).forEach(node => node.remove())

    const seen = new Set()
    fresh.forEach(node => {
        const content = (node.textContent || '').trim()
        if (!content || seen.has(content)) return
        seen.add(content)
        const out = document.createElement('script')
        out.type = 'application/ld+json'
        if (node.className) out.className = node.className
        if (node.id) out.id = node.id
        out.textContent = content
        document.head.appendChild(out)
    })
}

/**
 * Selectors that mark an element as a persistent media player. These get
 * lifted out of the iframe on first encounter and reused across navs so the
 * widget keeps playing without reload.
 *
 * - `[data-td-spa-persist]` and `.td-spa-persist`: explicit opt-in.
 * - `[data-persist]` on audio/video: legacy TD SPA convention.
 * - `[id^="persistent-"]`: convention for theme-side persistent containers
 *   (e.g., `<div id="persistent-radio">…</div>`).
 *
 * The user's `ignore_elements` setting is appended at runtime.
 */
const LIFT_PERSISTENT_SELECTORS = [
    '[data-td-spa-persist]',
    '.td-spa-persist',
    'audio[data-persist]',
    'video[data-persist]',
    '[id^="persistent-"]',
]

// Map<key, { wrapper, donorFrame }> - elements already lifted into the parent
// shell. donorFrame is the iframe whose document the element was adopted from,
// and which must stay alive to keep the element's listeners working; null when
// the element came from the shell's own copy.
const liftedPersistentMedia = new Map()

// Keys of already-lifted players removed from a still-parsing document, so the
// pass that runs once it finishes loading knows the page really does want them.
const strippedWhileParsing = new Set()

// Marks an iframe whose document owns the listeners of a lifted player.
const DONOR_ATTR = 'data-td-spa-donor'
// Marks a donor frame pulled out of the navigation rotation and kept alive.
const PARKED_ATTR = 'data-td-spa-parked'

/**
 * Silence any media inside a node before detaching it. Removal alone is not
 * enough: a detached <audio>/<video> keeps playing per spec. An <iframe>
 * player does stop once its element leaves the document.
 */
const stopMediaIn = (node) => {
    try {
        if (node.matches?.('audio, video')) node.pause()
        node.querySelectorAll?.('audio, video').forEach(media => media.pause())
    } catch (err) {
        /* not pausable */
    }
}

/**
 * Pause and mute media inside a node that has to stay in the document for a
 * while longer. Muting matters as well as pausing: the page's own script may
 * still be about to call play() on it, and a duplicate player left audible
 * would talk over the copy the visitor is actually listening to.
 */
const silenceMediaIn = (node) => {
    try {
        const all = node.matches?.('audio, video') ? [ node ] : []
        node.querySelectorAll?.('audio, video').forEach(media => all.push(media))
        all.forEach(media => {
            media.muted = true
            media.pause()
        })
    } catch (err) {
        /* not silenceable */
    }
}

/**
 * Take a donor frame out of the navigation rotation and keep its document
 * alive, so the listeners of the player adopted out of it keep working.
 *
 * The frame must stay in the DOM: a detached iframe's document is discarded.
 * It is hidden and permanently silenced instead - nothing on that page is
 * visible or audible any more, only its script realm is still needed.
 */
const parkDonorFrame = (frame) => {
    frame.setAttribute(PARKED_ATTR, '')
    frame.id = 'td-spa-donor'
    frame.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 1px;
        height: 1px;
        border: none;
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
        z-index: -1;
    `

    // Pausing once is not enough: a live stream's own script may call play()
    // again. Mute and keep pausing so the parked page can never be heard over
    // the visible one.
    try {
        const doc = frame.contentDocument
        if (!doc) return
        const silence = () => {
            doc.querySelectorAll('audio, video').forEach(media => {
                media.muted = true
                media.pause()
            })
        }
        silence()
        doc.addEventListener('play', silence, true)
    } catch (err) {
        /* cross-origin; nothing we can reach */
    }
}

/**
 * Drop a donor frame once no lifted player still depends on its realm.
 */
const releaseDonorFrame = (frame) => {
    if (!frame) return
    for (const entry of liftedPersistentMedia.values()) {
        if (entry.donorFrame === frame) return
    }
    frame.removeAttribute(DONOR_ATTR)
    if (frame.hasAttribute(PARKED_ATTR)) frame.remove()
}

/**
 * Stable key for a persistent element across navigations. Uses an explicit
 * data-persist-key first, then id, then a tag/src signature.
 */
const getLiftKey = (el) => {
    if (el.dataset?.persistKey) return el.dataset.persistKey
    if (el.id) return 'id:' + el.id
    const innerSrc = el.querySelector?.('iframe[src], audio[src], video[src]')
    if (innerSrc) return 'src:' + innerSrc.getAttribute('src')
    if (el.tagName === 'AUDIO' || el.tagName === 'VIDEO') {
        const s = el.getAttribute('src') || el.currentSrc || ''
        if (s) return 'src:' + s
    }
    // Last resort: a fingerprint of opening tag attributes
    return 'sig:' + (el.outerHTML || '').slice(0, 200)
}

/**
 * Find the shell document's own copy of a persistent element. On a cold load
 * the shell *is* the current page, so it already ran the theme's inline
 * script and its copy carries live event listeners bound in the parent
 * realm. Returns null once that copy has been consumed or on a page the
 * shell never rendered.
 */
const findShellOriginal = (key, selectors) => {
    try {
        return Array.from(document.body.querySelectorAll(selectors)).find(
            node => !node.closest('#td-spa-persist') && getLiftKey(node) === key
        ) || null
    } catch {
        return null
    }
}

/**
 * Lift persistent media (radio widgets, audio/video players, opt-in
 * elements) out of the iframe document and into the parent shell on the
 * first navigation that encounters them. On every subsequent nav, the
 * duplicate copy in the new iframe page is removed so the parent's player
 * keeps playing uninterrupted.
 *
 * Why this approach: the previous TD SPA persist mechanism kept the
 * original element in the iframe and overlaid a wrapper in the parent,
 * tracking position via postMessage. That left two copies of the player
 * on screen and reloaded the iframe's copy on every nav. Lifting the
 * element out of the navigation-iframe entirely is simpler and the
 * widget genuinely persists.
 *
 * The element is always moved, never re-created from HTML: moving keeps its
 * event listeners, its media state, and any embedded player iframe alive,
 * none of which survive an innerHTML round-trip.
 */
const liftPersistentMediaToParent = (iframeWindow) => {
    let iframeDoc
    try { iframeDoc = iframeWindow?.document } catch { return }
    if (!iframeDoc) return

    const userSelectors = (td_spa_vars?.settings?.ignore_elements || '')
        .split(',').map(s => s.trim()).filter(s => s.length > 0)
    const allSelectors = [...LIFT_PERSISTENT_SELECTORS, ...userSelectors].join(', ')

    // The iframe child posts TD_SPA_NAV before its DOM is fully parsed,
    // so the doc may not yet contain body content when our crossfade hook
    // runs. Strip already-lifted duplicates from whatever has parsed so far
    // (so the parent's copy is never visibly doubled while the rest of the
    // document loads), then wait for the full document before lifting
    // first-encounter elements.
    if (iframeDoc.readyState !== 'complete') {
        try {
            iframeDoc.querySelectorAll(allSelectors).forEach(el => {
                const key = getLiftKey(el)
                if (!liftedPersistentMedia.has(key)) return
                // Remember that this page did ask for the player. Stripping it
                // here makes it invisible to the pass that runs on load, which
                // would otherwise read "this page has no player" and evict a
                // still-playing one.
                strippedWhileParsing.add(key)

                // Hide rather than remove. The page's own script has not run
                // yet and will look this element up by id; removing it now
                // makes that lookup return null, and the assignment that
                // follows (`play.onclick = ...`) throws, taking out every
                // statement after it in the same script block. Themes commonly
                // put a player and unrelated UI in one footer block, so that
                // silently breaks things well beyond the player.
                //
                // Hidden and silenced it is neither visible nor audible, and
                // the pass that runs on load removes it for real.
                el.style.setProperty('display', 'none', 'important')
                silenceMediaIn(el)
            })
        } catch { /* invalid user selector */ }
        iframeWindow.addEventListener(
            'load',
            () => liftPersistentMediaToParent(iframeWindow),
            { once: true }
        )
        return
    }

    const persistContainer = document.getElementById('td-spa-persist')
    if (!persistContainer) return

    let found
    try { found = Array.from(iframeDoc.querySelectorAll(allSelectors)) } catch { return }

    // What the new page actually asks for. Computed up front because the loop
    // below detaches elements as it goes. Reaching here means the document is
    // fully parsed (the readyState guard above defers otherwise), so an empty
    // set genuinely means "this page has no player", not "not parsed yet" -
    // provided the duplicates the deferred pass already stripped are counted
    // back in, since they are gone from the document by now.
    const liveKeys = new Set([...found.map(getLiftKey), ...strippedWhileParsing])
    strippedWhileParsing.clear()

    found.forEach(el => {
        const key = getLiftKey(el)

        if (liftedPersistentMedia.has(key)) {
            // The new page rendered its own copy - strip it; the parent's
            // copy is still playing.
            el.remove()
            return
        }

        // First time seeing this player - lift it into the parent shell.
        const wrapper = document.createElement('div')
        wrapper.dataset.persistKey = key
        wrapper.dataset.tdSpaLifted = ''

        // Prefer moving the shell's own copy. Whatever script wires the
        // player up - a theme's inline script, a plugin, a page builder -
        // ran in the parent realm on cold load and bound its listeners to
        // these nodes, and the parent realm outlives every navigation. A
        // node moved within the same document keeps those listeners.
        //
        // Falling back to the iframe's copy, adopt the node rather than
        // re-creating it from HTML. innerHTML drops every listener, so a
        // JS-driven widget lifts as markup that renders but does nothing on
        // click - no error, no events, no playback - and any embedded player
        // iframe reloads from scratch. Adoption keeps the live element.
        //
        // Adopted listeners still belong to the iframe's realm, though, and
        // would die when that frame is reused for the next page. Flag the
        // frame so the rotation parks it instead of navigating it away.
        const shellOriginal = findShellOriginal(key, allSelectors)
        const lifted = shellOriginal || document.adoptNode(el)

        let donorFrame = null
        if (!shellOriginal) {
            try {
                donorFrame = iframeWindow.frameElement || null
            } catch (err) {
                /* cross-origin; frame cannot be parked */
            }
            donorFrame?.setAttribute(DONOR_ATTR, '')
        }

        // The shell's residual content is hidden and inert; the lifted copy
        // is the live one, so undo both on the node being moved.
        lifted.inert = false
        if (lifted.style?.display === 'none') lifted.style.display = ''
        wrapper.appendChild(lifted)

        persistContainer.appendChild(wrapper)
        liftedPersistentMedia.set(key, { wrapper, donorFrame })

        // Drop the iframe's copy - unless it *is* the lifted node, in which
        // case adoption already took it out of the iframe document.
        if (lifted !== el) el.remove()
    })

    // A player the new page does not render must leave the shell as well.
    // Persistence means "carry it across pages that keep asking for it", not
    // "play forever once seen" - otherwise a station lifted on the homepage
    // keeps playing over every later page, and swapping to a different player
    // would leave both running at once.
    liftedPersistentMedia.forEach(({ wrapper, donorFrame }, key) => {
        if (liveKeys.has(key)) return
        stopMediaIn(wrapper)
        wrapper.remove()
        liftedPersistentMedia.delete(key)
        // Nothing depends on that realm any more once the player is gone.
        releaseDonorFrame(donorFrame)
    })

    // The parent shell keeps its original page's body merely display:none'd,
    // so its copy of each player survives the wrap and can keep producing
    // audio invisibly (display:none doesn't unload an iframe or pause
    // media). Once a lifted copy exists, drop the hidden original. Detached
    // <audio>/<video> keep playing per spec, so pause before removing.
    try {
        document.body.querySelectorAll(allSelectors).forEach(el => {
            if (el.closest('#td-spa-persist')) return
            if (!liftedPersistentMedia.has(getLiftKey(el))) return
            stopMediaIn(el)
            el.remove()
        })
    } catch { /* invalid user selector */ }
}

const IframeContainer = () => {
    if (initialized) return
    initialized = true

    // Inside iframe - notify parent of URL/title changes
    if (window.self !== window.top) {
        initIframeChild()
        return
    }

    // Parent page - create iframe container
    initParent()
}

/**
 * Initialize parent page with iframe
 */
const initParent = () => {
    const settings = td_spa_vars?.settings || {}
    const prefetchEnabled = settings.enable_prefetch === true ||
                            settings.enable_prefetch === 'true' ||
                            settings.enable_prefetch === '1'

    // Opt-in full page reload for auth forms - see initIframeChild.
    const bypassAuthForms = settings.bypass_auth_forms === true ||
                            settings.bypass_auth_forms === 'true' ||
                            settings.bypass_auth_forms === '1'

    // Create persistent elements container (outside iframe, always visible)
    const persistContainer = document.createElement('div')
    persistContainer.id = 'td-spa-persist'
    persistContainer.style.cssText = `
        position: fixed;
        z-index: 1000000;
        pointer-events: auto;
    `

    // Create loader with start/complete controls
    const loader = createLoader(settings)
    loader.element.id = 'td-spa-loader'

    // Inject custom CSS if provided
    const customCSS = settings.custom_css || ''
    if (customCSS.trim()) {
        const style = document.createElement('style')
        style.id = 'td-spa-custom-css'
        style.textContent = customCSS
        document.head.appendChild(style)
    }

    // Create iframe transition controller (animates iframes directly)
    const transition = createTransition(settings)

    let iframe = document.createElement('iframe')
    iframe.id = 'td-spa-container'
    iframe.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        border: none;
        margin: 0;
        padding: 0;
        z-index: 999999;
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
        transition: opacity 0.25s ease-out;
    `

    // Background iframe (always exists for smooth transitions). Built by a
    // factory because a donor frame parked out of the rotation has to be
    // replaced with a fresh one - see swapIframes.
    const makeBackgroundIframe = () => {
        const frame = document.createElement('iframe')
        frame.id = 'td-spa-background'
        frame.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            border: none;
            margin: 0;
            padding: 0;
            z-index: 999998;
            visibility: hidden;
            pointer-events: none;
        `
        frame.addEventListener('load', finishOutsideSpaIfNeeded)
        return frame
    }

    let backgroundIframe

    // Navigation state tracking (for actual navigation requests)
    let navigationState = {
        url: null,
        pending: false,
        isHistory: false // true for back/forward navigation (skip scroll to top)
    }

    // Prefetch state tracking (separate from navigation)
    let prefetchedUrl = null
    let prefetchReady = false

    /**
     * A pending navigation only completes when the loaded page reports back
     * with TD_SPA_NAV, which requires TD SPA to be running there. A
     * request that *redirects* somewhere it does not run - logging in and
     * being sent to the dashboard is the common case - would otherwise leave
     * the loader spinning forever on a page the visitor never sees.
     *
     * The redirect target is only known once the frame has loaded, so this
     * checks after the fact and finishes the trip as a real top-level
     * navigation.
     */
    const finishOutsideSpaIfNeeded = (e) => {
        // Both frames keep this listener and trade roles on every crossfade,
        // so only act for whichever is currently the background one.
        if (e.currentTarget !== backgroundIframe) return
        if (!navigationState.pending) return

        let loadedUrl = null
        try {
            loadedUrl = backgroundIframe.contentWindow.location.href
        } catch (err) {
            return // cross-origin; nothing we can read or do
        }

        if (!loadedUrl || loadedUrl === 'about:blank') return
        if (!shouldBypass(loadedUrl)) return

        navigationState = { url: null, pending: false, isHistory: false }
        loader.complete()
        window.top.location.href = loadedUrl
    }

    /**
     * Load a URL in the background iframe without growing the browser's
     * back/forward list. Assigning iframe.src navigates the frame and adds
     * an entry to the joint session history - one per nav on top of our
     * pushState, plus one per hover-prefetch, and pressing Back re-loaded
     * the frame which minted a *forward* entry, trapping users in a loop.
     * location.replace() performs the same load as a replace navigation,
     * so the parent's pushState stays the only entry per page change.
     */
    iframe.addEventListener('load', finishOutsideSpaIfNeeded)
    backgroundIframe = makeBackgroundIframe()

    const loadInBackground = (url) => {
        try {
            backgroundIframe.contentWindow.location.replace(url)
        } catch (err) {
            // contentWindow inaccessible (cross-origin doc loaded earlier)
            // - fall back to src; worst case is an extra history entry.
            backgroundIframe.src = url
        }
    }

    /**
     * Dispatch a navigation lifecycle event on the parent document
     * (td-spa-loading / td-spa-complete, as documented in Help).
     */
    const dispatchNavEvent = (name, detail) => {
        document.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }))
    }

    // Engagement clock for analytics. Accumulates time the page is visible
    // AND focused; document.hasFocus() stays true while focus sits inside
    // the same-origin navigation iframe - exactly the case where GA4's own
    // blur-based timer stops counting and zeroes "Average engagement time".
    let engagementMs = 0
    let engagementSince =
        (document.visibilityState === 'visible' && document.hasFocus())
            ? performance.now() : null

    const engagementTick = () => {
        const now = performance.now()
        if (engagementSince !== null) {
            engagementMs += now - engagementSince
        }
        const engaged = document.visibilityState === 'visible' && document.hasFocus()
        engagementSince = engaged ? now : null
    }
    window.addEventListener('focus', engagementTick)
    window.addEventListener('blur', engagementTick)
    document.addEventListener('visibilitychange', engagementTick)
    setInterval(engagementTick, 1000)

    const takeEngagementMs = () => {
        engagementTick()
        const ms = Math.round(engagementMs)
        engagementMs = 0
        return ms
    }

    /**
     * Official GA4/GTM hook: one dataLayer push per completed navigation,
     * fired after the URL and title are committed so tag managers can read
     * window.location and document.title directly. engagement_time_msec
     * carries the previous page's measured foreground time; sending it on
     * the page_view restores GA4's engagement metrics for SPA navs.
     * Not fired on initial load - gtag tracks the landing page natively.
     */
    const pushPageViewToDataLayer = () => {
        window.dataLayer = window.dataLayer || []
        window.dataLayer.push({
            event: 'td_spa_page_view',
            page_location: window.location.href,
            page_title: document.title,
            engagement_time_msec: takeEngagementMs(),
        })
    }

    /**
     * Hand keyboard focus to the navigation iframe.
     *
     * Analytics measure engagement against document.hasFocus() of the document
     * their snippet runs in, and on a WordPress site that snippet is inside
     * this iframe - the iframe is the real page. Focus stays on the shell
     * unless it is handed over, so the iframe document reports hasFocus()
     * false for the entire visit and GA4 accumulates no engagement at all:
     * "Average engagement time" reads zero however long the visitor stays.
     *
     * Focusing a same-origin child leaves the shell focused as well (focus
     * sits inside its subtree), so the parent's own engagement clock and the
     * dataLayer push are unaffected.
     *
     * Skipped when the tab is not focused, and when anything in the shell
     * already holds focus - a lifted player's controls, most likely, and
     * pulling focus off a control the visitor is using would be worse than
     * the metric it fixes.
     */
    const focusActiveFrame = () => {
        if (!document.hasFocus()) return

        const active = document.activeElement
        const shellIsIdle = !active ||
                            active === document.body ||
                            active === document.documentElement ||
                            active === iframe
        if (!shellIsIdle) return

        try {
            iframe.contentWindow?.focus()
        } catch (err) {
            // Cross-origin document; nothing we can focus.
        }
    }

    /**
     * Swap main and background iframes (called after crossFade animation)
     */
    const swapIframes = () => {
        // New main iframe (was background) - ensure fully visible
        backgroundIframe.style.visibility = 'visible'
        backgroundIframe.style.pointerEvents = 'auto'
        backgroundIframe.style.zIndex = '999999'
        backgroundIframe.style.opacity = '1'
        backgroundIframe.style.transform = ''
        backgroundIframe.id = 'td-spa-container'

        const promoted = backgroundIframe

        if (iframe.hasAttribute(DONOR_ATTR)) {
            // A persistent player was adopted out of this frame's document and
            // its listeners still live in that realm. Reusing the frame for the
            // next page would destroy the realm and leave the player rendering
            // but doing nothing on click. Park it and mint a replacement.
            parkDonorFrame(iframe)
            backgroundIframe = makeBackgroundIframe()
            document.body.appendChild(backgroundIframe)
            // Any prefetch belonged to the frame just parked, not this one.
            prefetchedUrl = null
            prefetchReady = false
        } else {
            // Old main iframe (becomes background) - hide and reset
            iframe.style.visibility = 'hidden'
            iframe.style.pointerEvents = 'none'
            iframe.style.zIndex = '999998'
            iframe.style.opacity = '1'
            iframe.style.transform = ''
            iframe.id = 'td-spa-background'
            backgroundIframe = iframe
        }

        iframe = promoted

        // Clear navigation state
        navigationState = { url: null, pending: false, isHistory: false }
    }

    // Scroll to top setting
    const scrollToTop = settings.scroll_to_top === true ||
                        settings.scroll_to_top === 'true' ||
                        settings.scroll_to_top === '1'

    /**
     * Smooth scroll helper for iframe content
     */
    const smoothScrollToTop = (win, duration = 400) => {
        const startY = win.scrollY || win.pageYOffset || 0
        if (startY === 0) return

        const startTime = performance.now()

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime
            const progress = Math.min(elapsed / duration, 1)
            // Ease out cubic for natural deceleration
            const easeOut = 1 - Math.pow(1 - progress, 3)
            const currentY = Math.round(startY * (1 - easeOut))

            win.scrollTo(0, currentY)

            if (progress < 1) {
                requestAnimationFrame(animate)
            }
        }

        requestAnimationFrame(animate)
    }

    /**
     * Perform crossfade transition between iframes
     */
    const performCrossfade = (url, title, skipScroll = false, fromPrefetch = false) => {
        const oldIframe = iframe
        const newIframe = backgroundIframe
        // Captured before swapIframes() resets navigationState
        const isHistory = navigationState.isHistory

        // Always start the new page at the very top instead of matching the old scroll height.
        if (scrollToTop && !skipScroll) {
            try {
                newIframe.contentWindow?.scrollTo(0, 0)
            } catch (err) {
                // Cross-origin access may fail
            }
        }

        // If this is the first SPA transition from the initial native shell page:
        // oldIframe is dormant, so animate newIframe in and handover shell content
        const transitionPromise = !shellHidden
            ? transition.animateIn(newIframe).then(() => {
                handoverToIframe()
            })
            : transition.crossFade(oldIframe, newIframe)

        transitionPromise.then(() => {
            // Update references after animation
            swapIframes()

            // Hoist the new page's head data into parent <head> so search
            // engines and social previews read fresh, single-source tags
            // instead of the shell's stale copies.
            syncMetaToParent(iframe.contentWindow)
            syncJsonLdToParent(iframe.contentWindow)

            // Strip duplicate persistent media from the new page; the
            // parent's lifted copy is still playing.
            liftPersistentMediaToParent(iframe.contentWindow)

            // Unload the old page from the now-hidden background iframe.
            // Left alone, its document stays alive until the next nav, and
            // any media player in it (e.g. an auto-resuming live stream)
            // keeps playing over the new page's audio.
            loadInBackground('about:blank')

            // Update parent URL and title
            if (url && url !== window.location.href) {
                if (isHistory) {
                    // Back/forward landed on a redirected URL: mirror it
                    // without minting a forward entry mid-history-walk.
                    window.history.replaceState({ url }, '', url)
                } else {
                    window.history.pushState({ url }, '', url)
                }
            }
            if (title) {
                document.title = title
            } else {
                // Try to get title from new iframe
                try {
                    const newTitle = iframe.contentDocument?.title
                    if (newTitle) {
                        document.title = newTitle
                    }
                } catch (err) {
                    // Cross-origin access may fail
                }
            }

            // Before the analytics hooks below: the new page's own snippet
            // starts its engagement timer on load, and it needs the focus.
            focusActiveFrame()

            // After the URL/title commit, so listeners (analytics) can
            // trust window.location and document.title.
            dispatchAjaxpressReady(iframe.contentWindow)
            pushPageViewToDataLayer()
            dispatchNavEvent('td-spa-complete', {
                url: window.location.href,
                fromPrefetch,
            })

            // (Smooth scroll removed to ensure the page starts at top immediately)

            loader.complete()
        })
    }

    // Hide original page content once the iframe has loaded.
    // Keeping the original body visible during initial load prevents the blank page flash.
    const isShellFurniture = (el) => (
        el.id === 'td-spa-container' ||
        el.id === 'td-spa-background' ||
        el.id === 'td-spa-persist' ||
        el.id === 'td-spa-loader' ||
        el.id === 'td-spa-donor' ||
        el.hasAttribute?.(DONOR_ATTR) ||
        el.hasAttribute?.(PARKED_ATTR)
    )

    const hideShellNode = (node) => {
        if (node.nodeType !== 1) return
        if (isShellFurniture(node)) return
        node.style.display = 'none'
        node.inert = true
    }

    let shellHidden = false
    const handoverToIframe = () => {
        if (shellHidden) return
        shellHidden = true

        // Reveal the loaded iframe
        iframe.style.opacity = '1'

        // Wait a frame so the rendered iframe is painted over the shell before hiding shell content
        requestAnimationFrame(() => {
            // Hide original page content
            document.documentElement.style.overflow = 'hidden'
            document.body.style.overflow = 'hidden'
            document.body.style.margin = '0'
            document.body.style.padding = '0'

            Array.from(document.body.children).forEach(hideShellNode)

            const shellObserver = new MutationObserver(records => {
                records.forEach(record => {
                    record.addedNodes.forEach(hideShellNode)
                })
            })
            shellObserver.observe(document.body, { childList: true })
        })
    }

    // Initial load runs directly in the parent window shell.
    // The dormant iframe only receives pages upon subsequent SPA link clicks or popstate.
    let initialLoadHandled = false

    // Listen for messages from iframe
    window.addEventListener('message', (e) => {
        if (e.origin !== window.location.origin) return
        if (!e.data?.type?.startsWith('TD_SPA_')) return

        const { type, url, title } = e.data

        // Handle prefetch request from iframe child (preload on hover)
        if (type === 'TD_SPA_PREFETCH_REQUEST' && prefetchEnabled) {
            // Only prefetch if URL is different and not already prefetching/navigating same URL
            if (url && !shouldBypass(url) && url !== window.location.href && url !== prefetchedUrl && url !== navigationState.url) {
                prefetchedUrl = url
                prefetchReady = false
                dispatchNavEvent('td-spa-loading', { url, prefetch: true })
                loadInBackground(url)
            }
        }

        // Handle navigation request from iframe child
        if (type === 'TD_SPA_NAVIGATE') {
            const requestedUrl = e.data.url
            if (!requestedUrl || shouldBypass(requestedUrl)) return

            loader.start()
            dispatchNavEvent('td-spa-loading', { url: requestedUrl, prefetch: false })

            // Check if this URL is already prefetched AND ready in background iframe
            if (prefetchedUrl === requestedUrl && prefetchReady) {
                // Already prefetched and loaded - crossfade immediately
                navigationState = { url: requestedUrl, pending: false, isHistory: false }
                prefetchedUrl = null
                prefetchReady = false
                performCrossfade(requestedUrl, undefined, false, true)
            } else {
                // Load in background iframe (or wait for prefetch to complete)
                navigationState = { url: requestedUrl, pending: true, isHistory: false }
                if (prefetchedUrl !== requestedUrl) {
                    // Different URL - load it
                    prefetchedUrl = null
                    prefetchReady = false
                    loadInBackground(requestedUrl)
                }
                // If same URL but not ready, just wait - pending is true so it will crossfade when ready
            }
        }

        // Handle form submission request from iframe child
        if (type === 'TD_SPA_FORM_SUBMIT') {
            const { action, method, data, enctype } = e.data
            if (!action || shouldBypass(action)) return

            loader.start()
            dispatchNavEvent('td-spa-loading', { url: action, prefetch: false })
            navigationState = { url: action, pending: true }

            // Wait for background iframe to be ready, then inject and submit form
            const submitFormInBackground = () => {
                try {
                    const bgDoc = backgroundIframe.contentDocument || backgroundIframe.contentWindow.document

                    // Create a form in the background iframe
                    // setAttribute rather than property assignment: once the
                    // replayed fields below are appended, a control named
                    // "action"/"method"/"target" shadows the same-named
                    // property on the form (HTMLFormElement overrides
                    // built-ins with named controls).
                    const form = bgDoc.createElement('form')
                    form.setAttribute('method', method)
                    form.setAttribute('action', action)
                    form.setAttribute('enctype', enctype)
                    form.style.display = 'none'

                    // Add form data as hidden inputs
                    for (const [key, value] of Object.entries(data)) {
                        if (Array.isArray(value)) {
                            // Multiple values (e.g., checkboxes)
                            value.forEach(v => {
                                const input = bgDoc.createElement('input')
                                input.type = 'hidden'
                                input.name = key
                                input.value = v
                                form.appendChild(input)
                            })
                        } else {
                            const input = bgDoc.createElement('input')
                            input.type = 'hidden'
                            input.name = key
                            input.value = value
                            form.appendChild(input)
                        }
                    }

                    bgDoc.body.appendChild(form)

                    // A field named "submit" shadows form.submit(), so call
                    // the prototype method from the background frame's realm.
                    const FormProto = bgDoc.defaultView?.HTMLFormElement?.prototype
                    if (FormProto && typeof FormProto.submit === 'function') {
                        FormProto.submit.call(form)
                    } else {
                        form.submit()
                    }
                } catch (err) {
                    // Cross-origin or other error - fall back to navigating main iframe
                    console.warn('TD SPA: Could not submit form in background iframe', err)
                    navigationState = { url: null, pending: false }
                    loader.complete()
                }
            }

            // Load a blank page first, then submit the form
            backgroundIframe.onload = function onceLoaded() {
                backgroundIframe.onload = null
                submitFormInBackground()
            }
            loadInBackground('about:blank')
        }

        // Handle background iframe finished loading
        if (type === 'TD_SPA_NAV' && e.source === backgroundIframe.contentWindow) {
            // A request can *redirect* out of this shell - logging in on
            // wp-login.php lands on the dashboard - and the redirect target is
            // only known once it reports in. Crossfading it here would pull
            // wp-admin into the frontend shell along with its persistent
            // media. Finish as a real top-level navigation instead.
            if (navigationState.pending && shouldBypass(url)) {
                navigationState = { url: null, pending: false, isHistory: false }
                loader.complete()
                window.top.location.href = url
                return
            }

            // If we have a pending navigation, perform crossfade
            if (navigationState.pending) {
                const skipScroll = navigationState.isHistory
                navigationState.pending = false
                performCrossfade(url, title, skipScroll)
            } else if (prefetchedUrl && url === prefetchedUrl) {
                // Prefetch completed - mark as ready
                prefetchReady = true
            }
            return // Don't process further - this is from background iframe
        }

        // Handle main iframe nav (subsequent SPA navigation or internal navigation)
        if (type === 'TD_SPA_NAV' && e.source === iframe.contentWindow) {
            if (!shellHidden) {
                handoverToIframe()
            }
            loader.complete()
            // The iframe's own navigation (or its pushState) already added
            // the joint session-history entry the Back button walks; a
            // parent pushState here doubled it. replaceState keeps the
            // address bar in sync without minting a second entry - Back
            // pops the child's entry and the child re-notifies us.
            if (url && url !== window.location.href) {
                window.history.replaceState({ url }, '', url)
                if (title) {
                    document.title = title
                }
                pushPageViewToDataLayer()
            } else if (title && title !== document.title) {
                document.title = title
            }
        }

    })

    // Safety net for the shell's own copy of the page.
    //
    // On a cold load the shell document is the current page, so its forms are
    // duplicates of the ones in the iframe - but only the iframe copies carry
    // the child's submit interception. Anything that reaches a shell copy
    // (password-manager autofill, assistive tech, a click landing in the
    // window between first paint and the wrap completing) would submit
    // natively and hard-reload the page, which is exactly the "ajax stops
    // working on a freshly loaded form page" symptom. Route those through the
    // same SPA path instead of letting them reload.
    const onShellSubmit = (e) => {
        const form = e.target
        if (!form || form.tagName !== 'FORM') return

        // Another handler already owns this submission.
        if (e.defaultPrevented) return

        if (form.closest(IGNORE_SUBMIT_SELECTOR)) return

        // Persistent elements are live UI lifted out of the iframe, not shell
        // leftovers - leave their forms alone.
        if (form.closest('#td-spa-persist')) return

        const action = getFormAction(form)
        if (shouldBypass(action)) return

        // Auth forms deliberately take a real top-level submit when the
        // full-reload setting is on; here that is already the top document.
        if (bypassAuthForms && isAuthForm(form)) return

        if (form.querySelector('input[type="file"]')) return

        const formTarget = (form.getAttribute('target') || '').toLowerCase()
        if (formTarget === '_blank' || formTarget === '_top' || formTarget === '_parent') return

        e.preventDefault()

        // Hand off to this document's own TD_SPA_FORM_SUBMIT handler above,
        // which already knows how to replay a form in the background iframe.
        window.postMessage({
            type: 'TD_SPA_FORM_SUBMIT',
            action,
            method: (form.getAttribute('method') || 'GET').toUpperCase(),
            data: serializeForm(form, e.submitter),
            enctype: form.getAttribute('enctype') || 'application/x-www-form-urlencoded'
        }, window.location.origin)
    }
    document.addEventListener('submit', onShellSubmit, false)
    reRegisterSubmitLast(onShellSubmit)

    // Intercept link clicks and prefetch on the initial parent shell
    let parentPrefetchTimeout = null
    const requestParentPrefetch = (targetUrl) => {
        if (!targetUrl || shouldBypass(targetUrl)) return
        if (prefetchEnabled && targetUrl !== window.location.href && targetUrl !== prefetchedUrl && targetUrl !== navigationState.url) {
            prefetchedUrl = targetUrl
            prefetchReady = false
            dispatchNavEvent('td-spa-loading', { url: targetUrl, prefetch: true })
            loadInBackground(targetUrl)
        }
    }

    if (prefetchEnabled) {
        document.addEventListener('mouseover', (e) => {
            if (shellHidden) return
            const anchor = e.target.closest('a')
            if (!anchor) return

            const hrefAttr = anchor.getAttribute('href')
            if (!hrefAttr) return
            if (hrefAttr === '#' || (hrefAttr.startsWith('#') && !hrefAttr.includes('/'))) return
            if (hrefAttr.startsWith('javascript:')) return

            const fullUrl = anchor.href
            if (!fullUrl || shouldBypass(fullUrl)) return

            const target = getEffectiveTarget(anchor)
            if (target === '_blank' || target === '_top' || target === '_parent') return
            if (anchor.hasAttribute('download')) return

            const currentUrl = window.location.href.split('#')[0]
            const targetUrl = fullUrl.split('#')[0]
            if (targetUrl === currentUrl && fullUrl.includes('#')) return

            clearTimeout(parentPrefetchTimeout)
            parentPrefetchTimeout = setTimeout(() => {
                requestParentPrefetch(fullUrl)
            }, 100)
        }, { passive: true })

        document.addEventListener('mouseout', (e) => {
            if (shellHidden) return
            if (e.target.closest('a')) {
                clearTimeout(parentPrefetchTimeout)
            }
        }, { passive: true })
    }

    // Window click interception for shell content before handover
    window.addEventListener('click', (e) => {
        if (shellHidden) return
        if (e.defaultPrevented) return

        const anchor = e.target.closest('a')
        if (!anchor) return
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        if (anchor.hasAttribute('download')) return

        const href = anchor.getAttribute('href')
        if (!href) return
        if (href === '#' || (href.startsWith('#') && !href.includes('/'))) return
        if (href.startsWith('javascript:')) return

        const fullUrl = anchor.href
        const currentUrl = window.location.href.split('#')[0]
        const targetUrl = fullUrl.split('#')[0]
        if (targetUrl === currentUrl && fullUrl.includes('#')) return

        const target = getEffectiveTarget(anchor)
        if (target === '_blank' || target === '_top' || target === '_parent') return

        if (shouldBypass(fullUrl)) {
            return
        }

        e.preventDefault()
        clearTimeout(parentPrefetchTimeout)

        loader.start()
        dispatchNavEvent('td-spa-loading', { url: fullUrl, prefetch: false })

        if (prefetchedUrl === fullUrl && prefetchReady) {
            navigationState = { url: fullUrl, pending: false, isHistory: false }
            prefetchedUrl = null
            prefetchReady = false
            performCrossfade(fullUrl, undefined, false, true)
        } else {
            navigationState = { url: fullUrl, pending: true, isHistory: false }
            if (prefetchedUrl !== fullUrl) {
                prefetchedUrl = null
                prefetchReady = false
                loadInBackground(fullUrl)
            }
        }
    })

    // Handle browser back/forward in parent
    window.addEventListener('popstate', () => {
        const url = window.location.href
        if (shouldBypass(url)) return

        loader.start()
        dispatchNavEvent('td-spa-loading', { url, prefetch: false })

        // Load in background iframe and crossfade (skip scroll for history navigation)
        navigationState = { url, pending: true, isHistory: true }
        loadInBackground(url)
    })

    // Only append non-spinner loaders immediately (spinner adds itself on start)
    if (!loader.isSpinner) {
        document.body.appendChild(loader.element)
    }
    document.body.appendChild(persistContainer)
    document.body.appendChild(iframe)
    document.body.appendChild(backgroundIframe)
}

/**
 * Create iframe transition controller
 * Animates iframe elements directly for smooth page transitions
 */
const createTransition = (settings) => {
    const enabled = settings.content_animation === true || settings.content_animation === 'true' || settings.content_animation === '1'
    const animationName = settings.content_animation_name || 'fade'
    const duration = settings.content_animation_duration === 'custom'
        ? parseFloat(settings.content_animation_duration_custom) || 0.3
        : parseFloat(settings.content_animation_duration) || 0.3

    // Inject animation CSS if not already present
    if (enabled && !document.getElementById('td-spa-transition-css')) {
        const style = document.createElement('style')
        style.id = 'td-spa-transition-css'
        style.textContent = `
            /* Fade */
            @keyframes ap-iframe-fade-out {
                from { opacity: 1; }
                to { opacity: 0; }
            }
            @keyframes ap-iframe-fade-in {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            /* Slide */
            @keyframes ap-iframe-slide-out {
                from { opacity: 1; transform: translateY(0); }
                to { opacity: 0; transform: translateY(-30px); }
            }
            @keyframes ap-iframe-slide-in {
                from { opacity: 0; transform: translateY(30px); }
                to { opacity: 1; transform: translateY(0); }
            }

            /* Scale */
            @keyframes ap-iframe-scale-out {
                from { opacity: 1; transform: scale(1); }
                to { opacity: 0; transform: scale(0.95); }
            }
            @keyframes ap-iframe-scale-in {
                from { opacity: 0; transform: scale(1.05); }
                to { opacity: 1; transform: scale(1); }
            }

            /* Flip */
            @keyframes ap-iframe-flip-out {
                from { opacity: 1; transform: perspective(800px) rotateX(0); }
                to { opacity: 0; transform: perspective(800px) rotateX(90deg); }
            }
            @keyframes ap-iframe-flip-in {
                from { opacity: 0; transform: perspective(800px) rotateX(-90deg); }
                to { opacity: 1; transform: perspective(800px) rotateX(0); }
            }
        `
        document.head.appendChild(style)
    }

    // Track animation state
    let currentAnimation = null

    // If not enabled, return no-op functions
    if (!enabled) {
        return {
            animateOut: (iframe) => Promise.resolve(),
            animateIn: (iframe) => Promise.resolve(),
            crossFade: (oldIframe, newIframe) => Promise.resolve()
        }
    }

    /**
     * Animate iframe out (before navigation)
     */
    const animateOut = (iframe) => {
        return new Promise((resolve) => {
            if (!iframe) return resolve()

            // Cancel any existing animation
            if (currentAnimation) {
                currentAnimation.cancel()
            }

            const animDuration = duration / 2

            iframe.style.transformOrigin = 'center center'
            currentAnimation = iframe.animate([
                ...getOutKeyframes()
            ], {
                duration: animDuration * 1000,
                easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                fill: 'forwards'
            })

            currentAnimation.onfinish = () => {
                currentAnimation = null
                resolve()
            }
        })
    }

    /**
     * Animate iframe in (after navigation)
     */
    const animateIn = (iframe) => {
        return new Promise((resolve) => {
            if (!iframe) return resolve()

            // Cancel any existing animation
            if (currentAnimation) {
                currentAnimation.cancel()
            }

            const animDuration = duration / 2

            iframe.style.transformOrigin = 'center center'
            currentAnimation = iframe.animate([
                ...getInKeyframes()
            ], {
                duration: animDuration * 1000,
                easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                fill: 'forwards'
            })

            currentAnimation.onfinish = () => {
                // Reset styles after animation
                iframe.style.opacity = '1'
                iframe.style.transform = ''
                currentAnimation = null
                resolve()
            }
        })
    }

    /**
     * Cross-fade between two iframes (for prefetched navigation)
     */
    const crossFade = (oldIframe, newIframe) => {
        return new Promise((resolve) => {
            if (!oldIframe || !newIframe) return resolve()

            const animDuration = duration / 2

            // Make new iframe visible but transparent
            newIframe.style.visibility = 'visible'
            newIframe.style.opacity = '0'
            newIframe.style.pointerEvents = 'auto'
            newIframe.style.zIndex = '999999'
            newIframe.style.transformOrigin = 'center center'

            // Animate old iframe out
            oldIframe.style.transformOrigin = 'center center'
            const outAnim = oldIframe.animate([
                ...getOutKeyframes()
            ], {
                duration: animDuration * 1000,
                easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                fill: 'forwards'
            })

            // Animate new iframe in
            const inAnim = newIframe.animate([
                ...getInKeyframes()
            ], {
                duration: animDuration * 1000,
                easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                fill: 'forwards'
            })

            // Resolve when both complete
            Promise.all([
                new Promise(r => { outAnim.onfinish = r }),
                new Promise(r => { inAnim.onfinish = r })
            ]).then(() => {
                // Reset new iframe styles
                newIframe.style.opacity = '1'
                newIframe.style.transform = ''
                resolve()
            })
        })
    }

    /**
     * Get out animation keyframes based on animation name
     */
    const getOutKeyframes = () => {
        switch (animationName) {
            case 'slide':
                return [
                    { opacity: 1, transform: 'translateY(0)' },
                    { opacity: 0, transform: 'translateY(-30px)' }
                ]
            case 'scale':
                return [
                    { opacity: 1, transform: 'scale(1)' },
                    { opacity: 0, transform: 'scale(0.95)' }
                ]
            case 'flip':
                return [
                    { opacity: 1, transform: 'perspective(800px) rotateX(0)' },
                    { opacity: 0, transform: 'perspective(800px) rotateX(90deg)' }
                ]
            case 'fade':
            default:
                return [
                    { opacity: 1 },
                    { opacity: 0 }
                ]
        }
    }

    /**
     * Get in animation keyframes based on animation name
     */
    const getInKeyframes = () => {
        switch (animationName) {
            case 'slide':
                return [
                    { opacity: 0, transform: 'translateY(30px)' },
                    { opacity: 1, transform: 'translateY(0)' }
                ]
            case 'scale':
                return [
                    { opacity: 0, transform: 'scale(1.05)' },
                    { opacity: 1, transform: 'scale(1)' }
                ]
            case 'flip':
                return [
                    { opacity: 0, transform: 'perspective(800px) rotateX(-90deg)' },
                    { opacity: 1, transform: 'perspective(800px) rotateX(0)' }
                ]
            case 'fade':
            default:
                return [
                    { opacity: 0 },
                    { opacity: 1 }
                ]
        }
    }

    return { animateOut, animateIn, crossFade }
}

/**
 * Create loader elements and return control functions
 */
const createLoader = (settings) => {
    const loaderType = settings.loader_type || 'progressbar'

    if (loaderType === 'progressbar') {
        return createProgressBar(settings)
    }

    if (loaderType === 'spinner') {
        return createSpinner(settings)
    }

    // No loader - but still support cursor animation
    const animateCursor = settings.animate_cursor === true || settings.animate_cursor === 'true' || settings.animate_cursor === '1'
    const cursorMode = settings.cursor_mode || 'wait'

    // Inject cursor CSS if needed
    if (animateCursor && !document.getElementById('td-spa-cursor-css')) {
        const style = document.createElement('style')
        style.id = 'td-spa-cursor-css'
        style.textContent = `
            .td-spa-cursor-active,
            .td-spa-cursor-active * {
                cursor: ${cursorMode} !important;
            }
        `
        document.head.appendChild(style)
    }

    return {
        element: document.createElement('div'),
        start: () => {
            if (animateCursor) {
                document.documentElement.classList.add('td-spa-cursor-active')
            }
        },
        complete: () => {
            if (animateCursor) {
                document.documentElement.classList.remove('td-spa-cursor-active')
            }
        }
    }
}

/**
 * Create progress bar loader with start/complete controls
 * Behavior: Start on link click → gradually increase width → complete to 100% on load → fade out
 */
const createProgressBar = (settings) => {
    const position = settings.progressbar_position || 'top'
    const color = settings.progressbar_color || '#0073aa'
    const autoHide = settings.progressbar_auto_hide === true || settings.progressbar_auto_hide === 'true' || settings.progressbar_auto_hide === '1'
    const opacity = (parseInt(settings.progressbar_opacity) || 100) / 100
    const animate = settings.progressbar_animate === true || settings.progressbar_animate === 'true' || settings.progressbar_animate === '1'
    const animationSpeed = settings.progressbar_animation_speed || '1.5'
    const customClass = settings.progressbar_class || ''

    // Cursor animation
    const animateCursor = settings.animate_cursor === true || settings.animate_cursor === 'true' || settings.animate_cursor === '1'
    const cursorMode = settings.cursor_mode || 'wait'

    // Inject cursor CSS if needed
    if (animateCursor && !document.getElementById('td-spa-cursor-css')) {
        const style = document.createElement('style')
        style.id = 'td-spa-cursor-css'
        style.textContent = `
            .td-spa-cursor-active,
            .td-spa-cursor-active * {
                cursor: ${cursorMode} !important;
            }
        `
        document.head.appendChild(style)
    }

    // Match admin panel weight values: thin=3px, normal=7px, large=12px
    const getWeight = () => {
        const thickness = settings.progressbar_weight
        if (thickness === 'thin') return '3px'
        if (thickness === 'normal') return '7px'
        if (thickness === 'large') return '12px'
        if (thickness === 'custom') {
            const customValue = settings.progressbar_weight_custom || '7px'
            const validPattern = /^-?\d+(\.\d+)?(px|rem|em|%|vh|vw|vmin|vmax|ch|ex)$/i
            return validPattern.test(customValue.trim()) ? customValue : '7px'
        }
        return thickness ? thickness + 'px' : '7px'
    }
    const weight = getWeight()

    const positionCSS = position === 'bottom'
        ? 'bottom: 0; top: auto;'
        : 'top: 0; bottom: auto;'

    // Inject wave animation CSS if needed
    if (animate && !document.getElementById('td-spa-progressbar-wave-css')) {
        const style = document.createElement('style')
        style.id = 'td-spa-progressbar-wave-css'
        style.textContent = `
            .td-spa-progressbar-bar.progressbar-wave {
                background: linear-gradient(
                    90deg,
                    var(--progressbar-color) 0%,
                    color-mix(in srgb, var(--progressbar-color) 70%, white) 50%,
                    var(--progressbar-color) 100%
                );
                background-size: 200% 100%;
                animation: progressbar-wave var(--animation-speed, 1.5s) linear infinite;
            }
            @keyframes progressbar-wave {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }
        `
        document.head.appendChild(style)
    }

    // Container (track)
    const container = document.createElement('div')
    container.className = `td-spa-progressbar ${customClass}`.trim()
    container.style.cssText = `
        position: fixed;
        ${positionCSS}
        left: 0;
        width: 100%;
        height: ${weight};
        z-index: 1000002;
        overflow: hidden;
        background: transparent;
        opacity: 0;
        transition: opacity 0.3s ease;
    `

    // Inner bar (the actual progress indicator)
    const bar = document.createElement('div')
    bar.className = `td-spa-progressbar-bar ${animate ? 'progressbar-wave' : ''}`.trim()
    bar.style.cssText = `
        width: 0%;
        height: 100%;
        ${animate ? '' : `background-color: ${color};`}
        transition: width 0.4s ease;
        --progressbar-color: ${color};
        --animation-speed: ${animationSpeed}s;
    `
    container.appendChild(bar)

    let progress = 0
    let intervalId = null

    const start = () => {
        // Reset and show
        progress = 0
        bar.style.transition = 'none'
        bar.style.width = '0%'

        // Force reflow
        bar.offsetHeight

        // Show container
        container.style.opacity = String(opacity)

        // Start animating width with smooth easing
        bar.style.transition = 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'

        // Animate cursor
        if (animateCursor) {
            document.documentElement.classList.add('td-spa-cursor-active')
        }

        // YouTube/Facebook style progress animation:
        // - Quick burst to ~30% immediately
        // - Fast progress to ~60% in first 500ms
        // - Moderate progress to ~80% over next 500ms
        // - Slow crawl after 80%, never exceeding 95%
        const tick = () => {
            const random = Math.random()

            let increment = 0
            let nextInterval = 100

            if (progress < 30) {
                // Quick burst: 8-15% per tick
                increment = 8 + random * 7
                nextInterval = 50 + random * 50
            } else if (progress < 60) {
                // Fast progress: 4-8% per tick
                increment = 4 + random * 4
                nextInterval = 80 + random * 80
            } else if (progress < 80) {
                // Moderate: 2-4% per tick
                increment = 2 + random * 2
                nextInterval = 150 + random * 150
            } else if (progress < 90) {
                // Slow crawl: 0.3-0.8% per tick
                increment = 0.3 + random * 0.5
                nextInterval = 300 + random * 400
            } else if (progress < 95) {
                // Very slow crawl: 0.1-0.2% per tick (waiting for page)
                increment = 0.1 + random * 0.1
                nextInterval = 500 + random * 500
            }

            progress = Math.min(progress + increment, 95)
            bar.style.width = `${progress}%`

            // Continue ticking if not stopped
            if (intervalId !== null) {
                intervalId = setTimeout(tick, nextInterval)
            }
        }

        // Start immediately with first tick
        intervalId = setTimeout(tick, 10)
    }

    const complete = () => {
        // Stop progress simulation
        if (intervalId) {
            clearTimeout(intervalId)
            intervalId = null
        }

        // Quickly complete to 100%
        bar.style.transition = 'width 0.2s ease'
        bar.style.width = '100%'

        // Remove cursor animation
        if (animateCursor) {
            document.documentElement.classList.remove('td-spa-cursor-active')
        }

        // Fade out after reaching 100%
        if (autoHide) {
            setTimeout(() => {
                container.style.opacity = '0'
                // Reset bar for next use after fade out
                setTimeout(() => {
                    bar.style.transition = 'none'
                    bar.style.width = '0%'
                    progress = 0
                }, 300)
            }, 250)
        }
    }

    return { element: container, start, complete }
}

/**
 * Create spinner loader with start/complete controls
 */
const createSpinner = (settings) => {
    // Loader settings
    const image = settings.loader_image || ''
    const size = parseInt(settings.loader_image_size) || 40
    const rotation = parseInt(settings.loader_image_rotation) || 0
    const layout = settings.loader_layout || 'icon_left'
    const gap = parseInt(settings.loader_gap) || 5

    // Message settings
    const message = settings.loader_message || ''
    const fontFamily = settings.loader_font_family || 'sans-serif'
    const fontSize = parseInt(settings.loader_font_size) || 13
    const fontWeight = settings.loader_font_weight || 'normal'
    const letterSpacing = parseFloat(settings.loader_letter_spacing) || 0
    const textColor = settings.loader_color || '#000000'

    // Background settings
    const bgColor = settings.loader_background || '#ffffff'
    const bgOpacity = (parseInt(settings.loader_background_opacity) || 100) / 100

    // Cursor settings
    const animateCursor = settings.animate_cursor === true || settings.animate_cursor === 'true' || settings.animate_cursor === '1'
    const cursorMode = settings.cursor_mode || 'wait'
    const disableClicks = settings.disable_mouse_clicks === true || settings.disable_mouse_clicks === 'true' || settings.disable_mouse_clicks === '1'

    // Inject cursor CSS if needed (shared with progressbar)
    if (animateCursor && !document.getElementById('td-spa-cursor-css')) {
        const style = document.createElement('style')
        style.id = 'td-spa-cursor-css'
        style.textContent = `
            .td-spa-cursor-active,
            .td-spa-cursor-active * {
                cursor: ${cursorMode} !important;
            }
        `
        document.head.appendChild(style)
    }

    // Custom class/id
    const customClass = settings.loader_class || ''
    const customId = settings.loader_id || ''

    // Determine flex direction based on layout (match admin preview)
    let flexDirection = 'row'
    if (layout === 'icon_right') flexDirection = 'row-reverse'
    else if (layout === 'icon_top') flexDirection = 'column'
    else if (layout === 'icon_bottom') flexDirection = 'column-reverse'

    // Show icon based on layout
    const showIcon = layout !== 'text_only'
    // Show text based on layout
    const showText = layout !== 'icon_only'

    // Rotation is static transform (not animation) - matches admin preview
    const rotationTransform = rotation ? `transform: rotate(${rotation}deg);` : ''

    // Inject spinner CSS if not already present
    if (!document.getElementById('td-spa-spinner-css')) {
        const style = document.createElement('style')
        style.id = 'td-spa-spinner-css'
        style.textContent = `
            @keyframes td-spa-spin {
                to { transform: rotate(360deg); }
            }
        `
        document.head.appendChild(style)
    }

    const container = document.createElement('div')
    container.className = `td-spa-spinner ${customClass}`.trim()
    if (customId) container.id = customId
    container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1000001;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s ease;
    `

    container.innerHTML = `
        <div class="td-spa-spinner-overlay" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: ${bgColor};
            opacity: ${bgOpacity};
            z-index: 1000002;
            ${disableClicks ? 'pointer-events: auto;' : 'pointer-events: none;'}
        "></div>
        <div class="td-spa-spinner-content" style="
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 1000003;
            display: flex;
            flex-direction: ${flexDirection};
            align-items: center;
            justify-content: center;
            gap: ${gap}px;
        ">
            ${showIcon ? (image ? `
                <img
                    src="${image}"
                    alt="Loading"
                    class="td-spa-spinner-image"
                    style="
                        width: ${size}px;
                        height: auto;
                        ${rotationTransform}
                    "
                >
            ` : `
                <div class="td-spa-spinner-icon" style="
                    width: ${size}px;
                    height: ${size}px;
                    border: 3px solid #e0e0e0;
                    border-top-color: ${textColor};
                    border-radius: 50%;
                    animation: td-spa-spin 0.8s linear infinite;
                "></div>
            `) : ''}
            ${showText && message ? `
                <span class="td-spa-spinner-text" style="
                    color: ${textColor};
                    font-family: ${fontFamily};
                    font-size: ${fontSize}px;
                    font-weight: ${fontWeight};
                    letter-spacing: ${letterSpacing}px;
                    text-align: center;
                ">${message}</span>
            ` : ''}
        </div>
    `

    const start = () => {
        // Add to DOM if not already present
        if (!container.parentNode) {
            document.body.appendChild(container)
        }
        container.style.opacity = '1'
        container.style.pointerEvents = 'auto'
        if (animateCursor) {
            document.documentElement.classList.add('td-spa-cursor-active')
        }
    }

    const complete = () => {
        container.style.opacity = '0'
        container.style.pointerEvents = 'none'
        if (animateCursor) {
            document.documentElement.classList.remove('td-spa-cursor-active')
        }
        // Remove from DOM after fade out
        setTimeout(() => {
            if (container.parentNode) {
                container.parentNode.removeChild(container)
            }
        }, 200) // match transition duration
    }

    return { element: container, start, complete, isSpinner: true }
}

/**
 * Get user-defined ignore link patterns from settings
 */
const getIgnoreLinkPatterns = () => {
    const settings = td_spa_vars?.settings || {}
    return (settings.ignore_links || '')
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0)
}

/**
 * Check if URL matches a pattern (supports wildcards and regex)
 */
const matchesPattern = (url, pattern) => {
    try {
        // Check if pattern is a regex (starts and ends with /)
        if (pattern.startsWith('/') && pattern.lastIndexOf('/') > 0) {
            const lastSlash = pattern.lastIndexOf('/')
            const regexStr = pattern.slice(1, lastSlash)
            const flags = pattern.slice(lastSlash + 1)
            const regex = new RegExp(regexStr, flags)
            return regex.test(url)
        }

        // Convert wildcard pattern to regex
        // * matches any characters, ** matches any path segments
        const escapedPattern = pattern
            .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
            .replace(/\*\*/g, '{{DOUBLE_STAR}}')   // Temporarily replace **
            .replace(/\*/g, '[^/]*')               // * matches anything except /
            .replace(/{{DOUBLE_STAR}}/g, '.*')     // ** matches anything including /
            .replace(/\?/g, '.')                   // ? matches single char

        const regex = new RegExp(escapedPattern, 'i')
        return regex.test(url)
    } catch (e) {
        // Fallback to simple includes check
        return url.includes(pattern)
    }
}

/**
 * Check if a URL should bypass iframe (load in parent window)
 */
const shouldBypass = (url) => {
    if (!url || typeof url !== 'string') return false

    // Check bypass schemes
    for (const scheme of BYPASS_SCHEMES) {
        if (url.startsWith(scheme)) return true
    }

    try {
        const linkUrl = new URL(url, window.location.origin)

        // External link (different origin)
        if (linkUrl.origin !== window.location.origin) return true

        // Frontend and wp-admin never share a shell - see crossesAdminBoundary.
        if (crossesAdminBoundary(linkUrl.href)) return true

        // A page-builder session owns its own document - see BUILDER_QUERY_FLAGS.
        if (isBuilderSession(linkUrl.href)) return true

        // Check bypass patterns (context-aware)
        const fullPath = linkUrl.pathname + linkUrl.search
        const bypassPatterns = getBypassPatterns()
        for (const pattern of bypassPatterns) {
            if (fullPath.includes(pattern)) return true
        }

        // Check user-defined ignore patterns from settings
        const ignorePatterns = getIgnoreLinkPatterns()
        for (const pattern of ignorePatterns) {
            if (matchesPattern(fullPath, pattern)) return true
        }
    } catch (e) {
        return false
    }

    return false
}

/**
 * Initialize iframe child - notify parent of navigation
 */
const initIframeChild = () => {
    const settings = td_spa_vars?.settings || {}

    // Tell crawlers not to index the iframe sub-document independently of
    // its parent. The parent shell carries the canonical, JSON-LD, and
    // social tags (synced from here); this nested copy is purely render
    // scaffolding. The marker attribute keeps the parent's meta-sync from
    // pulling this noindex back into the indexable shell.
    if (!document.head.querySelector('meta[name="robots"][data-td-spa-iframe-only]')) {
        const robots = document.createElement('meta')
        robots.setAttribute('name', 'robots')
        robots.setAttribute('content', 'noindex,nofollow')
        robots.setAttribute('data-td-spa-iframe-only', '')
        document.head.appendChild(robots)
    }

    // Opt-in escape hatch: send auth forms through a full top-level page
    // load instead of SPA navigation. Off by default - logging in over SPA
    // works (the cookie is set on the background-iframe response like any
    // other), so the default keeps the app-like experience. Sites whose
    // login flow genuinely needs a real navigation can turn it on.
    const bypassAuthForms = settings.bypass_auth_forms === true ||
                            settings.bypass_auth_forms === 'true' ||
                            settings.bypass_auth_forms === '1'

    // Block keyboard reload shortcuts (Ctrl+R, Cmd+R, F5)
    const blockKeyboardReload = settings.block_keyboard_reload === true ||
                                 settings.block_keyboard_reload === 'true' ||
                                 settings.block_keyboard_reload === '1'

    if (blockKeyboardReload) {
        document.addEventListener('keydown', (e) => {
            // Block F5
            if (e.key === 'F5') {
                e.preventDefault()
                return false
            }
            // Block Ctrl+R / Cmd+R
            if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
                e.preventDefault()
                return false
            }
        })
    }

    // Flash notices (e.g. WooCommerce login errors) render in the POST/PRG
    // response, which becomes the hidden parent shell; by the time this
    // iframe re-GETs the URL the session notice is already consumed. Copy
    // the parent's notices into the visible document, then clear them so
    // later SPA navigations can't re-inject stale ones.
    try {
        const parentNotices = window.parent.document.querySelector('.woocommerce-notices-wrapper')
        const ownNotices = document.querySelector('.woocommerce-notices-wrapper')
        if (parentNotices && ownNotices &&
            parentNotices.children.length && !ownNotices.children.length) {
            ownNotices.innerHTML = parentNotices.innerHTML
            parentNotices.innerHTML = ''
        }
    } catch (e) {
        // Parent document inaccessible - nothing to sync.
    }

    // Notify parent of current page on load once the DOM is ready.
    // Waiting for DOMContentLoaded/load prevents handover while Elementor sections/images are half-rendered.
    const notifyParent = () => {
        window.parent.postMessage({
            type: 'TD_SPA_NAV',
            url: window.location.href,
            title: document.title
        }, window.location.origin)
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', notifyParent, { once: true })
    } else {
        notifyParent()
    }

    // Watch for title changes
    const titleObserver = new MutationObserver(() => {
        notifyParent()
    })

    const titleEl = document.querySelector('title')
    if (titleEl) {
        titleObserver.observe(titleEl, { childList: true, characterData: true, subtree: true })
    }

    // Prefetch timeout for debouncing
    let prefetchTimeout = null

    // Request prefetch from parent
    const requestPrefetch = (url) => {
        if (!url || shouldBypass(url)) return

        window.parent.postMessage({
            type: 'TD_SPA_PREFETCH_REQUEST',
            url
        }, window.location.origin)
    }

    // Prefetch on hover (with debounce)
    document.addEventListener('mouseover', (e) => {
        const anchor = e.target.closest('a')
        if (!anchor) return

        const hrefAttr = anchor.getAttribute('href')
        if (!hrefAttr) return

        // Skip hash-only links
        if (hrefAttr === '#' || (hrefAttr.startsWith('#') && !hrefAttr.includes('/'))) return

        // Skip javascript: links
        if (hrefAttr.startsWith('javascript:')) return

        const fullUrl = anchor.href
        if (!fullUrl || shouldBypass(fullUrl)) return

        // Skip special targets and downloads (we won't intercept these clicks)
        const target = getEffectiveTarget(anchor)
        if (target === '_blank' || target === '_top' || target === '_parent') return
        if (anchor.hasAttribute('download')) return

        // Skip same-page hash links
        const currentUrl = window.location.href.split('#')[0]
        const targetUrl = fullUrl.split('#')[0]
        if (targetUrl === currentUrl && fullUrl.includes('#')) return

        // Debounce - wait 100ms before prefetching
        clearTimeout(prefetchTimeout)
        prefetchTimeout = setTimeout(() => {
            requestPrefetch(fullUrl)
        }, 100)
    }, { passive: true })

    // Cancel prefetch on mouseout
    document.addEventListener('mouseout', (e) => {
        if (e.target.closest('a')) {
            clearTimeout(prefetchTimeout)
        }
    }, { passive: true })

    // Intercept link clicks - prevent default and let parent handle navigation.
    //
    // Deliberately a bubble-phase listener, for the same reason as the submit
    // handler below. Plenty of UI is a link in markup but a toggle in
    // behaviour: a WooCommerce/theme mini cart, offcanvas and mega-menu
    // openers, quick view, search overlays. Those bind a handler to the anchor
    // that opens a panel and calls preventDefault instead of navigating.
    // Capturing ahead of them ran both: the panel opened *and* TD SPA
    // navigated to the link's href, so a mini cart flashed its widget and then
    // dropped the visitor on the cart page.
    //
    // Running last means defaultPrevented tells us to stay out. The trade-off
    // is a script that calls stopPropagation on a link click without
    // preventDefault: the click never reaches here and the browser performs a
    // normal full page load, which is a graceful fallback rather than a break.
    //
    // Bound to window, not document, and that distinction is the whole point.
    // Themes usually open these panels from a delegated handler on `document`
    // rather than from one on the anchor, and between two listeners on the same
    // node in the same phase the earlier registration wins. TD SPA boots
    // before most theme scripts, so on `document` it kept firing first and
    // navigating anyway - the panel opened and the visitor still landed on the
    // cart page. `window` is the last stop in the bubble path, so every
    // document-level handler has already had its say, whatever order it
    // registered in.
    window.addEventListener('click', (e) => {
        // Another handler already owns this click - it is acting as a control,
        // not a link.
        if (e.defaultPrevented) return

        const anchor = e.target.closest('a')
        if (!anchor) return

        // Clicks the browser should own: non-primary button and modifier-key
        // clicks (Cmd/Ctrl = new tab, Shift = new window, Alt = download).
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

        // Download links: intercepting would navigate instead of downloading
        if (anchor.hasAttribute('download')) return

        const href = anchor.getAttribute('href')
        if (!href) return

        // Skip hash-only links (let them work normally)
        if (href === '#' || (href.startsWith('#') && !href.includes('/'))) return

        // Skip javascript: links
        if (href.startsWith('javascript:')) return

        // Skip same-page hash links (e.g., /page#section when on /page)
        const fullUrl = anchor.href
        const currentUrl = window.location.href.split('#')[0]
        const targetUrl = fullUrl.split('#')[0]
        if (targetUrl === currentUrl && fullUrl.includes('#')) return

        // Honor the effective target (own attribute or <base target>) - must run
        // before shouldBypass so external _blank links open in a new tab instead
        // of being captured by the bypass branch.
        const target = getEffectiveTarget(anchor)
        if (target === '_blank' || target === '_top' || target === '_parent') return

        // Check if link should bypass iframe
        if (shouldBypass(fullUrl)) {
            // Load in parent window (break out of iframe)
            e.preventDefault()
            window.top.location.href = fullUrl
            return
        }

        // Prevent default navigation - parent will handle it
        e.preventDefault()

        // Clear any pending prefetch timeout
        clearTimeout(prefetchTimeout)

        // Request navigation from parent (parent will load in background iframe and crossfade)
        window.parent.postMessage({
            type: 'TD_SPA_NAVIGATE',
            url: fullUrl
        }, window.location.origin)
    })

    // Intercept form submissions - submit in background iframe and crossfade.
    // Deliberately a bubble-phase listener: page scripts that submit a form
    // themselves (classic WooCommerce checkout, most contact-form plugins)
    // call preventDefault in their own submit handler. Capturing ahead of
    // them would replay the POST here *and* let their AJAX fire, submitting
    // twice. Running last means defaultPrevented tells us to stay out.
    const onSubmit = (e) => {
        const form = e.target
        if (!form || form.tagName !== 'FORM') return

        // Another handler already owns this submission.
        if (e.defaultPrevented) return

        // Explicit opt-out, on the form or any ancestor. The escape hatch for
        // a form whose own handler binds too late for defaultPrevented to
        // have been set by the time this runs.
        if (form.closest(IGNORE_SUBMIT_SELECTOR)) return

        const action = getFormAction(form)
        const method = (form.getAttribute('method') || 'GET').toUpperCase()

        // Check if form should bypass iframe
        if (shouldBypass(action)) {
            form.target = '_top'
            return
        }

        // Auth forms must submit natively: login/registration sets cookies
        // and redirects, which requires a real top-level page load.
        if (bypassAuthForms && isAuthForm(form)) {
            form.target = '_top'
            return
        }

        // Skip forms with file inputs (too complex to serialize)
        if (form.querySelector('input[type="file"]')) {
            return
        }

        // Skip forms with special effective targets (own attribute or <base target>)
        const formTarget = getEffectiveTarget(form)
        if (formTarget === '_blank' || formTarget === '_top' || formTarget === '_parent') {
            return
        }

        // Prevent default - we'll handle it
        e.preventDefault()

        // Request form submission from parent
        window.parent.postMessage({
            type: 'TD_SPA_FORM_SUBMIT',
            action,
            method,
            data: serializeForm(form, e.submitter),
            enctype: form.getAttribute('enctype') || 'application/x-www-form-urlencoded'
        }, window.location.origin)
    }
    document.addEventListener('submit', onSubmit, false)
    reRegisterSubmitLast(onSubmit)

    // Watch for programmatic navigation
    const originalPushState = history.pushState.bind(history)
    const originalReplaceState = history.replaceState.bind(history)

    history.pushState = (...args) => {
        originalPushState(...args)
        notifyParent()
    }

    history.replaceState = (...args) => {
        originalReplaceState(...args)
        notifyParent()
    }

    window.addEventListener('popstate', notifyParent)
}

export default IframeContainer
