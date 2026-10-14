<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import PageIntro from '#lib/components/PageIntro.svelte';
	import { KINDS } from '#lib/format.js';
	import { DEFAULT_WINDOW, buildStats, comparator, type SortKey } from '#lib/ranking.js';
	import {
		COST_OPTIONS,
		DEFAULT_FILTERS,
		SKILL_OPTIONS,
		entryFilterActive,
		search,
		type Filters,
		type Result,
		type ResultType
	} from '#lib/search.js';
	import type { Entry, Project, ProjectKind } from '#lib/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const cat = $derived(data.catalogue);
	const stats = $derived(buildStats(cat));
	const entryById = $derived(new Map(cat.entries.map((e) => [e.id, e])));

	// ---------- State from the address bar ----------
	const p = page.url.searchParams;
	const list = (key: string) => (p.get(key) ?? '').split(',').filter(Boolean);
	type SearchSort = 'match' | SortKey;
	const SORT_OPTIONS: { id: SearchSort; label: string }[] = [
		{ id: 'match', label: 'Best match' },
		{ id: 'trending', label: `Trending (past ${DEFAULT_WINDOW} years)` },
		{ id: 'used', label: 'Most used (all time)' },
		{ id: 'new', label: 'Newest' },
		{ id: 'az', label: 'A–Z' }
	];

	let query = $state(p.get('q') ?? '');
	let filters = $state<Filters>({
		types: p.has('type') ? (list('type') as ResultType[]) : [...DEFAULT_FILTERS.types],
		aiOnly: p.get('ai') === '1',
		runsLocally: p.get('local') === '1',
		evaluated: p.get('eval') === '1',
		cost: list('cost'),
		skill: list('skill'),
		kinds: list('kind') as ProjectKind[]
	});
	const initialSort = p.get('sort') as SearchSort | null;
	let chosenSort = $state<SearchSort | null>(SORT_OPTIONS.some((s) => s.id === initialSort) ? initialSort : null);
	// With words to match, "Best match" is the natural default; with none, Trending.
	const sort = $derived<SearchSort>(chosenSort ?? (query.trim() ? 'match' : 'trending'));
	let filtersOpen = $state(false);

	let syncTimer: ReturnType<typeof setTimeout> | undefined;
	function syncUrl() {
		clearTimeout(syncTimer);
		syncTimer = setTimeout(() => {
			const url = new URL(page.url.href);
			const set = (k: string, v: string | null) => (v ? url.searchParams.set(k, v) : url.searchParams.delete(k));
			set('q', query.trim() || null);
			set('type', filters.types.length === 3 ? null : filters.types.join(',') || 'none');
			set('ai', filters.aiOnly ? '1' : null);
			set('local', filters.runsLocally ? '1' : null);
			set('eval', filters.evaluated ? '1' : null);
			set('cost', filters.cost.join(',') || null);
			set('skill', filters.skill.join(',') || null);
			set('kind', filters.kinds.join(',') || null);
			set('sort', chosenSort);
			goto(url, { shallow: true, replace: true });
		}, 250);
	}

	function toggle<T extends string>(listIn: T[], value: T): T[] {
		return listIn.includes(value) ? listIn.filter((v) => v !== value) : [...listIn, value];
	}

	function clearFilters() {
		filters = { ...DEFAULT_FILTERS, types: [...DEFAULT_FILTERS.types], cost: [], skill: [], kinds: [] };
		syncUrl();
	}

	// ---------- Results ----------
	const raw = $derived(search(cat, stats, query, filters));
	const results = $derived.by(() => {
		if (sort === 'match') {
			// Best score first; on a tie, cards before projects, then newer projects first.
			const yearOf = (r: Result) => (r.kind === 'project' ? (r.project.yearSort ?? -Infinity) : 0);
			const isProject = (r: Result) => (r.kind === 'project' ? 1 : 0);
			return raw.slice().sort((a, b) => b.score - a.score || isProject(a) - isProject(b) || yearOf(b) - yearOf(a));
		}
		const order = comparator(sort, DEFAULT_WINDOW, stats);
		const entries = raw.filter((r) => r.kind === 'entry') as Extract<Result, { kind: 'entry' }>[];
		const projects = raw.filter((r) => r.kind === 'project') as Extract<Result, { kind: 'project' }>[];
		entries.sort((a, b) => order(a.entry, b.entry));
		projects.sort((a, b) =>
			sort === 'az'
				? a.project.title.localeCompare(b.project.title)
				: (b.project.yearSort ?? -Infinity) - (a.project.yearSort ?? -Infinity) || a.project.title.localeCompare(b.project.title)
		);
		return [...entries, ...projects];
	});

	const activeCount = $derived(
		(filters.types.length === 3 ? 0 : 1) +
			[filters.aiOnly, filters.runsLocally, filters.evaluated].filter(Boolean).length +
			filters.cost.length +
			filters.skill.length +
			filters.kinds.length
	);

	const COST_LABEL: Record<string, string> = Object.fromEntries(COST_OPTIONS.map((o) => [o.id, o.label]));
	const SKILL_LABEL: Record<string, string> = Object.fromEntries(SKILL_OPTIONS.map((o) => [o.id, o.label]));
	const usesLine = (e: Entry) => {
		const s = stats.get(e.id)!;
		return `${s.research.length} research · ${s.corpus.length} corpus · ${s.tested.length} tested`;
	};
	const usedBy = (pr: Project) => pr.entries.map((id) => entryById.get(id)).filter((e): e is Entry => !!e);
</script>

<svelte:head>
	<title>{query ? `“${query}” · ` : ''}Search · The Digital Historian’s Toolbox</title>
</svelte:head>

<div class="container top">
	<PageIntro title="Search the catalogue" />
	<form class="search" role="search" method="get" onsubmit={(e) => e.preventDefault()}>
		<label for="q" class="sr-only">Search tools, datasets and projects</label>
		<input
			id="q"
			name="q"
			type="search"
			class="field"
			placeholder="A tool, a dataset, a project, a method…"
			bind:value={query}
			oninput={syncUrl}
		/>
		<button type="submit" class="btn btn-primary">Search</button>
	</form>
</div>

<div class="container layout">
	<button
		type="button"
		class="btn filters-toggle"
		aria-expanded={filtersOpen}
		aria-controls="filters"
		onclick={() => (filtersOpen = !filtersOpen)}
	>
		Filters{activeCount ? ` (${activeCount} on)` : ''}
	</button>

	<aside id="filters" class="filters" class:open={filtersOpen} aria-label="Filters">
		<fieldset>
			<legend class="label">Type</legend>
			{#each [['tool', 'Tools'], ['dataset', 'Datasets'], ['project', 'Projects']] as [id, label] (id)}
				<label class="check">
					<input
						type="checkbox"
						checked={filters.types.includes(id as ResultType)}
						onchange={() => {
							filters.types = toggle(filters.types, id as ResultType);
							syncUrl();
						}}
					/>
					<span>{label}</span>
				</label>
			{/each}
		</fieldset>

		<fieldset>
			<legend class="label">AI and evaluation</legend>
			<label class="check">
				<input type="checkbox" bind:checked={filters.aiOnly} onchange={syncUrl} />
				<span>AI tools only</span>
			</label>
			<label class="check">
				<input type="checkbox" bind:checked={filters.runsLocally} onchange={syncUrl} />
				<span>Runs locally</span>
			</label>
			<label class="check">
				<input type="checkbox" bind:checked={filters.evaluated} onchange={syncUrl} />
				<span>Has published evaluation</span>
			</label>
		</fieldset>

		<fieldset>
			<legend class="label">Cost</legend>
			{#each COST_OPTIONS as o (o.id)}
				<label class="check">
					<input
						type="checkbox"
						checked={filters.cost.includes(o.id)}
						onchange={() => {
							filters.cost = toggle(filters.cost, o.id);
							syncUrl();
						}}
					/>
					<span>{o.label}</span>
				</label>
			{/each}
		</fieldset>

		<fieldset>
			<legend class="label">Skill needed</legend>
			{#each SKILL_OPTIONS as o (o.id)}
				<label class="check">
					<input
						type="checkbox"
						checked={filters.skill.includes(o.id)}
						onchange={() => {
							filters.skill = toggle(filters.skill, o.id);
							syncUrl();
						}}
					/>
					<span>{o.label}</span>
				</label>
			{/each}
		</fieldset>

		<fieldset>
			<legend class="label">Project kind</legend>
			{#each Object.entries(KINDS) as [id, k] (id)}
				<label class="check">
					<input
						type="checkbox"
						checked={filters.kinds.includes(id as ProjectKind)}
						onchange={() => {
							filters.kinds = toggle(filters.kinds, id as ProjectKind);
							syncUrl();
						}}
					/>
					<span>{k.label}</span>
				</label>
			{/each}
		</fieldset>

		{#if entryFilterActive(filters) && filters.types.includes('project')}
			<p class="hint">Projects are shown if they used a matching tool or dataset.</p>
		{/if}
		{#if activeCount}
			<button type="button" class="btn" onclick={clearFilters}>Clear filters</button>
		{/if}
	</aside>

	<section class="results" aria-labelledby="results-count">
		<div class="results-head">
			<p id="results-count" aria-live="polite">
				<strong>{results.length} {results.length === 1 ? 'result' : 'results'}</strong>{#if query.trim()}{' '}for
					“{query.trim()}”{/if}
			</p>
			<label class="sort" for="sort">
				Sort
				<select
					id="sort"
					value={sort}
					onchange={(e) => {
						chosenSort = (e.currentTarget as HTMLSelectElement).value as SearchSort;
						syncUrl();
					}}
				>
					{#each SORT_OPTIONS as o (o.id)}
						<option value={o.id}>{o.label}</option>
					{/each}
				</select>
			</label>
		</div>

		{#if results.length === 0}
			<div class="empty">
				<p>Nothing matches. Try fewer words, or clear some filters.</p>
				<p>Know a tool or project that should be here? <a href="/submit">Submit an entry</a>.</p>
			</div>
		{:else}
			<ul class="list">
				{#each results as r (r.kind === 'entry' ? r.entry.id : r.project.id)}
					<li>
						{#if r.kind === 'entry'}
							{@const e = r.entry}
							<span class="kicker-col" class:dataset={e.type === 'dataset'}>{e.type} · {e.catalogueNumber}</span>
							<div class="main-col">
								<h2>
									<a href="/?card={e.id}">{e.name}</a>
									{#if e.ai}<span class="ai-badge">AI</span>{/if}
								</h2>
								<p>{e.description}</p>
							</div>
							<div class="side-col">
								<span>
									{[e.costBand ? COST_LABEL[e.costBand] : null, e.skillLevel ? SKILL_LABEL[e.skillLevel] : null]
										.filter(Boolean)
										.join(' · ')}
								</span>
								<a href="/network?focus={e.id}">{usesLine(e)}</a>
							</div>
						{:else}
							{@const pr = r.project}
							<span class="kicker-col" style:color={KINDS[pr.kind].colour}>Project · {KINDS[pr.kind].short}</span>
							<div class="main-col">
								<h2>
									{#if pr.url}<a href={pr.url} target="_blank" rel="noopener"
											>{pr.shortTitle ?? pr.title} <span aria-hidden="true">↗</span><span class="sr-only">(opens the project)</span></a
										>
									{:else}{pr.shortTitle ?? pr.title}{/if}
								</h2>
								<p>
									{#if pr.who}{pr.who}.{/if}
									{#if pr.howUsed}{pr.howUsed}{/if}
									<span class="kind-note">{KINDS[pr.kind].label}.</span>
								</p>
							</div>
							<div class="side-col">
								<span>{pr.year ?? 'Undated'}</span>
								<span>
									Uses:
									{#each usedBy(pr) as e, i (e.id)}{i ? ', ' : ''}<a href="/?card={e.id}">{e.name}</a>{/each}
								</span>
								<a href="/network?focus={pr.id}">See it on the network</a>
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>

<style>
	.top {
		padding-top: 40px;
		padding-bottom: 24px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.search {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		max-width: 820px;
	}
	.search .field {
		flex: 1 1 280px;
		min-height: 52px;
		font-size: 17px;
	}
	.search .btn {
		min-height: 52px;
		padding: 0 26px;
	}
	.layout {
		padding-top: 8px;
		padding-bottom: 56px;
		display: flex;
		flex-wrap: wrap;
		gap: 32px;
		align-items: flex-start;
	}

	/* ---------- Filters ---------- */
	.filters-toggle {
		display: none;
	}
	.filters {
		flex: 1 1 240px;
		max-width: 280px;
		display: flex;
		flex-direction: column;
		gap: 26px;
	}
	fieldset {
		border: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	legend {
		margin-bottom: 8px;
	}
	.check {
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: var(--tap);
		font-size: 15px;
		color: var(--text-2);
		cursor: pointer;
	}
	.check input {
		width: 18px;
		height: 18px;
		margin: 0;
		accent-color: var(--accent);
	}
	.hint {
		font-size: 13px;
		line-height: 1.45;
		color: var(--muted);
	}

	/* ---------- Results ---------- */
	.results {
		flex: 999 1 560px;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}
	.results-head {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		justify-content: space-between;
		align-items: center;
		padding-bottom: 14px;
		border-bottom: 3px double var(--border);
		font-size: 15px;
		color: var(--text-3);
	}
	.results-head strong {
		color: var(--text);
	}
	.sort {
		display: flex;
		gap: 8px;
		align-items: center;
		font-size: 14px;
	}
	select {
		min-height: var(--tap);
		padding: 0 10px;
		font-size: 14px;
		color: var(--text);
		background: var(--surface-1);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius);
	}
	.list {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.list li {
		display: flex;
		flex-wrap: wrap;
		gap: 8px 16px;
		align-items: baseline;
		padding: 20px 0;
		border-bottom: 1px solid var(--border);
	}
	.kicker-col {
		flex: 0 0 120px;
		font-family: var(--font-mono);
		font-size: 12px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--accent);
	}
	.kicker-col.dataset {
		color: var(--dataset);
	}
	.main-col {
		flex: 1 1 340px;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.main-col h2 {
		font-size: 22px;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px 10px;
	}
	.main-col h2 a {
		color: var(--text);
		text-decoration: none;
		padding: 10px 0;
		margin: -10px 0;
	}
	.main-col h2 a:hover {
		color: var(--accent-hover);
		text-decoration: underline;
	}
	.main-col p {
		font-size: 15px;
		line-height: 1.5;
		color: var(--text-3);
		overflow-wrap: anywhere;
	}
	.kind-note {
		color: var(--muted);
	}
	.side-col {
		flex: 0 0 190px;
		display: flex;
		flex-direction: column;
		font-size: 14px;
		line-height: 20px;
		color: var(--muted);
	}
	.side-col > span {
		padding: 12px 0;
	}
	.side-col > span:first-child {
		padding-top: 0;
	}
	/* Links sit on their own 44px rows; links inside a line of text get a 44px tap area. */
	.side-col > a {
		display: flex;
		align-items: center;
		min-height: var(--tap);
	}
	.side-col span a {
		padding: 13px 0;
	}
	.empty {
		padding: 28px 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
		color: var(--text-3);
	}

	@media (max-width: 860px) {
		.filters-toggle {
			display: inline-flex;
			width: 100%;
		}
		.filters {
			display: none;
			max-width: none;
			flex-basis: 100%;
			padding: 16px;
			background: var(--surface-1);
			border: 1px solid var(--border);
			border-radius: var(--radius-lg);
		}
		.filters.open {
			display: flex;
		}
		.layout {
			gap: 16px;
		}
		.kicker-col {
			flex-basis: 100%;
		}
		.side-col {
			flex-basis: 100%;
		}
	}
</style>
