import { For } from "solid-js";
import { Button } from "@components";
import { useLicense, useTour } from "@util/context";
import { gettingStartedData } from "@util/help-data";

export default function GettingStarted(props) {
    const { isLocked } = useLicense();
    const tour = useTour();

    const { quickStart, resources: baseResources } = gettingStartedData;

    const resources = () => {
        const list = [...baseResources];
        if (!isLocked()) {
            list.push({
                title: "Priority Support",
                description: "Get direct help from our team",
                icon: "✉️",
                link: "https://www.triumphdigital.co.th",
            });
        }
        return list;
    };

    return (
        <div class="ap-space-y-6">
            {/* Quick Start Steps */}
            <div class="ap-space-y-3">
                <h3 class="ap-font-semibold ap-text-base ap-text-slate-800">
                    Quick Start Guide
                </h3>
                <div class="ap-grid ap-grid-cols-1 md:ap-grid-cols-2 ap-gap-3">
                    <For each={quickStart}>
                        {(item) => (
                            <a
                                href={item.link}
                                data-search-title={item.title}
                                class="ap-flex ap-items-center ap-gap-3 ap-p-3 ap-bg-white ap-rounded-lg ap-ring-1 ap-ring-slate-200 hover:ap-ring-indigo-300 ap-transition ap-group"
                            >
                                <div class="ap-flex-shrink-0 ap-w-8 ap-h-8 ap-bg-indigo-500 ap-text-white ap-rounded-lg ap-flex ap-items-center ap-justify-center ap-font-bold ap-text-sm">
                                    {item.step}
                                </div>
                                <div class="ap-flex-1 ap-min-w-0">
                                    <h4 class="ap-font-medium ap-text-slate-800 group-hover:ap-text-indigo-600 ap-transition">
                                        {item.title}
                                    </h4>
                                    <p class="ap-text-xs ap-text-slate-500">
                                        {item.description}
                                    </p>
                                </div>
                            </a>
                        )}
                    </For>
                </div>
            </div>

            {/* Take the Tour */}
            <div
                data-search-title="Take the Tour"
                class="ap-bg-slate-50 ap-rounded-lg ap-p-4 ap-ring-1 ap-ring-slate-200 ap-flex ap-flex-col sm:ap-flex-row ap-items-start sm:ap-items-center ap-justify-between ap-gap-3"
            >
                <div>
                    <h4 class="ap-font-medium ap-text-slate-800">
                        {tour.state.completed
                            ? "Restart the Tour"
                            : "New here? Take a quick tour"}
                    </h4>
                    <p class="ap-text-sm ap-text-slate-500">
                        Learn how to use TD SPA in minutes
                    </p>
                </div>
                <div class="ap-flex ap-items-center ap-gap-2 ap-flex-shrink-0">
                    <Button size="sm" onClick={() => tour.startTour("quick")}>
                        Quick
                    </Button>
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => tour.startTour("extended")}
                    >
                        Extended
                    </Button>
                </div>
            </div>

            {/* Resources */}
            <div data-tour="help-resources" class="ap-space-y-3">
                <h3 class="ap-font-semibold ap-text-base ap-text-slate-800">
                    Resources
                </h3>
                <div class="ap-grid ap-grid-cols-1 sm:ap-grid-cols-3 ap-gap-3">
                    <For each={resources()}>
                        {(resource) => (
                            <a
                                href={resource.link}
                                target="_blank"
                                data-search-title={resource.title}
                                class="ap-flex ap-items-center ap-gap-3 ap-p-3 ap-bg-white ap-rounded-lg ap-ring-1 ap-ring-slate-200 hover:ap-ring-indigo-300 ap-transition ap-group"
                            >
                                <span class="ap-text-2xl">{resource.icon}</span>
                                <div>
                                    <div class="ap-font-medium ap-text-slate-800 group-hover:ap-text-indigo-600 ap-transition">
                                        {resource.title}
                                    </div>
                                    <div class="ap-text-xs ap-text-slate-500">
                                        {resource.description}
                                    </div>
                                </div>
                            </a>
                        )}
                    </For>
                </div>
            </div>
        </div>
    );
}
