import { createMemo, Show } from "solid-js";
import { Switch, Meter } from "@components";
import { useSettings, useLicense } from "@util/context";

export default function Basic() {
    const { settings, saveSettings } = useSettings();
    const { isLocked, shakePromo } = useLicense();

    /**
     * Handle Admin SPA toggle with full page reload.
     * This breaks out of iframe and reloads to apply/remove the iframe wrapper.
     */
    const handleAdminSpaToggle = (value) => {
        const previousValue = settings.enable_admin_spa;
        settings.enable_admin_spa = value;

        // Only reload if value actually changed after successful save
        if (previousValue !== value) {
            saveSettings().then((result) => {
                if (result?.success) {
                    setTimeout(() => {
                        window.top.location.reload();
                    }, 300);
                }
            });
        }
    };

    // WordPress 7.0 navigates the dashboard itself, so the plugin's Admin SPA
    // is redundant there - and two navigators on one screen invite conflicts.
    // Below 7.0 it is the only way to get it, so it stays a selling point.
    const wp = window.td_spa_admin_vars?.wp || {};
    const wpHasNativeAdminSpa = () => !!wp.has_native_admin_spa;

    const meterSpeed = createMemo(() => {
        if (settings.enable_navigation && settings.enable_prefetch) {
            return 100;
        }
        if (settings.enable_navigation) {
            return 77.5;
        }
        return 27.5;
    });

    return (
        <section class="ap-flex ap-flex-col min-[1080px]:ap-flex-row ap-gap-6 sm:ap-gap-10 ap-justify-between ap-flex-wrap">
            <div class="ap-flex-1 ap-min-w-0">
                <div class="ap-space-y-6 sm:ap-space-y-10">
                    <Switch
                        data-tour="instant-navigation"
                        value={settings.enable_navigation}
                        onChange={(v) => (settings.enable_navigation = v)}
                        subtitle="Smooth navigation, forms, and search. Everything without refresh."
                        instantSave={true}
                        tooltip={
                            <>
                                <strong>
                                    Enables SPA (Single Page Application) mode
                                </strong>{" "}
                                for your entire frontend.
                                <br />
                                <br />• <strong>Smooth navigation</strong>:
                                pages, posts, and products load instantly
                                <br />• <strong>Smooth form submissions</strong>
                                : contact forms, checkouts without refresh
                                <br />• <strong>Smooth search</strong>: search
                                results appear seamlessly
                                <br />
                                <br />
                                Everything works without a full page reload,
                                creating an app-like experience.
                                <br />
                                <br />
                                <a
                                    href="https://www.triumphdigital.co.th"
                                    target="_blank"
                                    class="ap-text-indigo-600 hover:ap-text-indigo-700 ap-underline"
                                >
                                    Learn more
                                </a>
                            </>
                        }
                    >
                        Enable SPA for Frontend
                    </Switch>

                    <Switch
                        value={settings.enable_admin_spa}
                        onChange={(v) =>
                            isLocked() ? shakePromo() : handleAdminSpaToggle(v)
                        }
                        subtitle={
                            wpHasNativeAdminSpa()
                                ? `WordPress ${wp.version} navigates the dashboard on its own. Best left off.`
                                : "Smooth admin navigation and form saves. No refresh needed."
                        }
                        locked={isLocked()}
                        tooltip={
                            <>
                                <strong>
                                    Enables SPA mode for WordPress admin area.
                                </strong>
                                <br />
                                <br />• <strong>Smooth navigation</strong>:
                                admin pages load instantly
                                <br />• <strong>Smooth form submissions</strong>
                                : settings save without refresh
                                <br />• <strong>Faster workflows</strong>:
                                seamless editing experience
                                <br />
                                <br />
                                Everything works without a full page reload.
                                <br />
                                <br />
                                <Show
                                    when={wpHasNativeAdminSpa()}
                                    fallback={
                                        <em>
                                            Beta: May not work with all plugins.
                                        </em>
                                    }
                                >
                                    <em>
                                        WordPress {wp.version} already does this
                                        natively, so leaving this off is
                                        recommended. Running two navigators at
                                        once can conflict.
                                    </em>
                                </Show>
                            </>
                        }
                        badge={
                            <span
                                class="ap-text-[10px] ap-font-bold ap-px-1.5 ap-py-0.5 ap-rounded ap-uppercase"
                                style="background: #fef3c7; color: #b45309"
                            >
                                Beta
                            </span>
                        }
                        content={
                            <Show
                                when={wpHasNativeAdminSpa()}
                                fallback={
                                    <div class="ap-flex ap-gap-2 ap-rounded-md ap-bg-indigo-50 ap-px-3 ap-py-2 ap-text-sm ap-text-indigo-800">
                                        <span aria-hidden="true">⚡</span>
                                        <span>
                                            WordPress {wp.version} has no
                                            dashboard navigation of its own.
                                            This is the only way to get instant
                                            admin page loads.
                                        </span>
                                    </div>
                                }
                            >
                                <div class="ap-flex ap-gap-2 ap-rounded-md ap-bg-amber-50 ap-px-3 ap-py-2 ap-text-sm ap-text-amber-800">
                                    <span aria-hidden="true">ℹ️</span>
                                    <span>
                                        WordPress {wp.version} ships its own
                                        dashboard navigation, so this is no
                                        longer needed. Turning it off is
                                        recommended - two navigators on the same
                                        screen can conflict.
                                    </span>
                                </div>
                            </Show>
                        }
                    >
                        Enable SPA for Admin Dashboard
                    </Switch>

                    <Show when={settings.enable_navigation}>
                        <Switch
                            data-tour="prefetch-toggle"
                            value={settings.enable_prefetch}
                            onChange={(v) =>
                                isLocked()
                                    ? shakePromo()
                                    : (settings.enable_prefetch = v)
                            }
                            subtitle="Prefetch pages when users hover over links for instant loading."
                            locked={isLocked()}
                            tooltip={
                                <>
                                    <strong>Prefetches page content</strong>{" "}
                                    when users hover over links.
                                    <br />
                                    <br />
                                    When enabled, TD SPA will fetch page
                                    content in the background as users hover
                                    over links. When they click, the page loads
                                    instantly.
                                    <br />
                                    <br />
                                    <em>
                                        Significantly improves perceived
                                        performance with minimal bandwidth cost.
                                    </em>
                                </>
                            }
                        >
                            Enable Prefetch
                        </Switch>

                        <Switch
                            data-tour="disable-admins"
                            value={settings.disable_for_admins}
                            onChange={(v) =>
                                isLocked()
                                    ? shakePromo()
                                    : (settings.disable_for_admins = v)
                            }
                            subtitle="Logged in admins see normal page loads on frontend."
                            locked={isLocked()}
                            tooltip={
                                <>
                                    <strong>
                                        Disables SPA mode for administrators
                                    </strong>{" "}
                                    on the frontend.
                                    <br />
                                    <br />
                                    When enabled, logged in admin users will
                                    experience normal page reloads instead of
                                    SPA navigation. Useful for debugging or
                                    testing.
                                    <br />
                                    <br />
                                    <em>
                                        Regular visitors still get the full SPA
                                        experience.
                                    </em>
                                </>
                            }
                        >
                            Load Frontend Normally for Admins
                        </Switch>

                        <Switch
                            value={settings.block_keyboard_reload}
                            onChange={(v) =>
                                isLocked()
                                    ? shakePromo()
                                    : (settings.block_keyboard_reload = v)
                            }
                            subtitle="Block Ctrl+R, Cmd+R, and F5 from reloading the page."
                            locked={isLocked()}
                            tooltip={
                                <>
                                    <strong>
                                        Block keyboard reload shortcuts
                                    </strong>{" "}
                                    on the frontend.
                                    <br />
                                    <br />
                                    Prevents visitors from accidentally
                                    reloading the page using keyboard shortcuts
                                    like Ctrl+R, Cmd+R, or F5.
                                    <br />
                                    <br />
                                    <em>
                                        Useful for radio stations and media
                                        sites where reload interrupts playback.
                                    </em>
                                </>
                            }
                        >
                            Block Keyboard Reload
                        </Switch>

                        <Switch
                            value={settings.bypass_auth_forms}
                            onChange={(v) => (settings.bypass_auth_forms = v)}
                            subtitle="Reload the page on sign-in instead of submitting over ajax."
                            tooltip={
                                <>
                                    <strong>
                                        Submits login and registration forms as
                                        a full page load
                                    </strong>{" "}
                                    instead of over ajax.
                                    <br />
                                    <br />
                                    Leave this off for the normal app-like
                                    experience: signing in, registering, and
                                    password forms all submit over ajax without
                                    a refresh.
                                    <br />
                                    <br />
                                    Turn it on only if your sign-in flow needs a
                                    real page load, for example a security or
                                    membership plugin that redirects or
                                    challenges on login.
                                    <br />
                                    <br />
                                    <em>
                                        Applies to WooCommerce My Account,
                                        checkout account creation, and any form
                                        with a password field.
                                    </em>
                                </>
                            }
                            badge={
                                <span class="ap-text-[10px] ap-font-bold ap-px-1.5 ap-py-0.5 ap-rounded ap-uppercase ap-tracking-wide ap-bg-emerald-100 ap-text-emerald-700">
                                    New
                                </span>
                            }
                        >
                            Full Page Reload on Login & Registration
                        </Switch>
                    </Show>
                </div>
            </div>

            <div class="ap-hidden min-[1080px]:ap-block ap-w-full min-[1080px]:ap-w-auto ap-max-w-sm ap-min-w-[220px] ap-flex-shrink-0 ap-pb-[100px]">
                <div class="ap-w-full ap-max-w-sm ap-relative min-[1080px]:ap-sticky ap-top-24 ap-self-start ap-mx-auto">
                    <div class="ap-flex ap-items-center ap-justify-center ap-w-full">
                        <Meter speed={meterSpeed()} />
                    </div>
                </div>
            </div>
        </section>
    );
}
