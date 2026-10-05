import { createSignal, onMount, onCleanup, For, Show } from 'solid-js';

/**
 * Searchable multi-select backed by an async lookup.
 *
 * Selections are kept as opaque string values; the labels come from the
 * `search` callback, which is also asked to resolve already-saved values on
 * mount so a reload shows names rather than bare ids.
 *
 * Props:
 *   value    string[]                      selected values
 *   search   (q, include) => Promise<[{value,label,meta}]>
 *   onChange (next: string[]) => void
 *   placeholder, emptyText
 */
export default function MultiSelect(props) {
	const [open, setOpen] = createSignal(false);
	const [query, setQuery] = createSignal('');
	const [results, setResults] = createSignal([]);
	const [labels, setLabels] = createSignal({});
	const [busy, setBusy] = createSignal(false);

	let containerRef;
	let inputRef;
	let searchToken = 0;

	const selected = () => props.value || [];

	const remember = (items) => {
		const next = { ...labels() };
		for (const item of items) {
			next[item.value] = item;
		}
		setLabels(next);
	};

	// Nothing is fetched until the user actually types. On a site with
	// thousands of posts, opening the box should not pull a list nobody asked
	// for - and the first thing anyone does here is search by name anyway.
	const MIN_QUERY = 2;

	// Debounced so typing doesn't fire a request per keystroke. The token
	// guards against an earlier, slower response overwriting a later one.
	let debounce;
	const runSearch = (q) => {
		clearTimeout(debounce);

		if (!q || q.trim().length < MIN_QUERY) {
			setResults([]);
			setBusy(false);
			return;
		}

		debounce = setTimeout(async () => {
			const token = ++searchToken;
			setBusy(true);
			try {
				const items = await props.search(q, []);
				if (token !== searchToken) return;
				setResults(items);
				remember(items);
			} catch (e) {
				if (token === searchToken) setResults([]);
			} finally {
				if (token === searchToken) setBusy(false);
			}
		}, 250);
	};

	onMount(async () => {
		const onDocClick = (e) => {
			if (containerRef && !containerRef.contains(e.target)) setOpen(false);
		};
		document.addEventListener('click', onDocClick);
		onCleanup(() => {
			document.removeEventListener('click', onDocClick);
			clearTimeout(debounce);
		});

		// Resolve saved ids to labels.
		if (selected().length) {
			try {
				remember(await props.search('', selected()));
			} catch (e) {
				/* labels stay as raw values */
			}
		}
	});

	const add = (item) => {
		remember([item]);
		if (!selected().includes(item.value)) {
			props.onChange?.([...selected(), item.value]);
		}
		setQuery('');
		setResults([]);
		inputRef?.focus();
	};

	const remove = (value) => {
		props.onChange?.(selected().filter((v) => v !== value));
	};

	const labelFor = (value) => labels()[value]?.label || value;
	const metaFor = (value) => labels()[value]?.meta || '';

	const available = () => results().filter((r) => !selected().includes(r.value));

	return (
		<div ref={containerRef} class="ap-relative ap-w-full">
			<div
				class="ap-w-full ap-min-h-[2.5rem] ap-px-2 ap-py-1.5 ap-flex ap-flex-wrap ap-items-center ap-gap-1.5 ap-text-sm ap-rounded-lg ap-border ap-border-slate-300 ap-bg-white focus-within:ap-border-indigo-500 focus-within:ap-ring-2 focus-within:ap-ring-indigo-500 focus-within:ap-ring-offset-1"
				onClick={() => {
					setOpen(true);
					inputRef?.focus();
				}}
			>
				<For each={selected()}>
					{(value) => (
						<span class="ap-inline-flex ap-items-center ap-gap-1 ap-px-2 ap-py-0.5 ap-bg-indigo-50 ap-text-indigo-700 ap-rounded ap-text-xs">
							<span>{labelFor(value)}</span>
							<Show when={metaFor(value)}>
								<span class="ap-text-indigo-400">{metaFor(value)}</span>
							</Show>
							<button
								type="button"
								aria-label={`Remove ${labelFor(value)}`}
								class="ap-text-indigo-400 hover:ap-text-red-600"
								onClick={(e) => {
									e.stopPropagation();
									remove(value);
								}}
							>
								×
							</button>
						</span>
					)}
				</For>

				<input
					ref={inputRef}
					type="text"
					class="ap-flex-1 ap-min-w-[8rem] ap-border-0 ap-outline-none ap-bg-transparent ap-text-sm ap-p-0 focus:ap-ring-0"
					placeholder={selected().length ? '' : props.placeholder || 'Search…'}
					value={query()}
					onInput={(e) => {
						setQuery(e.target.value);
						setOpen(true);
						runSearch(e.target.value);
					}}
					onFocus={() => setOpen(true)}
					onKeyDown={(e) => {
						// Backspace on an empty box removes the last chip, as
						// every other tag input does.
						if (e.key === 'Backspace' && !query() && selected().length) {
							remove(selected()[selected().length - 1]);
						}
					}}
				/>
			</div>

			<Show when={open()}>
				<div class="ap-absolute ap-z-[9999] ap-top-full ap-mt-1 ap-w-full ap-max-h-64 ap-overflow-y-auto ap-bg-white ap-border ap-border-slate-200 ap-rounded-lg ap-shadow-lg ap-py-1">
					<Show when={busy()}>
						<div class="ap-px-3 ap-py-2 ap-text-xs ap-text-slate-400">Searching…</div>
					</Show>

					<Show when={!busy() && !available().length}>
						<div class="ap-px-3 ap-py-2 ap-text-xs ap-text-slate-400">
							{query().trim().length >= MIN_QUERY
								? props.emptyText || 'Nothing found'
								: 'Type at least 2 characters to search'}
						</div>
					</Show>

					<For each={available()}>
						{(item) => (
							<button
								type="button"
								class="ap-w-full ap-px-3 ap-py-2 ap-text-sm ap-text-left ap-text-slate-700 hover:ap-bg-slate-50 ap-flex ap-items-center ap-justify-between ap-gap-2"
								onClick={(e) => {
									e.stopPropagation();
									add(item);
								}}
							>
								<span class="ap-truncate">{item.label}</span>
								<Show when={item.meta}>
									<span class="ap-text-xs ap-text-slate-400 ap-flex-shrink-0">{item.meta}</span>
								</Show>
							</button>
						)}
					</For>
				</div>
			</Show>
		</div>
	);
}
