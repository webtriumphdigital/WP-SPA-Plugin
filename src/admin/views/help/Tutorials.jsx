import { For, Show, createSignal, onCleanup } from 'solid-js';
import { Portal } from 'solid-js/web';
import { tutorialsData } from '@util/help-data';

export default function Tutorials() {
	const [activeVideo, setActiveVideo] = createSignal(null);
	const { videos } = tutorialsData;

	const openVideo = (video) => {
		setActiveVideo(video);
		document.body.style.overflow = 'hidden';
	};

	const closeVideo = () => {
		setActiveVideo(null);
		document.body.style.overflow = '';
	};

	const handleKeyDown = (e) => {
		if (e.key === 'Escape' && activeVideo()) {
			closeVideo();
		}
	};

	document.addEventListener('keydown', handleKeyDown);
	onCleanup(() => {
		document.removeEventListener('keydown', handleKeyDown);
		document.body.style.overflow = '';
	});

	return (
		<div class="ap-space-y-6">
			<div class="ap-flex ap-items-center ap-justify-between">
				<div>
					<h3 class="ap-font-semibold ap-text-lg ap-text-slate-800">Video Tutorials</h3>
					<p class="ap-text-sm ap-text-slate-500 ap-mt-1">Watch step-by-step guides to master TD SPA</p>
				</div>
				<a
					href="https://www.youtube.com/@arraystorylimited"
					target="_blank"
					class="ap-inline-flex ap-items-center ap-gap-2 ap-text-sm ap-font-medium ap-text-red-600 hover:ap-text-red-700 ap-transition"
				>
					<svg class="ap-w-5 ap-h-5" fill="currentColor" viewBox="0 0 24 24">
						<path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
					</svg>
					Subscribe
				</a>
			</div>

			{/* Video Grid */}
			<div class="ap-grid ap-grid-cols-1 sm:ap-grid-cols-2 lg:ap-grid-cols-3 ap-gap-4">
				<For each={videos}>
					{(video) => (
						<button
							onClick={() => openVideo(video)}
							data-search-title={video.title}
							class="ap-group ap-text-left ap-bg-white ap-rounded-xl ap-ring-1 ap-ring-slate-200 ap-overflow-hidden hover:ap-ring-indigo-300 hover:ap-shadow-lg ap-transition-all ap-duration-200"
						>
							{/* Thumbnail */}
							<div class="ap-relative ap-aspect-video ap-bg-gradient-to-br ap-from-slate-100 ap-to-slate-200 ap-overflow-hidden">
								<img
									src={`https://img.youtube.com/vi/${video.id}/mqdefault.jpg`}
									alt={video.title}
									class="ap-w-full ap-h-full ap-object-cover group-hover:ap-scale-105 ap-transition-transform ap-duration-300"
								/>
								{/* Play overlay */}
								<div class="ap-absolute ap-inset-0 ap-flex ap-items-center ap-justify-center ap-bg-black/0 group-hover:ap-bg-black/20 ap-transition-colors">
									<div class="ap-w-14 ap-h-14 ap-bg-red-600 ap-rounded-full ap-flex ap-items-center ap-justify-center ap-shadow-lg ap-transform group-hover:ap-scale-110 ap-transition-transform">
										<svg class="ap-w-6 ap-h-6 ap-text-white ap-ml-1" fill="currentColor" viewBox="0 0 24 24">
											<path d="M8 5v14l11-7z" />
										</svg>
									</div>
								</div>
								{/* Duration badge */}
								<div class="ap-absolute ap-bottom-2 ap-right-2 ap-bg-black/80 ap-text-white ap-text-xs ap-font-medium ap-px-2 ap-py-1 ap-rounded">
									{video.duration}
								</div>
								{/* Category badge */}
								<div class="ap-absolute ap-top-2 ap-left-2 ap-bg-white/90 ap-text-slate-700 ap-text-[10px] ap-font-semibold ap-uppercase ap-tracking-wide ap-px-2 ap-py-1 ap-rounded">
									{video.category}
								</div>
							</div>
							{/* Info */}
							<div class="ap-p-4">
								<h4 class="ap-font-semibold ap-text-slate-800 group-hover:ap-text-indigo-600 ap-transition-colors ap-line-clamp-1">
									{video.title}
								</h4>
								<p class="ap-text-sm ap-text-slate-500 ap-mt-1 ap-line-clamp-2">
									{video.description}
								</p>
							</div>
						</button>
					)}
				</For>
			</div>

			{/* Video Modal - Portal renders at body level to escape stacking context */}
			<Show when={activeVideo()}>
				<Portal>
					<div
						class="ap-fixed ap-inset-0 ap-flex ap-items-center ap-justify-center ap-p-4"
						style={{ "z-index": "999999" }}
						onClick={closeVideo}
					>
						{/* Backdrop */}
						<div class="ap-absolute ap-inset-0 ap-bg-black/80 ap-backdrop-blur-sm" />

						{/* Modal Content */}
						<div
							class="ap-relative ap-w-full ap-max-w-4xl ap-bg-black ap-rounded-xl ap-overflow-hidden ap-shadow-2xl"
							onClick={(e) => e.stopPropagation()}
						>
							{/* Close button */}
							<button
								onClick={closeVideo}
								class="ap-absolute ap-top-4 ap-right-4 ap-z-10 ap-w-10 ap-h-10 ap-bg-black/50 hover:ap-bg-black/70 ap-text-white ap-rounded-full ap-flex ap-items-center ap-justify-center ap-transition"
							>
								<svg class="ap-w-5 ap-h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>

							{/* Video iframe */}
							<div class="ap-aspect-video">
								<iframe
									src={`https://www.youtube.com/embed/${activeVideo().id}?autoplay=1&rel=0`}
									title={activeVideo().title}
									class="ap-w-full ap-h-full"
									frameborder="0"
									allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
									allowfullscreen
								/>
							</div>

							{/* Video info */}
							<div class="ap-p-4 ap-bg-slate-900">
								<h4 class="ap-font-semibold ap-text-white">{activeVideo().title}</h4>
								<p class="ap-text-sm ap-text-slate-400 ap-mt-1">{activeVideo().description}</p>
							</div>
						</div>
					</div>
				</Portal>
			</Show>
		</div>
	);
}
