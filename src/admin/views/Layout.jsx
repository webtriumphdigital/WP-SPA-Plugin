import {
    createSignal,
    createMemo,
    createEffect,
    onMount,
    onCleanup,
    Show,
    For,
} from "solid-js";
import { useNavigate, useLocation, A } from "@solidjs/router";
import { Button } from "@components";
import Tour from "@components/Tour";
import { routes, navigationIcons } from "@util/routes";
import { useLicense, useSettings, useModal } from "@util/context";
import API from "@util/api";
import { setHelpSearchOpen } from "./Help";

export default function Layout(props) {
    const navigate = useNavigate();
    const location = useLocation();
    const { license, isLocked, promoShaking, showPromoModal, closePromoModal } =
        useLicense();
    const {
        settings,
        state: settingsState,
        saveSettings,
        isDirty,
        discardChanges,
    } = useSettings();
    const { isOpen, options, close, cancel, ok, toast, _toast, dismiss } =
        useModal();

    const [showDiagnosticNotice, setShowDiagnosticNotice] = createSignal(false);
    const [savingPermission, setSavingPermission] = createSignal(false);
    const [showDiagnosticDetails, setShowDiagnosticDetails] =
        createSignal(false);

    // WordPress admin sidebar state
    const [wpSidebarFolded, setWpSidebarFolded] = createSignal(false);
    const [wpMobileMenuOpen, setWpMobileMenuOpen] = createSignal(false);
    const [windowWidth, setWindowWidth] = createSignal(window.innerWidth);

    // Countdown timer for promotional offer
    const [countdownDays, setCountdownDays] = createSignal(0);
    const [countdownHours, setCountdownHours] = createSignal(0);
    const [countdownMinutes, setCountdownMinutes] = createSignal(0);
    const [countdownSeconds, setCountdownSeconds] = createSignal(0);

    // Sidebar state
    const [sidebarCollapsed, setSidebarCollapsed] = createSignal(false);
    const [mobileMenuOpen, setMobileMenuOpen] = createSignal(false);
    const [isMobile, setIsMobile] = createSignal(false);

    // Tooltip state for collapsed sidebar
    const [tooltip, setTooltip] = createSignal({
        visible: false,
        text: "",
        x: 0,
        y: 0,
    });

    let countdownInterval;
    let observer;
    let pendingExternalUrl = null;

    // Unsaved changes modal state
    const [showUnsavedModal, setShowUnsavedModal] = createSignal(false);

    const handleDiscardChanges = () => {
        discardChanges();
        setShowUnsavedModal(false);
        if (pendingExternalUrl) {
            window.location.href = pendingExternalUrl;
            pendingExternalUrl = null;
        }
    };

    const handleSaveAndContinue = async () => {
        const response = await saveSettings();
        setShowUnsavedModal(false);
        if (response?.success && pendingExternalUrl) {
            window.location.href = pendingExternalUrl;
            pendingExternalUrl = null;
        } else if (!response?.success) {
            toast(response?.message || "Failed to save settings.", "error");
        }
    };

    const handleCancelNavigation = () => {
        setShowUnsavedModal(false);
        pendingExternalUrl = null;
    };

    const initCountdown = () => {
        const STORAGE_KEY = "td_spa_promo_end_date";
        const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

        let endDate = localStorage.getItem(STORAGE_KEY);

        if (!endDate) {
            endDate = Date.now() + SEVEN_DAYS_MS;
            localStorage.setItem(STORAGE_KEY, endDate.toString());
        } else {
            const storedTime = parseInt(endDate);
            const now = Date.now();

            if (now >= storedTime) {
                endDate = now + SEVEN_DAYS_MS;
                localStorage.setItem(STORAGE_KEY, endDate.toString());
            }
        }

        const updateCountdown = () => {
            const now = Date.now();
            const end = parseInt(endDate);
            const diff = end - now;

            if (diff <= 0) {
                const newEndDate = now + SEVEN_DAYS_MS;
                localStorage.setItem(STORAGE_KEY, newEndDate.toString());
                endDate = newEndDate.toString();
                updateCountdown();
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor(
                (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
            );
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setCountdownDays(days);
            setCountdownHours(hours);
            setCountdownMinutes(minutes);
            setCountdownSeconds(seconds);
        };

        updateCountdown();
        countdownInterval = setInterval(updateCountdown, 1000);
    };

    const checkWpSidebarState = () => {
        setWpSidebarFolded(document.body.classList.contains("folded"));
        setWpMobileMenuOpen(
            document.body.classList.contains("wp-responsive-open"),
        );
    };

    const wpSidebarWidth = createMemo(() => {
        if (windowWidth() < 783) return "0px";
        // WP sidebar is 36px when folded OR when in auto-fold range (783-960px)
        if (wpSidebarFolded() || windowWidth() <= 960) return "36px";
        return "160px";
    });

    const tdSpaSidebarLeft = createMemo(() => {
        if (windowWidth() < 783) return "0px";
        // WP sidebar is 36px when folded OR when in auto-fold range (783-960px)
        if (wpSidebarFolded() || windowWidth() <= 960) return "36px";
        return "160px";
    });

    const tdSpaSidebarWidth = createMemo(() => {
        if (windowWidth() < 783) return "200px";
        return sidebarCollapsed() ? "60px" : "192px";
    });

    const mainContentLeft = createMemo(() => {
        if (windowWidth() < 783) return "0px";

        // WP sidebar is 36px when folded OR when in auto-fold range (783-960px)
        const wpWidth = wpSidebarFolded() || windowWidth() <= 960 ? 36 : 160;
        const apWidth = sidebarCollapsed() ? 60 : 192;
        return `${wpWidth + apWidth}px`;
    });

    // Sidebar styles memo for proper reactivity
    const sidebarStyles = createMemo(() => {
        const isMobileView = windowWidth() < 783;
        const isOpen = mobileMenuOpen();

        if (isMobileView) {
            return {
                "max-height": "calc(100vh - 48px)",
                left: isOpen ? "0px" : "-250px",
                width: "200px",
                "z-index": isOpen ? "150" : "60",
            };
        }

        return {
            "max-height": "calc(100vh - 32px)",
            left: tdSpaSidebarLeft(),
            width: tdSpaSidebarWidth(),
            "z-index": wpMobileMenuOpen() ? "1" : "60",
        };
    });

    const toggleSidebar = () => {
        setSidebarCollapsed(!sidebarCollapsed());
        localStorage.setItem(
            "td_spa_sidebar_collapsed",
            sidebarCollapsed().toString(),
        );
    };

    const checkMobile = () => {
        setIsMobile(window.innerWidth < 783);
    };

    // Get current route name from path
    const getCurrentRouteName = createMemo(() => {
        const path = location.pathname;
        const route = routes.find((r) => r.path === path);
        return route?.name || "";
    });

    // Get navigation items from routes
    const navigationItems = createMemo(() => {
        return routes
            .filter((routeItem) => routeItem.meta && !routeItem.meta.hidden)
            .map((routeItem) => ({
                ...routeItem,
                label: routeItem.meta.title,
                icon: navigationIcons[routeItem.meta.icon] || "",
                isActive: routeItem.name === getCurrentRouteName(),
            }));
    });

    const currentRouteMeta = createMemo(() => {
        const currentName = getCurrentRouteName();
        let matchedRoute = routes.find((r) => r.name === currentName);

        if (!matchedRoute && location.pathname) {
            const cleanPath = location.pathname.replace(/^#/, "");
            matchedRoute = routes.find((r) => {
                if (r.path === cleanPath) return true;
                if (cleanPath === "/" && r.path === "/") return true;
                return false;
            });
        }

        if (matchedRoute && matchedRoute.meta) {
            return matchedRoute.meta;
        }

        return { title: "TD SPA" };
    });

    const closeMobileMenu = () => {
        setMobileMenuOpen(false);
    };

    const showTooltip = (e, text) => {
        if (!sidebarCollapsed()) return;
        const rect = e.currentTarget.getBoundingClientRect();
        setTooltip({
            visible: true,
            text,
            x: rect.right + 8,
            y: rect.top + rect.height / 2,
        });
    };

    const hideTooltip = () => {
        setTooltip((prev) => ({ ...prev, visible: false }));
    };

    const handleClaimOffer = () => {
        closePromoModal();
        if (getCurrentRouteName() !== "license") {
            navigate("/license");
        } else {
            window.open("https://www.triumphdigital.co.th", "_blank");
        }
    };

    const save = async () => {
        const response = await saveSettings();
        const message =
            response?.message ||
            (response?.success
                ? "Settings saved successfully!"
                : "Failed to save settings.");
        toast(message, response?.success ? "success" : "error");
    };

    const hideDiagnosticNotice = () => {
        setShowDiagnosticNotice(false);
    };

    const handleDiagnosticPermission = async (allowed) => {
        setSavingPermission(true);

        try {
            await API.post("diagnostic-permission", { allowed });
            setShowDiagnosticNotice(false);

            if (allowed) {
                sendDiagnosticData();
            }
        } catch (error) {
            console.error("Failed to save diagnostic permission:", error);
        } finally {
            setSavingPermission(false);
        }
    };

    const sendDiagnosticData = async () => {
        const adminVars = window?.td_spa_admin_vars || {};
        const siteUrl = adminVars?.site?.url || "";

        const payload = {
            site_url: siteUrl ? new URL(siteUrl).host : "N/A",
            plugin: "td-spa",
            plugin_version: adminVars?.plugin?.version || "N/A",
            event: "site_optin",
            meta: {
                userAgent: navigator.userAgent,
            },
            server_info: adminVars?.server_info || {},
            site_info: {
                site_title: adminVars?.site?.name || "N/A",
                home_page: siteUrl || "N/A",
                admin_email: adminVars?.site?.admin_email || "N/A",
                active_plugins: adminVars?.site?.active_plugins || [],
                active_theme: adminVars?.site?.active_theme || "N/A",
                is_multisite: adminVars?.site?.is_multisite || false,
                wp_version: adminVars?.site?.wp_version || "N/A",
                language: adminVars?.site?.language || "N/A",
                timezone: adminVars?.site?.timezone || "N/A",
            },
        };

        try {
            await fetch(
                atob(
                    "aHR0cHM6Ly9hcnJheXN0b3J5LmNvbS8/ZXZlbnRzJmFjdGlvbj10cmFjaw==",
                ),
                {
                    method: "POST",
                    mode: "no-cors",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                },
            );
        } catch (error) {
            console.error("Failed to send diagnostic data:", error);
        }
    };

    onMount(() => {
        const permission =
            window?.td_spa_admin_vars?.diagnostic_permission || "";
        if (permission === "" || permission === null) {
            setShowDiagnosticNotice(true);
        }

        if (isLocked()) {
            initCountdown();
        }

        checkWpSidebarState();
        checkMobile();

        // Monitor WordPress sidebar state changes
        observer = new MutationObserver(() => {
            checkWpSidebarState();
        });

        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ["class"],
        });

        // Listen for window resize events
        const handleResize = () => {
            setWindowWidth(window.innerWidth);
            checkMobile();
        };

        window.addEventListener("resize", handleResize);

        // Load saved sidebar state
        const savedState = localStorage.getItem("td_spa_sidebar_collapsed");
        if (savedState !== null) {
            setSidebarCollapsed(savedState === "true");
        }

        // Intercept external link clicks when dirty
        const handleExternalLinkClick = (e) => {
            // Only handle clicks inside TD SPA app
            if (!e.target.closest("#td-spa-app")) return;

            const link = e.target.closest("a");
            if (!link) return;

            const href = link.getAttribute("href");
            if (!href || href.startsWith("#") || href.startsWith("javascript:"))
                return;

            // Check if it's an external link (not within TD SPA app)
            const isTDSPALink =
                link.closest(".td-spa-sidebar") ||
                link.closest(".td-spa-layout");
            const isExternalLink = !isTDSPALink && !href.startsWith("#/");

            if (isExternalLink && isDirty()) {
                e.preventDefault();
                e.stopPropagation();
                pendingExternalUrl = href;
                setShowUnsavedModal(true);
            }
        };

        // Warn on browser close/refresh when dirty
        const handleBeforeUnload = (e) => {
            if (isDirty()) {
                e.preventDefault();
                e.returnValue = "";
                return "";
            }
        };

        document.addEventListener("click", handleExternalLinkClick, true);
        window.addEventListener("beforeunload", handleBeforeUnload);

        // Click handler
        const handleClick = (e) => {
            // Only handle clicks inside TD SPA app
            if (!e.target.closest("#td-spa-app")) return;

            if (
                e.target &&
                (e.target.closest(".td-spa-locked") ||
                    e.target.classList?.contains("td-spa-locked"))
            ) {
                navigate("/license");
            }

            if (e.target && e.target.classList?.contains("td-spa-modal")) {
                close();
            }

            // Close mobile menu when clicking outside
            if (
                !e.target.closest(".td-spa-sidebar") &&
                !e.target.closest(".td-spa-mobile-menu-toggle")
            ) {
                if (mobileMenuOpen()) {
                    setMobileMenuOpen(false);
                }
            }
        };

        document.addEventListener("click", handleClick);

        // Keyboard handler
        const handleKeydown = (e) => {
            if (e.key === "Escape") {
                if (showPromoModal()) {
                    closePromoModal();
                } else {
                    close();
                }
                if (mobileMenuOpen()) {
                    setMobileMenuOpen(false);
                }
            }
            // Ctrl/Cmd + S to save
            if (
                (e.ctrlKey || e.metaKey) &&
                e.key === "s" &&
                getCurrentRouteName() !== "license"
            ) {
                e.preventDefault();
                if (isDirty()) {
                    save();
                }
            }
            // Intercept reload shortcuts (Ctrl+R, Cmd+R, F5) when dirty
            if (
                isDirty() &&
                (((e.ctrlKey || e.metaKey) && e.key === "r") || e.key === "F5")
            ) {
                e.preventDefault();
                pendingExternalUrl = window.location.href;
                setShowUnsavedModal(true);
            }
        };

        document.addEventListener("keydown", handleKeydown);

        onCleanup(() => {
            if (countdownInterval) clearInterval(countdownInterval);
            if (observer) observer.disconnect();
            window.removeEventListener("resize", handleResize);
            window.removeEventListener("beforeunload", handleBeforeUnload);
            document.removeEventListener(
                "click",
                handleExternalLinkClick,
                true,
            );
            document.removeEventListener("click", handleClick);
            document.removeEventListener("keydown", handleKeydown);
        });
    });

    const renderNavItem = (item) => (
        <a
            onClick={(e) => {
                e.preventDefault();
                closeMobileMenu();
                navigate(item.path);
            }}
            onMouseEnter={(e) => showTooltip(e, item.label)}
            onMouseLeave={hideTooltip}
            href={`#${item.path}`}
            class="ap-relative ap-flex ap-items-center ap-gap-3 ap-mx-2 ap-px-3 ap-py-2.5 ap-rounded-lg ap-text-sm ap-transition-all ap-duration-150 ap-outline-none focus:ap-outline-none"
            classList={{
                "ap-justify-center": sidebarCollapsed(),
                "ap-bg-indigo-600 ap-text-white ap-shadow-md ap-shadow-indigo-200":
                    item.isActive,
                "ap-text-slate-600 hover:ap-bg-slate-100": !item.isActive,
            }}
        >
            <svg
                class="ap-w-5 ap-h-5 ap-flex-shrink-0"
                classList={{
                    "ap-text-white": item.isActive,
                    "ap-text-slate-400": !item.isActive,
                }}
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                viewBox="0 0 24 24"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d={item.icon}
                />
            </svg>
            <Show when={!sidebarCollapsed()}>
                <span class="ap-font-medium">{item.label}</span>
                <Show when={item.meta?.badge}>
                    {/* Absolutely placed so it reads as a flag on the item
					    rather than another column of text, and kept amber so
					    it stays visible on the indigo active row. */}
                    <span
                        class="ap-text-[9px] ap-font-bold ap-uppercase ap-tracking-wide ap-px-1.5 ap-py-0.5 ap-rounded-full ap-bg-amber-400 ap-text-slate-900 ap-shadow-sm"
                        style={{
                            position: "absolute",
                            top: "-6px",
                            right: "-4px",
                            "line-height": "1.2",
                        }}
                    >
                        {item.meta.badge}
                    </span>
                </Show>
            </Show>
        </a>
    );

    return (
        <div
            class="ap-flex ap-overflow-hidden td-spa-layout"
            style={{ position: "relative" }}
            classList={{ "ap-cursor-wait": settingsState.saving }}
        >
            {/* Sidebar */}
            <aside
                class="td-spa-sidebar ap-fixed ap-bottom-0 ap-flex ap-flex-col ap-bg-white ap-border-r ap-border-slate-200 ap-transition-all ap-duration-300 ap-ease-in-out ap-overflow-visible"
                classList={{
                    "ap-pointer-events-none": wpMobileMenuOpen(),
                    "mobile-sidebar-open":
                        mobileMenuOpen() && windowWidth() < 783,
                    "ap-top-12": windowWidth() < 783,
                    "ap-top-8": windowWidth() >= 783,
                }}
                style={sidebarStyles()}
            >
                {/* Sidebar Header */}
                <div
                    class="ap-flex ap-items-center ap-justify-between ap-h-[56px] lg:ap-h-[73px] ap-border-b ap-border-slate-100"
                    classList={{
                        "ap-px-2": sidebarCollapsed(),
                        "ap-px-5": !sidebarCollapsed(),
                    }}
                >
                    <Show
                        when={!sidebarCollapsed()}
                        fallback={
                            <div class="ap-w-full">
                                <div class="ap-w-full ap-h-10 ap-bg-indigo-600 ap-rounded-full ap-flex ap-items-center ap-justify-center">
                                    <span class="ap-text-sm ap-font-bold ap-text-white">
                                        AP
                                    </span>
                                </div>
                            </div>
                        }
                    >
                        <div>
                            <h2 class="ap-text-base ap-font-semibold ap-text-slate-800 ap-leading-tight">
                                TD SPA
                            </h2>
                        </div>
                    </Show>
                    <button
                        onClick={closeMobileMenu}
                        class="ap-p-1.5 ap-rounded-md hover:ap-bg-slate-100 ap-transition-colors ap-text-slate-600"
                        classList={{
                            "ap-flex": windowWidth() < 783,
                            "ap-hidden": windowWidth() >= 783,
                        }}
                    >
                        <svg
                            class="ap-w-5 ap-h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                {/* Navigation */}
                <nav
                    data-tour="sidebar-nav"
                    class="ap-flex-1 ap-py-4 ap-min-h-0 ap-overflow-y-auto"
                    style="overflow-x: visible;"
                >
                    <div class="ap-space-y-1" style="overflow: visible;">
                        <For each={navigationItems()}>
                            {(item) => renderNavItem(item)}
                        </For>
                    </div>
                </nav>

                {/* Sidebar Toggle Button */}
                <button
                    onClick={toggleSidebar}
                    class="ap-absolute ap-right-0 ap-translate-x-1/2 ap-top-[46px] lg:ap-top-[63px] ap-w-5 ap-h-5 ap-items-center ap-justify-center ap-bg-white ap-border ap-border-slate-200 ap-rounded-full ap-shadow-sm hover:ap-shadow hover:ap-bg-slate-50 ap-transition-all ap-duration-200 ap-z-10"
                    classList={{
                        "ap-hidden": windowWidth() < 783,
                        "ap-flex": windowWidth() >= 783,
                    }}
                    title={
                        sidebarCollapsed()
                            ? "Expand sidebar"
                            : "Collapse sidebar"
                    }
                >
                    <svg
                        class="ap-w-2.5 ap-h-2.5 ap-text-slate-500 ap-transition-transform ap-duration-200"
                        classList={{ "ap-rotate-180": sidebarCollapsed() }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2.5"
                            d="M15 19l-7-7 7-7"
                        />
                    </svg>
                </button>
            </aside>

            {/* Mobile Menu Backdrop */}
            <Show when={mobileMenuOpen() && windowWidth() < 783}>
                <div
                    onClick={closeMobileMenu}
                    class="ap-fixed ap-inset-0 ap-bg-black ap-bg-opacity-50 ap-z-[140]"
                ></div>
            </Show>

            {/* Main Content Area */}
            <div
                class="ap-fixed ap-bottom-0 ap-right-0 ap-flex ap-flex-col"
                classList={{
                    "ap-pointer-events-none": wpMobileMenuOpen(),
                    "ap-top-12": windowWidth() < 783,
                    "ap-top-8": windowWidth() >= 783,
                }}
                style={{
                    left: windowWidth() < 783 ? "0px" : mainContentLeft(),
                    width:
                        windowWidth() < 783
                            ? "100%"
                            : `calc(100% - ${mainContentLeft()})`,
                    "z-index": wpMobileMenuOpen() ? "1" : "auto",
                }}
            >
                {/* Top Bar */}
                <header class="ap-flex ap-items-center ap-justify-between ap-px-4 sm:ap-px-6 lg:ap-px-8 ap-h-[56px] md:ap-h-[56px] lg:ap-h-[73px] ap-bg-white/95 ap-backdrop-blur-sm ap-border-b ap-border-slate-200 ap-sticky ap-top-0 ap-z-50 td-spa-header">
                    <div class="ap-flex ap-items-center ap-gap-4">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setMobileMenuOpen(true);
                            }}
                            class="td-spa-mobile-menu-toggle ap-p-2 ap-rounded-md hover:ap-bg-slate-100 ap-transition-colors ap-text-slate-600"
                            classList={{
                                "ap-flex": windowWidth() < 783,
                                "ap-hidden": windowWidth() >= 783,
                            }}
                        >
                            <svg
                                class="ap-w-6 ap-h-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M4 6h16M4 12h16M4 18h16"
                                />
                            </svg>
                        </button>
                        <div class="ap-flex ap-flex-col ap-gap-0.5">
                            <h2 class="ap-text-base ap-font-medium ap-text-slate-900">
                                <span class="lg:ap-hidden">
                                    {currentRouteMeta()?.title || "TD SPA"}
                                </span>
                                <span class="ap-hidden lg:ap-inline">
                                    {currentRouteMeta()?.pageTitle ||
                                        "TD SPA"}
                                </span>
                            </h2>
                        </div>
                    </div>

                    {/* Header Actions */}
                    <div
                        data-tour="save-button"
                        class="ap-flex ap-items-center ap-gap-2"
                    >
                        {/* Help Search Button - Only on help pages */}
                        <Show when={location.pathname.startsWith("/help")}>
                            <button
                                onClick={() => setHelpSearchOpen(true)}
                                class="ap-flex ap-items-center ap-gap-2 ap-px-3 ap-py-2 ap-text-sm ap-text-slate-500 ap-bg-slate-100 ap-rounded-lg hover:ap-bg-slate-200 ap-transition"
                            >
                                <svg
                                    class="ap-w-4 ap-h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                    />
                                </svg>
                                <span class="ap-hidden sm:ap-inline">
                                    Search
                                </span>
                                <kbd class="ap-hidden sm:ap-inline-flex ap-items-center ap-gap-0.5 ap-px-1.5 ap-py-0.5 ap-text-[10px] ap-font-medium ap-text-slate-400 ap-bg-white ap-rounded ap-border ap-border-slate-200">
                                    {navigator.platform.includes("Mac")
                                        ? "⌘"
                                        : "Ctrl"}
                                    /
                                </kbd>
                            </button>
                        </Show>

                        {/* Save Buttons */}
                        <Show when={isDirty()}>
                            <div class="ap-flex ap-items-center ap-gap-2 ap-animate-pop">
                                <Button
                                    onClick={() => discardChanges()}
                                    variant="secondary"
                                    disabled={settingsState.saving}
                                >
                                    Discard
                                </Button>
                                <Button
                                    onClick={save}
                                    loading={settingsState.saving}
                                    disabled={settingsState.saving}
                                    class="ap-whitespace-nowrap"
                                >
                                    {settingsState.saving
                                        ? "Saving..."
                                        : "Save Settings"}
                                </Button>
                            </div>
                        </Show>
                    </div>
                </header>

                {/* Main Content */}
                <main
                    class="ap-flex-1 ap-overflow-y-auto ap-overflow-x-hidden ap-px-3 ap-pt-4 ap-pb-4 sm:ap-p-10 td-spa-main-content"
                    classList={{
                        "ap-animate-pulse ap-pointer-events-none":
                            settingsState.saving,
                        "has-both-bars": showDiagnosticNotice() && isLocked(),
                        "has-diagnostic-bar":
                            showDiagnosticNotice() && !isLocked(),
                        "has-promo-bar": !showDiagnosticNotice() && isLocked(),
                    }}
                >
                    {props.children}
                </main>
            </div>

            {/* Modal */}
            <Show when={isOpen()}>
                {/* Backdrop */}
                <div
                    onClick={close}
                    class="ap-z-[200] ap-fixed ap-bg-black ap-bg-opacity-50 ap-backdrop-blur-sm ap-w-full ap-h-full ap-left-0 ap-top-0"
                ></div>
                {/* Modal Content */}
                <div class="ap-fixed ap-z-[201] ap-w-full ap-h-full ap-left-0 ap-top-0 ap-flex ap-items-center ap-justify-center td-spa-modal ap-p-4 ap-pointer-events-none">
                    <div
                        class="ap-bg-white ap-rounded-xl ap-shadow-2xl ap-relative ap-w-full ap-max-h-[90vh] ap-overflow-y-auto ap-pointer-events-auto"
                        classList={{
                            "ap-max-w-xs": (options.size || "md") === "sm",
                            "ap-max-w-md": (options.size || "md") === "md",
                            "ap-max-w-lg": (options.size || "md") === "lg",
                            "ap-max-w-2xl": (options.size || "md") === "xl",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div class="ap-p-6 ap-space-y-4">
                            <Show when={options.title}>
                                <h3 class="ap-font-semibold ap-text-lg ap-text-slate-900">
                                    {options.title}
                                </h3>
                            </Show>
                            <Show when={options.content}>
                                <p
                                    class="ap-text-slate-600 ap-text-sm ap-leading-relaxed"
                                    innerHTML={options.content}
                                ></p>
                            </Show>
                            <Show when={options.ok || options.cancel}>
                                <div
                                    class="ap-flex ap-items-center ap-justify-end ap-gap-3 ap-pt-4 ap-border-t ap-border-slate-200"
                                    classList={{
                                        "ap-flex-row-reverse": options.reverse,
                                    }}
                                >
                                    <Show when={options.cancel}>
                                        <Button
                                            onClick={cancel}
                                            variant="secondary"
                                            size="md"
                                        >
                                            {options.cancel === true
                                                ? "Cancel"
                                                : options.cancel}
                                        </Button>
                                    </Show>
                                    <Show when={options.ok}>
                                        <Button
                                            onClick={ok}
                                            variant={
                                                options.okVariant || "primary"
                                            }
                                            size="md"
                                        >
                                            {options.ok === true
                                                ? "Ok"
                                                : options.ok}
                                        </Button>
                                    </Show>
                                </div>
                            </Show>
                        </div>
                    </div>
                </div>
            </Show>

            {/* Unsaved Changes Modal */}
            <Show when={showUnsavedModal()}>
                <div class="ap-z-[200] ap-fixed ap-bg-black ap-bg-opacity-50 ap-backdrop-blur-sm ap-w-full ap-h-full ap-left-0 ap-top-0"></div>
                <div class="ap-fixed ap-z-[201] ap-w-full ap-h-full ap-left-0 ap-top-0 ap-flex ap-items-center ap-justify-center ap-p-4 ap-pointer-events-none">
                    <div class="ap-bg-white ap-rounded-xl ap-shadow-2xl ap-relative ap-w-full ap-max-w-md ap-pointer-events-auto">
                        <div class="ap-p-6">
                            {/* Close button */}
                            <button
                                onClick={handleCancelNavigation}
                                class="ap-absolute ap-top-4 ap-right-4 ap-w-8 ap-h-8 ap-flex ap-items-center ap-justify-center ap-rounded-full ap-text-slate-400 hover:ap-text-slate-600 hover:ap-bg-slate-100 ap-transition-colors"
                            >
                                <svg
                                    class="ap-w-5 ap-h-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    stroke-width="2"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>

                            {/* Warning icon */}
                            <div class="ap-flex ap-items-center ap-justify-center ap-w-12 ap-h-12 ap-rounded-full ap-bg-amber-100 ap-mb-4">
                                <svg
                                    class="ap-w-6 ap-h-6 ap-text-amber-600"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    stroke-width="2"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    />
                                </svg>
                            </div>

                            <h3 class="ap-font-semibold ap-text-lg ap-text-slate-900 ap-mb-2">
                                Unsaved Changes
                            </h3>
                            <p class="ap-text-slate-600 ap-text-sm ap-leading-relaxed ap-mb-6">
                                You have unsaved changes. Would you like to save
                                them before leaving?
                            </p>

                            <div class="ap-flex ap-items-center ap-gap-3">
                                <Button
                                    onClick={handleDiscardChanges}
                                    variant="secondary"
                                    class="ap-flex-1"
                                >
                                    Discard
                                </Button>
                                <Button
                                    onClick={handleSaveAndContinue}
                                    loading={settingsState.saving}
                                    class="ap-flex-1"
                                >
                                    Save & Continue
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </Show>

            {/* Toast */}
            <Show when={_toast.open && _toast.text}>
                <div
                    onClick={dismiss}
                    tabIndex="1"
                    class="ap-outline-none ap-overflow-hidden ap-text-slate-700 ap-z-[9999] ap-bg-white ap-cursor-pointer ap-transition ap-max-w-[calc(100%-2rem)] sm:ap-max-w-sm ap-px-5 ap-py-4 ap-rounded-lg ap-shadow-xl ap-font-medium ap-tracking-wide ap-flex ap-items-center ap-gap-3 ap-ring-1 ap-ring-slate-200 td-spa-modal ap-fixed ap-bottom-32 ap-left-1/2 ap--translate-x-1/2 sm:ap-translate-x-0 sm:ap-left-auto sm:ap-bottom-auto sm:ap-top-28 sm:ap-right-8 ap-animate-pop"
                >
                    <Show when={_toast.type === "success"}>
                        <svg
                            class="ap-flex-shrink-0 ap-text-indigo-500 ap-w-5 ap-h-5"
                            viewBox="0 0 22 22"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                fill-rule="evenodd"
                                clip-rule="evenodd"
                                d="M10.9996 21.3996C16.7434 21.3996 21.3996 16.7434 21.3996 10.9996C21.3996 5.25585 16.7434 0.599609 10.9996 0.599609C5.25585 0.599609 0.599609 5.25585 0.599609 10.9996C0.599609 16.7434 5.25585 21.3996 10.9996 21.3996ZM15.8188 9.31885C16.3265 8.81117 16.3265 7.98805 15.8188 7.48037C15.3112 6.97269 14.4881 6.97269 13.9804 7.48037L9.69961 11.7611L8.01885 10.0804C7.51117 9.57269 6.68805 9.57269 6.18037 10.0804C5.67269 10.5881 5.67269 11.4112 6.18037 11.9188L8.78037 14.5188C9.28805 15.0265 10.1112 15.0265 10.6188 14.5188L15.8188 9.31885Z"
                                fill="currentColor"
                            />
                        </svg>
                    </Show>
                    <Show when={_toast.type === "error"}>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="ap-flex-shrink-0 ap-text-red-500 ap-w-5 ap-h-5"
                            viewBox="0 0 16 16"
                            fill="currentColor"
                        >
                            <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293z" />
                        </svg>
                    </Show>
                    <span class="ap-flex-1 ap-text-sm">{_toast.text}</span>

                    {/* timer bar */}
                    <Show when={_toast.timer}>
                        <div class="ap-absolute ap-bottom-0 ap-left-0 ap-right-0 ap-h-1 ap-bg-slate-100 ap-rounded-b-lg ap-overflow-hidden">
                            <div
                                class="td-spa-toast-timer ap-h-full ap-bg-indigo-500"
                                style={{
                                    "--td-spa-toast-duration": `${_toast.timer}s`,
                                }}
                            ></div>
                        </div>
                    </Show>
                </div>
            </Show>

            {/* Diagnostic Notice */}
            <Show when={showDiagnosticNotice()}>
                <div
                    class="ap-fixed ap-right-0 ap-bg-white ap-border-t ap-border-slate-200 ap-shadow-lg ap-z-[99]"
                    style={{
                        bottom: isLocked() ? "52px" : "0px",
                        left: windowWidth() < 783 ? "0px" : mainContentLeft(),
                    }}
                >
                    <div class="ap-px-4 sm:ap-px-6 lg:ap-px-8 ap-py-3">
                        <div class="ap-flex ap-items-center ap-gap-3 sm:ap-gap-4">
                            <div class="ap-flex-shrink-0 ap-w-8 ap-h-8 sm:ap-w-10 sm:ap-h-10 ap-bg-slate-100 ap-text-slate-600 ap-rounded-lg ap-flex ap-items-center ap-justify-center">
                                <svg
                                    class="ap-w-4 ap-h-4 sm:ap-w-5 sm:ap-h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                    />
                                </svg>
                            </div>
                            <div class="ap-flex-1 ap-min-w-0">
                                <h4 class="ap-font-semibold ap-text-slate-800 ap-text-sm">
                                    Share Diagnostic Data
                                </h4>
                                <p class="ap-text-xs ap-text-slate-500 ap-mt-0.5 ap-hidden sm:ap-block">
                                    Help us improve TD SPA by sharing
                                    anonymous diagnostic data.
                                </p>
                            </div>
                            <div class="ap-flex ap-items-center ap-gap-2 ap-flex-shrink-0">
                                <button
                                    onClick={() =>
                                        handleDiagnosticPermission(false)
                                    }
                                    disabled={savingPermission()}
                                    class="ap-px-2 sm:ap-px-3 ap-py-1.5 ap-text-xs sm:ap-text-sm ap-text-slate-500 hover:ap-text-slate-700 ap-font-medium ap-transition disabled:ap-opacity-50"
                                >
                                    Deny
                                </button>
                                <button
                                    onClick={() =>
                                        handleDiagnosticPermission(true)
                                    }
                                    disabled={savingPermission()}
                                    class="ap-px-3 sm:ap-px-4 ap-py-1.5 ap-bg-slate-800 ap-text-white ap-text-xs sm:ap-text-sm ap-font-medium ap-rounded-lg hover:ap-bg-slate-700 ap-transition disabled:ap-opacity-50"
                                >
                                    {savingPermission() ? "Saving..." : "Allow"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </Show>

            {/* Sidebar Tooltip */}
            <Show when={tooltip().visible}>
                <div
                    class="ap-fixed ap-z-[99999] ap-px-2.5 ap-py-1.5 ap-bg-slate-900 ap-text-white ap-text-xs ap-font-medium ap-rounded-md ap-shadow-xl ap-pointer-events-none ap-whitespace-nowrap"
                    style={{
                        left: `${tooltip().x}px`,
                        top: `${tooltip().y}px`,
                        transform: "translateY(-50%)",
                    }}
                >
                    <div class="ap-absolute ap-right-full ap-top-1/2 ap--translate-y-1/2 ap-border-[5px] ap-border-transparent ap-border-r-slate-900" />
                    {tooltip().text}
                </div>
            </Show>

            {/* Tour Guide */}
            <Tour />
        </div>
    );
}
