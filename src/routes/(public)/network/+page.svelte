<script lang="ts">
	import { goto } from '$app/navigation';
	import { browser } from '$app/env';
	import { page } from '$app/state';
	import PageIntro from '#lib/components/PageIntro.svelte';
	import NetworkGraph from '#lib/components/network/NetworkGraph.svelte';
	import { KINDS, flagLabels } from '#lib/format.js';
	import { layoutGraph, usedTogether } from '#lib/network.js';
	import { buildStats } from '#lib/ranking.js';
	import type { Entry, Project, ProjectKind } from '#lib/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const cat = $derived(data.catalogue);
	const stats = $derived(buildStats(cat));
	const entryById = $derived(new Map(cat.entries.map((e) => [e.id, e])));
	const projectById = $derived(new Map(cat.projects.map((p) => [p.id, p])));

	// ---------- State from the address bar: ?focus=<tool or project id>&benchmarks=hide ----------
	const params = page.url.searchParams;
	const focus = params.get('focus');
	const initialKey = (() => {
		if (!focus) return null;
		if (data.catalogue.entries.some((e) => e.id === focus)) return `e:${focus}`;
		if (data.catalogue.projects.some((p) => p.id === focus)) return `p:${focus}`;
		return null;
	})();
	let showEval = $state(params.get('benchmarks') !== 'hide');
	let selected = $state<string | null>(initialKey);
	let graph: ReturnType<typeof NetworkGraph> | undefined = $state();

	function syncUrl() {
		const url = new URL(page.url.href);
		if (selected) url.searchParams.set('focus', selected.slice(2));
		else url.searchParams.delete('focus');
		if (showEval) url.searchParams.delete('benchmarks');
		else url.searchParams.set('benchmarks', 'hide');
		goto(url, { shallow: true, replace: true });
	}

	function select(key: string | null) {
		selected = key;
		syncUrl();
	}

	function toggleEval() {
		showEval = !showEval;
		// A hidden evaluation can't stay selected.
		if (!showEval && selected?.startsWith('p:') && projectById.get(selected.slice(2))?.kind === 'evaluation') selected = null;
		syncUrl();
	}

	// ---------- Graph ----------
	// Worked out in the browser, not on the server: Cloudflare gives each server request only a few
	// milliseconds of computing time, and the layout takes longer than that.
	const layout = $derived(browser ? layoutGraph(cat.entries, cat.projects, cat.drawers, showEval) : null);
	const shownCount = $derived(cat.projects.filter((p) => (showEval || p.kind !== 'evaluation') && p.entries.length).length);
	const total = $derived(cat.projects.length);
	const researchOrCorpus = $derived(cat.projects.filter((p) => p.kind !== 'evaluation').length);

	// ---------- Side panel ----------
	const groupsFor = (e: Entry) => {
		const s = stats.get(e.id)!;
		return (
			[
				['research', s.research],
				['corpus_building', s.corpus],
				['evaluation', showEval ? s.tested : []]
			] as [ProjectKind, Project[]][]
		)
			.filter(([, items]) => items.length)
			.map(([kind, items]) => ({ kind, items, ...KINDS[kind] }));
	};
	const selEntry = $derived(selected?.startsWith('e:') ? entryById.get(selected.slice(2)) : undefined);
	const selProject = $derived(selected?.startsWith('p:') ? projectById.get(selected.slice(2)) : undefined);

	// ---------- Often used together ----------
	const visibleProjects = $derived(cat.projects.filter((p) => showEval || p.kind !== 'evaluation'));
	const pairs = $derived(usedTogether(visibleProjects));
	const pairsNote = $derived.by(() => {
		if (!pairs.length)
			return 'No project here combines two catalogued tools or datasets yet. Real pipelines often chain tools (OCR, then NER, then networks); those links will appear as entries grow.';
		const fromEval = pairs.reduce((n, p) => n + p.fromEvaluations, 0);
		const all = pairs.reduce((n, p) => n + p.n, 0);
		if (showEval && fromEval * 2 > all) return 'Most of these pairs come from benchmarks that test several tools at once. Hide benchmarks to see pairs from research and corpus building.';
		if (!showEval) return 'From research and corpus-building projects only.';
		return 'Counted across all projects shown.';
	});

	const nameOf = (id: string) => entryById.get(id)?.name ?? id;
	const tag = (p: Project) => flagLabels(p.flags).map((t) => ` · ${t}`).join('');
	const sortedEntries = $derived(cat.entries.slice().sort((a, b) => a.name.localeCompare(b.name)));
	const sortedProjects = $derived(
		visibleProjects.filter((p) => p.entries.length).sort((a, b) => (a.shortTitle ?? a.title).localeCompare(b.shortTitle ?? b.title))
	);
</script>

<svelte:head><title>Network · The Digital Historian’s Toolbox</title></svelte:head>

<div class="container page">
	<PageIntro title="Who used what">
		Tools and datasets in the centre, projects around the edge. Click any point to see its connections. Turn
		benchmarks off to see which tools historians have actually put to work.
	</PageIntro>

	<div class="layout">
		<figure class="figure">
			<div class="legend" aria-hidden="true">
				<span><i class="sw circle"></i>Tool</span>
				<span><i class="sw square"></i>Dataset</span>
				<span><i class="sw diamond research"></i>Research</span>
				<span><i class="sw diamond corpus"></i>Corpus building</span>
				<span><i class="sw diamond eval"></i>Evaluation</span>
				<span class="legend-note">Size = research + corpus uses</span>
			</div>

			<div class="canvas">
				{#if layout}
					<NetworkGraph bind:this={graph} nodes={layout.nodes} links={layout.links} {selected} onselect={select} />
				{:else}
					<div class="drawing">Drawing the graph…</div>
				{/if}
				<div class="zoom" role="group" aria-label="Zoom">
					<button type="button" class="btn" onclick={() => graph?.zoomBy(1.5)} aria-label="Zoom in">+</button>
					<button type="button" class="btn" onclick={() => graph?.zoomBy(1 / 1.5)} aria-label="Zoom out">−</button>
					<button type="button" class="btn" onclick={() => graph?.resetZoom()}>Reset view</button>
				</div>
			</div>

			<figcaption class="controls">
				<button type="button" class="btn" class:btn-primary={!showEval} aria-pressed={!showEval} onclick={toggleEval}>
					{showEval ? 'Hide benchmarks and evaluations' : 'Show benchmarks and evaluations'}
				</button>
				<button type="button" class="btn" onclick={() => select(null)} disabled={!selected}>Clear selection</button>
				<label class="find" for="find">
					<span>Find</span>
					<select
						id="find"
						value={selected ?? ''}
						onchange={(e) => select((e.currentTarget as HTMLSelectElement).value || null)}
					>
						<option value="">Choose a tool, dataset or project…</option>
						<optgroup label="Tools and datasets">
							{#each sortedEntries as e (e.id)}<option value="e:{e.id}">{e.name}</option>{/each}
						</optgroup>
						<optgroup label="Projects">
							{#each sortedProjects as p (p.id)}<option value="p:{p.id}">{p.shortTitle ?? p.title}</option>{/each}
						</optgroup>
					</select>
				</label>
				<p class="summary" aria-live="polite">
					{shownCount} of {total} projects shown · {researchOrCorpus} research or corpus, {total -
						researchOrCorpus} evaluations
				</p>
				<p class="howto">Drag to move around. Zoom with the buttons, Ctrl/⌘ + scroll, or pinch with two fingers.</p>
			</figcaption>
		</figure>

		<aside class="side" aria-label="Selection">
			{#if selEntry}
				{@const s = stats.get(selEntry.id)!}
				<section class="panel selected" aria-live="polite">
					<span class="kicker" class:dataset={selEntry.type === 'dataset'}>{selEntry.type}</span>
					<h2>{selEntry.name}</h2>
					<p class="sub">
						{s.uses} research and corpus {s.uses === 1 ? 'use' : 'uses'} · {s.tested.length}
						{s.tested.length === 1 ? 'evaluation' : 'evaluations'}
					</p>
					{#each groupsFor(selEntry) as g (g.kind)}
						<div class="group" style:--ink={g.colour}>
							<h3 class="label">{g.label} · {g.items.length}</h3>
							<ul>
								{#each g.items as p (p.id)}
									<li>
										{#if p.url}<a href={p.url} target="_blank" rel="noopener">{p.shortTitle ?? p.title}</a>{:else}{p.shortTitle ?? p.title}{/if}
										<span class="meta">· {[p.who, p.year].filter(Boolean).join(', ')}{tag(p)}</span>
									</li>
								{/each}
							</ul>
						</div>
					{/each}
					<a class="more" href="/?card={selEntry.id}">Open its card <span aria-hidden="true">→</span></a>
				</section>
			{:else if selProject}
				<section class="panel selected" aria-live="polite">
					<span class="kicker" style:color={KINDS[selProject.kind].colour}>
						{KINDS[selProject.kind].label}{selProject.year ? ` · ${selProject.year}` : ''}
					</span>
					<h2>{selProject.shortTitle ?? selProject.title}</h2>
					{#if selProject.who}<p class="sub">{selProject.who}</p>{/if}
					{#if selProject.howUsed}<p class="how">{selProject.howUsed}</p>{/if}
					{#if flagLabels(selProject.flags).length}<p class="sub">{flagLabels(selProject.flags).join(' · ')}</p>{/if}
					<div class="group" style:--ink="var(--accent)">
						<h3 class="label">Tools and datasets used · {selProject.entries.length}</h3>
						<ul>
							{#each selProject.entries as id (id)}
								<li><a href="/?card={id}">{nameOf(id)}</a></li>
							{/each}
						</ul>
					</div>
					{#if selProject.url}
						<a class="more" href={selProject.url} target="_blank" rel="noopener">Open the project <span aria-hidden="true">↗</span></a>
					{/if}
				</section>
			{:else}
				<section class="panel hint">Click a tool or a project on the graph, or use Find, to see what it connects to.</section>
			{/if}

			<section class="panel">
				<h2 class="label">Often used together</h2>
				{#if pairs.length}
					<ol class="pairs">
						{#each pairs as p (p.a + p.b)}
							<li>{nameOf(p.a)} + {nameOf(p.b)} <span class="meta">· {p.n} {p.n === 1 ? 'project' : 'projects'}</span></li>
						{/each}
					</ol>
				{/if}
				<p class="note">{pairsNote}</p>
			</section>
		</aside>
	</div>

	<details class="as-list">
		<summary>Show the connections as a list</summary>
		<p class="note">
			The same information as the graph, for screen readers and small screens.
			{showEval ? 'Evaluations are included.' : 'Evaluations are hidden.'}
		</p>
		<ul class="list">
			{#each sortedEntries as e (e.id)}
				{@const groups = groupsFor(e)}
				<li>
					<h3><a href="/?card={e.id}">{e.name}</a> <span class="meta">({e.type})</span></h3>
					{#if groups.length}
						{#each groups as g (g.kind)}
							<p>
								<span class="kind" style:color={g.colour}>{g.label}:</span>
								{#each g.items as p, i (p.id)}{i ? '; ' : ''}{p.shortTitle ?? p.title} ({p.year ?? 'n.d.'}){/each}
							</p>
						{/each}
					{:else}
						<p class="meta">No linked projects yet.</p>
					{/if}
				</li>
			{/each}
		</ul>
	</details>
</div>

<style>
	.page {
		padding-top: 40px;
		padding-bottom: 56px;
		display: flex;
		flex-direction: column;
		gap: 22px;
	}
	.layout {
		display: flex;
		flex-wrap: wrap;
		gap: 20px;
		align-items: flex-start;
	}
	.figure {
		flex: 999 1 640px;
		min-width: 0;
		margin: 0;
		background: var(--surface-1);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 8px 18px;
		font-size: 14px;
		color: var(--text-2);
		align-items: center;
	}
	.legend span {
		display: inline-flex;
		gap: 8px;
		align-items: center;
	}
	.legend-note {
		margin-left: auto;
		color: var(--muted);
	}
	.sw {
		display: inline-block;
	}
	.sw.circle {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: var(--accent);
	}
	.sw.square {
		width: 13px;
		height: 13px;
		border-radius: 2px;
		background: var(--dataset);
	}
	.sw.diamond {
		width: 11px;
		height: 11px;
		transform: rotate(45deg);
	}
	.sw.research {
		background: var(--kind-research);
	}
	.sw.corpus {
		background: var(--kind-corpus);
	}
	.sw.eval {
		width: 9px;
		height: 9px;
		border: 1.5px solid var(--kind-evaluation);
	}
	.canvas {
		position: relative;
		border-radius: var(--radius);
		background: var(--bg);
		overflow: hidden;
	}
	.drawing {
		aspect-ratio: 1000 / 820;
		display: grid;
		place-items: center;
		color: var(--muted);
		font-size: 14px;
	}
	.zoom {
		position: absolute;
		right: 8px;
		bottom: 8px;
		display: flex;
		gap: 6px;
	}
	.zoom .btn {
		min-width: var(--tap);
		padding: 0 12px;
		background: var(--surface-1);
		font-size: 15px;
	}
	.controls {
		display: flex;
		flex-wrap: wrap;
		gap: 8px 10px;
		align-items: center;
	}
	.controls .btn:disabled {
		opacity: 0.5;
		cursor: default;
	}
	.find {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 14px;
		color: var(--text-3);
		min-width: 0;
	}
	.find select {
		min-height: var(--tap);
		min-width: 0;
		max-width: 260px;
		padding: 0 10px;
		font-size: 14px;
		color: var(--text);
		background: var(--surface-2);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius);
	}
	.summary {
		margin-left: auto;
		font-size: 13px;
		color: var(--muted);
	}
	.howto {
		flex-basis: 100%;
		font-size: 13px;
		color: var(--muted);
	}

	.side {
		flex: 1 1 300px;
		max-width: 400px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.panel {
		background: var(--surface-1);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.panel.selected {
		background: var(--surface-3);
		border-color: var(--accent);
		--muted: #998e7c;
	}
	.panel.hint {
		font-size: 15px;
		line-height: 1.5;
		color: var(--text-3);
	}
	.panel h2 {
		font-size: 26px;
		line-height: 1.2;
	}
	.panel h2.label {
		font-size: 12px;
		line-height: 1.5;
	}
	.kicker.dataset {
		color: var(--dataset);
	}
	.kicker {
		font-size: 12px;
	}
	.sub {
		font-size: 14px;
		color: var(--text-3);
	}
	.how {
		font-size: 14px;
		line-height: 1.5;
		color: var(--text-2);
	}
	.group {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding-top: 6px;
	}
	.group h3 {
		color: var(--ink);
		font-size: 11px;
	}
	.group ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.group li {
		border-left: 2px solid var(--ink);
		padding: 7px 0 7px 10px;
		font-size: 14px;
		line-height: 20px;
		overflow-wrap: anywhere;
	}
	.group li a,
	.more {
		padding: 13px 0;
	}
	.more {
		font-weight: 600;
		font-size: 15px;
		align-self: flex-start;
		margin: -6px 0;
	}
	.meta {
		color: var(--muted);
	}
	.pairs {
		margin: 0;
		padding-left: 20px;
		display: flex;
		flex-direction: column;
		gap: 6px;
		font-size: 15px;
		color: var(--text-2);
	}
	.note {
		font-size: 13px;
		line-height: 1.5;
		color: var(--muted);
	}

	.as-list {
		background: var(--surface-1);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		padding: 0 20px;
	}
	.as-list summary {
		min-height: var(--tap);
		display: flex;
		align-items: center;
		cursor: pointer;
		font-weight: 600;
		color: var(--text-2);
	}
	.as-list[open] {
		padding-bottom: 20px;
	}
	.list {
		list-style: none;
		margin: 12px 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.list h3 {
		font-size: 18px;
		margin-bottom: 4px;
	}
	.list h3 a {
		color: var(--text);
		padding: 12px 0;
	}
	.list p {
		font-size: 14px;
		line-height: 1.5;
		color: var(--text-3);
	}
	.kind {
		font-weight: 600;
	}

	@media (max-width: 640px) {
		.figure {
			padding: 10px;
		}
		.side {
			max-width: none;
		}
		.summary {
			margin-left: 0;
		}
		.legend-note {
			margin-left: 0;
		}
		.find {
			flex-basis: 100%;
		}
		.find select {
			flex: 1 1 0;
			min-width: 0;
			width: 100%;
			max-width: none;
		}
	}
</style>
