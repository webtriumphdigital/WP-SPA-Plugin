=== TD SPA - SPA & Ajax Navigation with Persistent Audio Player for Radio ===
Contributors: Triumph Digital
Tags: ajax, spa, persistent player, radio, podcast
Requires at least: 5.3
Tested up to: 7.0
Stable tag: 0.1.0
Requires PHP: 7.1
License: GPLv3
License URI: https://www.gnu.org/licenses/gpl-3.0.html

Keep radio, podcasts and audio playing while visitors browse. Ajax navigation turns your site into a fast single page application.

== Description ==

**Your radio stream, podcast or music keeps playing while visitors browse your whole site.**

On a normal WordPress site, every click reloads the page - and the audio stops. Listeners have to press play again, and most of them don't. TD SPA replaces full page reloads with instant ajax navigation, so the player never cuts out.



**Audio and video never stop.** Live radio streams, podcast episodes and music keep playing seamlessly across every page. Built for radio stations, podcast networks and music platforms - the one thing a normal WordPress site cannot do.

**Instant page loads.** Visitors get smooth page transitions with no white screens and no waiting. Lower bounce rates, longer sessions.

[youtube https://www.youtube.com/watch?v=Sq0b3PVJJfs]

= How It Works =

TD SPA intercepts internal link clicks and loads the next page over ajax instead of a full browser reload. Real URLs are preserved via the History API, the page title and head metadata (canonical, OpenGraph, JSON-LD) are synced on every navigation, and back/forward buttons work exactly as expected. Search engines crawl your site normally - nothing changes for SEO.

= Compatible With Your Theme, Page Builder, and Plugins =

TD SPA is built for maximum compatibility and tested against the most popular themes, page builders, and plugins. Just activate - no configuration needed.

**Themes:** Astra, GeneratePress, Kadence, OceanWP, Hello Elementor, Blocksy, Neve, Divi, Avada, Flatsome, Storefront, and more.

**Page builders:** Elementor, Bricks, Beaver Builder, Divi Builder, WPBakery, Oxygen, Breakdance, Zion Builder, Spectra, Gutenberg, and more.

Page builders are supported on the frontend - the pages they build navigate like any other. Editing is left alone: when you open a page in Divi, Bricks, Beaver Builder, Oxygen, Breakdance or the Customizer, TD SPA recognises the builder and steps aside completely, so the builder loads exactly as it would without the plugin. Nothing to configure. If you have turned on "SPA for Admin Dashboard", we still suggest leaving it off while you build.

**Forms:** Contact Form 7, WPForms, Gravity Forms, Formidable Forms, Ninja Forms, Fluent Forms, Elementor Forms, and more.

**Caching:** WP Rocket, LiteSpeed Cache, W3 Total Cache, WP Super Cache, SG Optimizer, Cloudflare, Bunny CDN, and more.

**SEO:** Yoast SEO, Rank Math, All in One SEO, SEOPress, and more.

**eCommerce:** Full WooCommerce compatibility including products, cart, checkout, and extensions. Also works with Easy Digital Downloads.

**Modern JS frameworks:** React, Vue, Solid and Alpine.js pages work without style breaking or script conflicts.

**Browsers and devices:** Chrome, Firefox, Safari, Edge and Opera, on desktop, tablet and mobile.

= Single Page Application Features =

* **Ajax navigation** - app-like page changes with no full reload
* **Persistent audio and video player** - media keeps playing across your whole site. Free for any player you can mark up (see the FAQ); the Pro settings screen lets you point at a player with any CSS selector instead
* **Instant page loading** - no refresh, no white screen between pages
* **Smart prefetch** (Pro) - pages preload on hover, before the click
* **Page transitions** - fade, slide and custom animations
* **Progress bar** - a loading indicator so visitors know something is happening
* **SEO friendly** - real URLs via the History API, per-page meta tags, canonical and JSON-LD synced on every navigation, and normal crawling. Works with Yoast, Rank Math and AIOSEO, and reports correctly to Google Analytics
* **Mobile optimised** - works the same on desktop, tablet and mobile

**Want more?** [Go Pro](https://www.triumphdigital.co.th) - Advanced features and priority support

= Built for Radio, Podcast, Music, and Content Sites =

Radio stations and live streams keep their listeners through every click. Podcast networks let an episode run while visitors browse the archive. Music sites and artist portfolios play without a pause. The same ajax navigation makes product browsing, article reading and portfolio and video catalogues feel instant on any other kind of site.

= TD SPA Pro =

**Take your site to the next level.** The free version is powerful - TD SPA Pro unlocks advanced features and priority support for sites that need more.

**[See TD SPA Pro Plans and Pricing](https://www.triumphdigital.co.th)**

= Source Code =

The JavaScript that runs on your site is minified for size. The unminified source it is built from ships inside the plugin, under `src/`, along with the Vite configs and `package.json` needed to rebuild it. `src/frontend/` builds `public/js/td-spa.min.js` and `src/admin/` builds `public/js/admin.min.js`, both with [Vite](https://vitejs.dev/).

From the plugin folder:

`npm install`
`npx vite build --config ./src/frontend/vite.config.js`
`npx vite build --config ./src/admin/vite.config.js`

= Privacy & External Services =

TD SPA does not send anything anywhere on its own. Nothing below runs unless you turn it on or connect it, and none of it touches your visitors: no data from your site's frontend is ever collected.

**PackEdge** (optional diagnostics)

Optionally, and **only with your explicit consent**, TD SPA can share non-confidential diagnostic data (such as PHP and WordPress version and plugin settings) with `api.packedge.dev` so we can reproduce and fix issues faster. You can review exactly what is shared and opt out at any time. See the [PackEdge site](https://packedge.dev) and [privacy policy](https://packedge.dev/privacy/).

**Cloudflare** (edge caching, optional)

If you connect a Cloudflare account on the Cache screen, TD SPA talks to the Cloudflare API at `api.cloudflare.com` on your behalf to read zones and manage caching rules for your site. Nothing is sent to Cloudflare until you connect. See the [Cloudflare privacy policy](https://www.cloudflare.com/privacypolicy/) and [terms](https://www.cloudflare.com/terms/).

If you use the one-click "Connect with Cloudflare" option, the authorization step passes through an OAuth relay we operate at `td-spa-oauth.astory.workers.dev`. The relay exists so the OAuth client secret never has to ship inside the plugin. It exchanges the authorization code for a token and hands it back to your site; the token is stored encrypted in your database. You can skip the relay entirely by pasting your own Cloudflare API token instead, which never leaves your server except to Cloudflare.

== Installation ==

**Get started in 3 steps:**

1. Go to **Plugins > Add New**
2. Search for **TD SPA**
3. Click **Install Now**, then **Activate**

**That's it.** Your site is now a single page application, with no configuration needed.

Optional: Visit **Settings > TD SPA** for customization options, or upgrade to [Pro for advanced features](https://www.triumphdigital.co.th).

== Frequently Asked Questions ==

= What is a single page application (SPA) in WordPress? =

A single page application loads the site shell once and then swaps only the content when you move between pages, instead of reloading the whole browser page every time. TD SPA turns an ordinary WordPress site into one without you rebuilding anything: it intercepts internal links, fetches the next page over ajax and replaces the content in place. URLs, the back button and search engine crawling all keep working as before.

= How do I keep my radio player playing between pages? =

Mark up the element that wraps your player so TD SPA knows to carry it across navigation. Add `data-td-spa-persist` to it, or the class `td-spa-persist`, or give it an id starting with `persistent-`. The player element itself is then moved to the next page as the live element, so the stream never restarts. All of this works in the free version. If a theme or another plugin renders the player and you cannot edit its markup, the Media Players field in Pro lets you target it with a CSS selector.

= Does ajax navigation work with WooCommerce? =

Yes. Product pages, category browsing, the mini cart, ajax add-to-cart, the cart, checkout and My Account login and registration all work over ajax. Dynamic pages are excluded from edge caching automatically, so nobody is served another shopper's cart.

= Will it work with my theme? =

Yes. TD SPA is tested with Astra, GeneratePress, Kadence, Divi, Avada, OceanWP, Blocksy, Neve, Flatsome, Storefront, and many more. No configuration needed.

= Will it work with my page builder? =

Yes. Elementor, Bricks, Beaver Builder, Divi Builder, WPBakery, Oxygen, Breakdance, and Gutenberg are all tested and supported.

= Will my forms work? =

Yes. Contact Form 7, WPForms, Gravity Forms, Formidable Forms, Ninja Forms, Fluent Forms, and Elementor Forms all work out of the box.

= Will my audio/video keep playing during navigation? =

Yes - that's TD SPA's signature feature. Your media player continues uninterrupted while visitors browse your entire site.

TD SPA recognises a player it should keep alive in any of these ways, all of which work in the free version. Add whichever is easiest to the element wrapping your player:

* `data-td-spa-persist` on the element, for example `<div id="radio" data-td-spa-persist>`
* the class `td-spa-persist`
* an id starting with `persistent-`, for example `<div id="persistent-radio">`
* `data-persist` on an `<audio>` or `<video>` tag

If you cannot edit the markup - a player added by your theme or another plugin - the Media Players field in the Pro settings lets you point at it with any CSS selector instead.

= Does it work with caching plugins? =

Yes. WP Rocket, LiteSpeed Cache, W3 Total Cache, WP Super Cache, SG Optimizer, Cloudflare, and Bunny CDN are all supported.

= Will it break my SEO? =

No. TD SPA uses real URLs via the History API and syncs meta tags, canonical tags, and JSON-LD structured data on every navigation. Search engines crawl your site normally. Works with Yoast, Rank Math, and all major SEO plugins.

= Does it work with React/Vue/Solid pages? =

Yes. Pages built with modern JS frameworks work without style breaking or script conflicts. No configuration needed.

= Does it work on mobile? =

Yes. All modern browsers on all devices - desktop, tablet, and mobile - are fully supported.

== Screenshots ==

1. Navigation settings - control how ajax navigation behaves across your site
2. Loader styles - pick the loading indicator that matches your brand
3. Cursor behaviours - subtle cues that make navigation feel instant
4. Transitions and page content animations - fade, slide, and custom effects
5. Preserve Elements - keep audio/video players playing across every page

== Changelog ==

= 2.4.2 =
* Fix: Opening a page in a visual builder could leave the builder blank or unresponsive. Divi, Bricks, Beaver Builder, Oxygen, Breakdance, WPBakery, Visual Composer, Zion, Thrive and Brizy all open on the ordinary front-end address of the page with a marker on the end, and TD SPA was treating that as a page to take over. It now recognises a builder session and stays out of it entirely, on the page itself and on any link leading to one. The Customizer preview is treated the same way
* Fix: Google Analytics 4 reported "Average engagement time" as zero on every page. Analytics measure engagement against the page the visitor is looking at, and that page had never been handed keyboard focus, so no time was ever counted however long someone stayed. Engagement is measured again, for Google Analytics and for any other script that works the same way
* Fix: Cookie and consent banners could appear twice on the first page someone loads, along with anything else a script adds after the page is ready - promo popups, chat widgets, sticky bars. Only one copy is shown now
* Fix: A form could be submitted twice when the plugin behind it attaches its handler to the page rather than to the form. The entry was saved, but the plugin's own follow-up - the confirmation message, the notification email - could be cut off part way. Forms whose plugin attaches to the form itself, which is most of them, were never affected
* New: Add data-td-spa-ignore-submit to a form, or to anything containing it, to keep it out of ajax submission entirely and let it submit the ordinary way
* Fix: Mini carts and other panel toggles still navigated away on 2.4.1 when the theme opens the panel from a shared click handler rather than one attached to the link itself, which is what most themes do. Tapping the cart icon opened the mini cart and then landed the visitor on the cart page anyway
* Fix: A page's own script could stop running partway through. Where a persistent player was carried over, the copy on the incoming page was taken out before that page's script looked for it, so the script hit a missing element and everything after it in the same block never ran, commonly other footer features like popups

= 2.4.1 =
* Fix: Media players kept on screen across navigation stopped responding - Play, Stop and open/close buttons did nothing, with no error and no sound. The player is now carried over as the live element instead of being rebuilt from its markup, so whatever script powers it keeps working
* Fix: A persistent player could be dropped mid-navigation on slower pages - the audio simply stopped. Pages that are still loading when navigation completes are no longer mistaken for pages that have no player
* Fix: Links that act as buttons now keep working - a WooCommerce or theme mini cart, offcanvas panels, mega menu and search toggles, quick view. Tapping one opened its panel and then navigated to the link's page anyway, which on mobile dropped shoppers on the cart page. WooCommerce's ajax "Add to cart" was affected the same way and added the product by reloading the page instead
* Changed: The plugin now ships its unminified JavaScript sources, so the code behind the minified bundles can be read and rebuilt from the download itself
* Changed: The readme now documents every external service TD SPA can talk to, what triggers each one and what is sent: PackEdge, Cloudflare, our Cloudflare OAuth relay, and the optional deactivation feedback form
* Changed: The optional deactivation feedback form no longer sends your WordPress username. Only the reason, your comment and the site URL are sent, and only if you submit the form

= 2.4.0 =
* New: Connect to Cloudflare in one click with OAuth - no API token to create or paste (where available; pasting a token still works everywhere)
* New: "Don't cache this page" toggle in the editor (classic and block), for pages that should always be served fresh
* New: Dynamic pages are excluded from edge caching automatically - WooCommerce cart, checkout and account, add-to-cart links, and anything that sets cookies or uses nonces
* New: Cache health readout and a Pause switch to stop edge caching instantly without disconnecting
* New: Edits appear without anyone waiting. Update a page and the next visitor gets the existing copy instantly while Cloudflare fetches the new version behind them - you publish, it appears, and nobody has to purge anything
* New: "Scan my pages" finds pages that should not be cached (cookies, security tokens, forms) and excludes them in one click
* Improved: The Cache screen is reorganised - everything about excluding pages in one place, rarely-used settings tucked behind "Show advanced settings"
* New: Optional second cache layer that keeps a globally shared copy of your pages, so visitors in regions that have not loaded a page yet are still served by Cloudflare rather than your server
* New: Exclude individual posts and pages by searching for them, and exclude whole categories, tags or other taxonomy terms
* New: Configurable edge cache lifetime and exclude-URL list
* Improved: Edge page caching now reliably caches HTML and applies changes without redeploying the Cloudflare worker
* Improved: The Cache screen shows whether your Cloudflare account is connected and how, and returning from the Cloudflare authorization screen lands back on the Cache settings with a clear result message
* New: Logging in and registering now work over ajax with no page refresh, the same as the rest of your site. This includes the WooCommerce My Account login and registration forms, and a failed login shows its error in place
* New: The WordPress login screen (wp-login.php) is now part of the SPA. Signing in, registering, and resetting a password no longer reload the page, and a failed attempt shows its error in place. If a login sends you outside the SPA, such as the dashboard, TD SPA hands over to a normal page load. Opt out with the full page reload setting for auth forms or the `td_spa_ajax_login` filter
* New: Full Page Reload on Login & Registration setting, off by default, for sign-in flows that need a real page load
* Fixed: Logging in or registering through WooCommerce My Account did nothing when TD SPA was active. The clicked button's value was dropped from intercepted submissions, which WooCommerce relies on. This also affected contact forms, search filters, and admin save buttons
* Fixed: Forms containing a field named "action", "method", "submit", or "target" broke form handling entirely. Nearly every WordPress admin form uses this pattern, as does any plugin form posting to admin-ajax.php or admin-post.php
* Fixed: Forms whose own JavaScript submits them, such as the classic WooCommerce checkout and most contact form plugins, could be submitted twice
* Fixed: On a freshly loaded or reloaded page, submitting a form could reload the whole page instead of submitting over ajax, while the same form worked after navigating to the page from elsewhere. The page shell's duplicate copy of the form is now disabled, and anything reaching it is routed through ajax
* Fixed: WooCommerce notices were missing after a form submission, so failed logins showed no error
* Fixed: A persistent player kept playing on pages that do not include one. Player continuity now follows the page: added when a page has one and the shell does not, kept playing when the next page has the same one, removed when the next page has none
* Fixed: A persistent audio or video player could carry over from the frontend into the WordPress dashboard and keep playing there. The frontend and the dashboard never share a player: moving between them is always a normal page load
* Fixed: Several admin dashboard screens did not save correctly with SPA for Admin Dashboard enabled
* Changed: On WordPress 7.0 and newer the settings screen recommends leaving SPA for Admin Dashboard off, since WordPress now navigates the dashboard itself. On older versions it stays highlighted

For full changelog, see [changelog.txt](https://plugins.svn.wordpress.org/td-spa/trunk/changelog.txt)

== Upgrade Notice ==

= 2.4.2 =
Fixes visual builders loading blank or unresponsive - Divi, Bricks, Beaver Builder, Oxygen, Breakdance and others. Restores Google Analytics engagement time, which read zero on every page, and stops consent banners and other late-loading widgets appearing twice. Also completes the 2.4.1 mini cart fix and stops a carried-over player breaking the rest of a theme's footer script. Recommended for all sites.

= 2.4.1 =
Fixes mini cart and other button-like links navigating away instead of opening their panel, and WooCommerce ajax "Add to cart" reloading the page. Also fixes media players kept across navigation becoming unresponsive. Recommended for all sites, especially WooCommerce stores.

= 2.4.0 =
Fixes login and registration failing on WooCommerce My Account, plus a form handling bug affecting contact forms, search filters and most admin screens. Also a major Cloudflare edge cache upgrade: one-click OAuth connect and a per-page "don't cache" toggle. Recommended for all sites.
