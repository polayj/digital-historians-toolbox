<!--
  One catalogue card. Closed: a button showing the summary. Open: the full card,
  spanning the whole row, with facts, historian's notes, projects, guides and actions.
-->
<script lang="ts">
	import { page } from '$app/state';
	import { KINDS, flagLabels, formatDate, formatMonth, isDueForReview } from '#lib/format.js';
	import type { EntryStats } from '#lib/ranking.js';
	import type { Entry, Guide, Project, ProjectKind } from '#lib/types.js';

	let {
		entry,
		stats,
		guides,
		open,
		today,
		ontoggle
	}: {
		entry: Entry;
		stats: EntryStats;
		guides: Guide[];
		open: boolean;
		today: string;
		ontoggle: () => void;
	} = $props();

	const isDataset = $derived(entry.type === 'dataset');
	const due = $derived(isDueForReview(entry.lastUpdated, today));
	const reviewed = $derived(entry.status === 'approved');

	const groups = $derived(
		(
			[
				['research', stats.research],
				['corpus_building', stats.corpus],
				['evaluation', stats.tested]
			] as [ProjectKind, Project[]][]
		).map(([kind, items]) => ({ kind, items, ...KINDS[kind] }))
	);

	let citeOpen = $state(false);
	let checkinNote = $state(false);
	let copied = $state(false);

	const citation = $derived(
		`[Editors], “${entry.name}” (card No. ${entry.catalogueNumber}), The Digital Historian’s Toolbox, ` +
			`last updated ${formatDate(entry.lastUpdated)}, ${page.url.origin}/?card=${entry.id}. Accessed ${formatDate(today)}.`
	);

	async function copyCitation() {
		try {
			await navigator.clipboard.writeText(citation);
			copied = true;
			setTimeout(() => (copied = false), 2500);
		} catch {
			copied = false;
		}
	}
</script>

{#if !open}
	<button
		type="button"
		class="card closed raised-3"
		id="card-{entry.id}-btn"
		aria-expanded="false"
		onclick={ontoggle}
	>
		<span class="meta">
			<span class="type" class:dataset={isDataset}>{entry.type} · No. {entry.catalogueNumber}</span>
			{#if entry.ai}<span class="ai-badge">AI</span>{/if}
		</span>
		<span class="name">{entry.name}</span>
		<span class="desc">{entry.description}</span>
		<span class="counts">
			<span class="research">{stats.research.length} research</span>
			<span class="corpus">{stats.corpus.length} corpus</span>
			<span class="tested">{stats.tested.length} tested</span>
			<span class="updated" class:due>{due ? 'Due for review' : `Updated ${formatMonth(entry.lastUpdated)}`}</span>
		</span>
	</button>
{:else}
	<article class="card opened raised-3" aria-labelledby="card-{entry.id}-title">
		<div class="head">
			<div class="title-block">
				<span class="meta">
					<span class="type" class:dataset={isDataset}>{entry.type} · No. {entry.catalogueNumber}</span>
					{#if entry.ai}<span class="ai-badge">AI</span>{/if}
				</span>
				<h4 id="card-{entry.id}-title" tabindex="-1">{entry.name}</h4>
				<p class="lede">{entry.description}</p>
			</div>
			<button type="button" class="btn" aria-expanded="true" onclick={ontoggle}>Close card</button>
		</div>

		<div class="columns">
			<section aria-labelledby="card-{entry.id}-facts">
				<h5 class="label" id="card-{entry.id}-facts">At a glance</h5>
				<dl class="facts">
					{#each entry.facts as f (f.k)}
						<dt>{f.k}</dt>
						<dd>{f.v}</dd>
					{/each}
				</dl>
			</section>

			<section aria-labelledby="card-{entry.id}-notes">
				<h5 class="label" id="card-{entry.id}-notes">Historian’s notes</h5>
				{#each entry.notes as n (n.q)}
					<div class="note">
						<strong>{n.q}</strong>
						<span>{n.a}</span>
					</div>
				{/each}
			</section>

			<section class="uses" aria-label="Projects that used it">
				{#each groups as g (g.kind)}
					<div class="group" style:--ink={g.colour}>
						<h5 class="label group-head"><span>{g.heading}</span><span>{g.items.length}</span></h5>
						{#if g.items.length}
							<ul>
								{#each g.items as p (p.id)}
									<li>
										{#if p.url}<a href={p.url} target="_blank" rel="noopener">{p.shortTitle ?? p.title}</a>
										{:else}{p.shortTitle ?? p.title}{/if}
										<span class="who"
											>· {[p.who, p.year].filter(Boolean).join(', ')}{#each flagLabels(p.flags) as tag (tag)}{' · '}<span
													class="tag">{tag}</span
												>{/each}</span
										>
									</li>
								{/each}
							</ul>
						{:else}
							<p class="empty">{g.empty}</p>
						{/if}
					</div>
				{/each}

				{#if guides.length}
					<div class="group" style:--ink="var(--text-3)">
						<h5 class="label group-head"><span>Guides</span><span>{guides.length}</span></h5>
						<ul>
							{#each guides as g (g.url)}
								<li><a href={g.url} target="_blank" rel="noopener">{g.title}</a></li>
							{/each}
						</ul>
					</div>
				{/if}
			</section>
		</div>

		<div class="actions">
			{#if entry.website}
				<a class="btn btn-primary" href={entry.website} target="_blank" rel="noopener"
					>Visit website <span aria-hidden="true">↗</span></a
				>
			{/if}
			<button type="button" class="btn" aria-expanded={checkinNote} onclick={() => (checkinNote = !checkinNote)}
				>I’m using this now</button
			>
			<a class="btn" href="/submit?type=project&entry={entry.id}">Add a project that used it</a>
			<a class="btn btn-link" href="/network?focus={entry.id}">See it on the network <span aria-hidden="true">→</span></a>
			<button type="button" class="btn btn-link" aria-expanded={citeOpen} onclick={() => (citeOpen = !citeOpen)}
				>Cite this card</button
			>
			<a class="btn btn-link" href="/submit?type=correction&entry={entry.id}">Suggest a correction</a>
		</div>

		{#if checkinNote}
			<p class="panel" role="status">
				Thanks! Recording “I’m using this now” needs a quick sign-in with ORCID, which is being added next. Check-ins
				count toward Trending.
			</p>
		{/if}

		{#if citeOpen}
			<div class="panel cite">
				<p class="label">Cite this card</p>
				<p class="citation">{citation}</p>
				<div class="cite-actions">
					<button type="button" class="btn" onclick={copyCitation}>Copy citation</button>
					<span role="status" class="copied">{copied ? 'Copied.' : ''}</span>
				</div>
			</div>
		{/if}

		<div class="footer">
			<span class="stamp" class:due>
				{due ? 'Due for review · last updated' : 'Last updated'}
				{formatDate(entry.lastUpdated)}
			</span>
			<span>
				{#if entry.submittedBy}Suggested by {entry.submittedBy} ·{/if}
				{reviewed ? 'Checked by the editors' : 'Not yet reviewed by the editors'} ·
				<a href="/history/entry/{entry.id}">Version history</a>
			</span>
		</div>
	</article>
{/if}

<style>
	.card {
		width: 100%;
		height: 100%;
		color: var(--text);
		border-radius: var(--radius);
		text-align: left;
	}

	/* ---------- Closed ---------- */
	.closed {
		border: 1px solid var(--border);
		padding: 16px 18px 12px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.closed:hover {
		border-color: var(--border-strong);
	}
	.meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 10px;
		width: 100%;
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.opened .meta {
		justify-content: flex-start;
	}
	.type {
		color: var(--accent);
	}
	.type.dataset {
		color: var(--dataset);
	}
	.name {
		display: block;
		font-family: var(--font-serif);
		font-size: 21px;
		line-height: 1.2;
	}
	.desc {
		display: block;
		flex-grow: 1;
		font-size: 14px;
		line-height: 1.5;
		color: var(--text-3);
	}
	.counts {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 12px;
		width: 100%;
		font-size: 13px;
		border-top: 1px dashed var(--border);
		padding-top: 8px;
	}
	.counts .research {
		color: var(--kind-research);
	}
	.counts .corpus {
		color: var(--kind-corpus);
	}
	.counts .tested {
		color: var(--muted);
	}
	.counts .updated {
		margin-left: auto;
		color: var(--muted);
	}
	.due {
		color: var(--warning) !important;
		border-color: var(--warning) !important;
	}

	/* ---------- Open ---------- */
	.opened {
		border: 1px solid var(--border-strong);
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}
	.head {
		display: flex;
		flex-wrap: wrap;
		gap: 16px;
		align-items: flex-start;
	}
	.title-block {
		flex: 999 1 380px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	h4 {
		font-size: clamp(28px, 4vw, 36px);
		scroll-margin-top: 96px;
	}
	h4:focus {
		outline: none;
	}
	h4:focus-visible {
		outline: 2px solid var(--accent-hover);
		outline-offset: 4px;
	}
	.lede {
		font-size: 16px;
		line-height: 1.6;
		color: var(--text-2);
		max-width: 820px;
	}
	.columns {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 28px;
		border-top: 1px solid var(--border);
		padding-top: 20px;
	}
	.columns section {
		display: flex;
		flex-direction: column;
		gap: 12px;
		min-width: 0;
	}
	.columns h5 {
		font-size: 11px;
	}
	.facts {
		margin: 0;
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 8px 14px;
		font-size: 14px;
		line-height: 1.45;
	}
	.facts dt {
		color: var(--muted);
	}
	.facts dd {
		margin: 0;
	}
	.note {
		display: flex;
		flex-direction: column;
		gap: 3px;
		font-size: 14px;
		line-height: 1.5;
	}
	.note strong {
		font-weight: 600;
	}
	.note span {
		color: var(--text-2);
	}
	.uses {
		gap: 14px !important;
	}
	.group {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.group-head {
		display: flex;
		justify-content: space-between;
		color: var(--ink);
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
	/* Vertical padding on an inline link enlarges where it can be tapped (to at least 44px)
	   without moving any text; the list spacing keeps neighbouring links from overlapping. */
	.group li a {
		padding: 13px 0;
	}
	.who {
		color: var(--muted);
	}
	.tag {
		color: var(--text-3);
		font-style: italic;
	}
	.empty {
		font-size: 13px;
		color: var(--muted);
		font-style: italic;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		align-items: center;
		border-top: 1px solid var(--border);
		padding-top: 18px;
	}
	.panel {
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 14px 16px;
		font-size: 14px;
		line-height: 1.5;
		color: var(--text-2);
		--muted: #998e7c;
	}
	.cite {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.citation {
		font-family: var(--font-mono);
		font-size: 13px;
		line-height: 1.6;
		overflow-wrap: anywhere;
	}
	.cite-actions {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.copied {
		color: var(--dataset);
	}
	.footer {
		display: flex;
		flex-wrap: wrap;
		gap: 8px 12px;
		align-items: center;
		justify-content: flex-end;
		font-size: 13px;
		color: var(--muted);
	}
	.footer a {
		display: inline-block;
		padding: 12px 0;
		margin: -12px 0;
	}
	.stamp {
		font-family: var(--font-mono);
		font-size: 12px;
		padding: 4px 8px;
		border: 1px solid var(--muted);
		border-radius: 3px;
		color: var(--muted);
	}

	@media (max-width: 640px) {
		.opened {
			padding: 18px 16px;
		}
		.footer {
			justify-content: flex-start;
		}
	}
</style>
