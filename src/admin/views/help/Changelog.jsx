import { For, Show, createSignal } from "solid-js";
import { changelogData } from "@util/help-data";

export default function Changelog() {
    const [expanded, setExpanded] = createSignal({ 0: true });

    const toggleExpand = (index) => {
        setExpanded((prev) => ({ ...prev, [index]: !prev[index] }));
    };

    const { releases } = changelogData;

    return (
        <div class="ap-space-y-6">
            <div class="ap-space-y-1">
                <h3 class="ap-font-semibold ap-text-lg ap-text-slate-800">
                    Changelog
                </h3>
                <p class="ap-text-sm ap-text-slate-500">
                    Version history and release notes
                </p>
            </div>

            <div class="ap-space-y-3">
                <For each={releases}>
                    {(release, index) => (
                        <div
                            data-search-title={`Version ${release.version}`}
                            class="ap-bg-white ap-rounded-xl ap-ring-1 ap-overflow-hidden"
                            classList={{
                                "ap-ring-indigo-200":
                                    release.highlight && expanded()[index()],
                                "ap-ring-slate-200":
                                    !release.highlight || !expanded()[index()],
                            }}
                        >
                            {/* Card Header - Clickable */}
                            <button
                                onClick={() => toggleExpand(index())}
                                class="ap-w-full ap-px-5 ap-py-3 ap-flex ap-items-center ap-justify-between ap-text-left ap-transition-colors"
                                classList={{
                                    "ap-bg-gradient-to-r ap-from-indigo-50 ap-to-purple-50":
                                        release.highlight &&
                                        expanded()[index()],
                                    "ap-bg-slate-50 hover:ap-bg-slate-100":
                                        !release.highlight ||
                                        !expanded()[index()],
                                }}
                            >
                                <div class="ap-flex ap-items-center ap-gap-3 ap-flex-wrap">
                                    <span
                                        class="ap-font-bold"
                                        classList={{
                                            "ap-text-indigo-700":
                                                release.highlight &&
                                                expanded()[index()],
                                            "ap-text-slate-800":
                                                !release.highlight ||
                                                !expanded()[index()],
                                        }}
                                    >
                                        v{release.version}
                                    </span>
                                    <Show when={release.highlight}>
                                        <span class="ap-text-[10px] ap-font-bold ap-uppercase ap-tracking-wider ap-bg-gradient-to-r ap-from-violet-500 ap-to-fuchsia-500 ap-text-white ap-rounded-full ap-px-2.5 ap-py-0.5">
                                            {release.highlight}
                                        </span>
                                    </Show>
                                    <span class="ap-text-sm ap-text-slate-500">
                                        {release.date}
                                    </span>
                                </div>
                                <svg
                                    class="ap-w-4 ap-h-4 ap-text-slate-400 ap-transition-transform ap-flex-shrink-0"
                                    classList={{
                                        "ap-rotate-180": expanded()[index()],
                                    }}
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        d="M19 9l-7 7-7-7"
                                    />
                                </svg>
                            </button>

                            {/* Card Body - Collapsible */}
                            <Show when={expanded()[index()]}>
                                <div class="ap-p-5 ap-border-t ap-border-slate-100">
                                    <ul class="ap-space-y-2">
                                        <For each={release.changes}>
                                            {(change) => {
                                                const isNew =
                                                    change.startsWith("New:");
                                                const isFix =
                                                    change.startsWith("Fix") ||
                                                    change.startsWith("Fixed");
                                                const isImproved =
                                                    change.startsWith(
                                                        "Improved:",
                                                    ) ||
                                                    change.startsWith(
                                                        "Update:",
                                                    );
                                                const text = change.replace(
                                                    /^(New:|Fixed:|Fix:|Improved:|Update:)\s*/,
                                                    "",
                                                );
                                                return (
                                                    <li class="ap-text-sm ap-text-slate-600 ap-leading-relaxed ap-flex ap-items-start ap-gap-2">
                                                        <Show when={isNew}>
                                                            <span class="ap-flex-shrink-0 ap-text-[10px] ap-font-bold ap-uppercase ap-tracking-wide ap-bg-emerald-100 ap-text-emerald-700 ap-rounded ap-px-1.5 ap-py-0.5 ap-mt-0.5">
                                                                New
                                                            </span>
                                                        </Show>
                                                        <Show when={isFix}>
                                                            <span class="ap-flex-shrink-0 ap-text-[10px] ap-font-bold ap-uppercase ap-tracking-wide ap-bg-amber-100 ap-text-amber-700 ap-rounded ap-px-1.5 ap-py-0.5 ap-mt-0.5">
                                                                Fix
                                                            </span>
                                                        </Show>
                                                        <Show when={isImproved}>
                                                            <span class="ap-flex-shrink-0 ap-text-[10px] ap-font-bold ap-uppercase ap-tracking-wide ap-bg-blue-100 ap-text-blue-700 ap-rounded ap-px-1.5 ap-py-0.5 ap-mt-0.5">
                                                                Improved
                                                            </span>
                                                        </Show>
                                                        <Show
                                                            when={
                                                                !isNew &&
                                                                !isFix &&
                                                                !isImproved
                                                            }
                                                        >
                                                            <span class="ap-flex-shrink-0 ap-w-1.5 ap-h-1.5 ap-bg-slate-300 ap-rounded-full ap-mt-2"></span>
                                                        </Show>
                                                        <span>{text}</span>
                                                    </li>
                                                );
                                            }}
                                        </For>
                                    </ul>
                                </div>
                            </Show>
                        </div>
                    )}
                </For>
            </div>

            <div class="ap-text-center ap-pt-2">
                <a
                    href="https://www.triumphdigital.co.th"
                    target="_blank"
                    class="ap-inline-flex ap-items-center ap-gap-2 ap-text-sm ap-text-indigo-600 hover:ap-text-indigo-700 ap-font-medium ap-transition"
                >
                    View full release notes
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
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                    </svg>
                </a>
            </div>
        </div>
    );
}
