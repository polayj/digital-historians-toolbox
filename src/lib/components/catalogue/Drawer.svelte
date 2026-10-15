<!--
  A drawer in the card catalogue. Closed: a cabinet front with a brass label plate, a peek at the
  top three entries and a handle. Open: spans the full row with guide-card tabs, sorting and cards.
-->
<script lang="ts">
	import EntryCard from './EntryCard.svelte';
	import SortControls from './SortControls.svelte';
	import type { EntryStats, SortKey } from '#lib/ranking.js';
	import type { Drawer, Entry, Guide } from '#lib/types.js';

	let {
		drawer,
		entries,
		stats,
		guidesByEntry,
		open,
		sub,
		openCard,
		sort,
		windowYears,
		today,
		checkin,
		ontoggle,
		onsub,
		oncard,
		onsort,
		onwindow
	}: {
		drawer: Drawer;
		/** This drawer's entries, already in the chosen sort order. */
		entries: Entry[];
		stats: Map<string, EntryStats>;
		guidesByEntry: Map<string, Guide[]>;
		open: boolean;
		sub: string;
		openCard: string | null;
		sort: SortKey;
		windowYears: number;
		today: string;
		/** Who is signed in, which cards they use this year, and how many people use each card this year. */
		checkin: { signedIn: boolean; mine: Set<string>; counts: Record<string, number> };
		ontoggle: () => void;
		onsub: (id: string) => void;
		oncard: (id: string) => void;
		onsort: (s: SortKey) => void;
		onwindow: (w: number) => void;
	} = $props();

	const filled = $derived(entries.length > 0);

	// Only show guide cards that have something filed under them in this drawer.
	const tabs = $derived.by(() => {
		const subs = drawer.subdrawers.filter((s) => entries.some((e) => e.subdrawers.includes(s.id)));
		if (!subs.length) return [];
		return [
			{ id: 'all', label: 'All', blurb: null, n: entries.length },
			...subs.map((s) => ({ ...s, n: entries.filter((e) => e.subdrawers.includes(s.id)).length }))
		];
	});
	const subBlurb = $derived(drawer.subdrawers.find((s) => s.id === sub)?.blurb ?? null);
	const shown = $derived(sub === 'all' ? entries : entries.filter((e) => e.subdrawers.includes(sub)));
	const peek = $derived(entries.slice(0, 3).map((e) => e.name).join(' · '));
</script>

{#if !open}
	<button
		type="button"
		class="front"
		class:empty={!filled}
		id="drawer-{drawer.id}-btn"
		aria-expanded="false"
		onclick={ontoggle}
	>
		<span class="plate">
			<span class="plate-no">DRAWER {drawer.number}</span>
			<span class="plate-label">{drawer.label}</span>
		</span>
		<span class="peek">{filled ? peek : 'Waiting for its first entries'}</span>
		<span class="handle" aria-hidden="true"></span>
		<span class="count">
			{filled ? `${entries.length} ${entries.length === 1 ? 'card' : 'cards'}` : 'Not yet filled'} ·
			<span class="cta">{filled ? 'Pull out' : 'Suggest one'} <span aria-hidden="true">{filled ? '↓' : ''}</span></span>
		</span>
	</button>
{:else}
	<section class="opened" aria-labelledby="drawer-{drawer.id}-title">
		<div class="opened-head">
			<span class="plate open-plate">
				<span class="plate-no">DRAWER {drawer.number}</span>
				<h3 class="plate-label" id="drawer-{drawer.id}-title" tabindex="-1">{drawer.label}</h3>
			</span>
			<p class="blurb">{drawer.blurb}</p>
			<button type="button" class="btn" aria-expanded="true" onclick={ontoggle}
				>Close drawer <span aria-hidden="true">↑</span></button
			>
		</div>

		{#if tabs.length}
			<div class="tabs-wrap">
				<span class="label tabs-label" id="drawer-{drawer.id}-tabs">Guide cards</span>
				<div class="tabs" role="group" aria-labelledby="drawer-{drawer.id}-tabs">
					{#each tabs as t (t.id)}
						<button type="button" aria-pressed={t.id === sub} onclick={() => onsub(t.id)}>
							{t.label} <span class="tab-n">{t.n}</span>
						</button>
					{/each}
				</div>
			</div>
		{/if}
		{#if subBlurb}
			<p class="sub-blurb">{subBlurb}</p>
		{/if}

		<div class="sort-row">
			<SortControls {sort} {windowYears} {onsort} {onwindow} idPrefix="drawer-{drawer.id}" />
		</div>

		{#if shown.length === 0}
			<p class="nothing">Nothing filed in this drawer yet. <a href="/submit">Suggest the first card <span aria-hidden="true">→</span></a></p>
		{:else}
			<ul class="cards">
				{#each shown as e (e.id)}
					<li class:wide={openCard === e.id}>
						<EntryCard
							entry={e}
							stats={stats.get(e.id)!}
							guides={guidesByEntry.get(e.id) ?? []}
							open={openCard === e.id}
							{today}
							signedIn={checkin.signedIn}
							checkedIn={checkin.mine.has(e.id)}
							usersThisYear={checkin.counts[e.id] ?? 0}
							ontoggle={() => oncard(e.id)}
						/>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
{/if}

<style>
	/* ---------- Closed drawer front ---------- */
	.front {
		width: 100%;
		height: 100%;
		color: var(--text);
		text-align: center;
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-bottom: 4px solid var(--border-handle);
		border-radius: var(--radius-lg);
		padding: 24px 20px 18px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 14px;
		--muted: #998e7c;
	}
	.front:hover {
		border-color: var(--border-strong);
		border-bottom-color: var(--border-handle);
	}
	.front:hover .handle {
		border-color: var(--accent);
	}
	.plate {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		padding: 12px 18px;
		min-width: 70%;
		border: 1.5px solid var(--accent);
		border-radius: 3px;
		background: var(--surface-sunk);
	}
	.plate-no {
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.12em;
		color: var(--muted);
	}
	.front .plate-no {
		color: #8f8472; /* on the dark plate, the base muted tone passes */
	}
	.plate-label {
		font-family: var(--font-serif);
		font-size: 22px;
		line-height: 1.2;
		color: var(--text);
	}
	.peek {
		font-size: 14px;
		line-height: 1.5;
		color: var(--text-3);
	}
	.handle {
		width: 54px;
		height: 14px;
		border: 1.5px solid var(--border-strong);
		border-top: none;
		border-radius: 0 0 27px 27px;
	}
	.count {
		font-size: 13px;
		color: var(--muted);
	}
	.cta {
		color: var(--accent);
	}
	.front.empty {
		background: var(--surface-empty);
		--muted: #8f8472;
	}
	.front.empty .plate {
		border-color: #4a423a;
	}
	.front.empty .plate-label {
		color: var(--muted);
	}

	/* ---------- Open drawer ---------- */
	.opened {
		background: var(--surface-sunk);
		border: 1px solid var(--accent);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}
	.opened-head {
		background: var(--surface-2);
		border-bottom: 1px solid var(--border);
		padding: 20px 24px;
		display: flex;
		flex-wrap: wrap;
		gap: 16px;
		align-items: center;
		--muted: #998e7c;
	}
	.open-plate {
		align-items: flex-start;
		min-width: 0;
		padding: 10px 16px;
		gap: 2px;
		background: transparent;
	}
	.open-plate .plate-label {
		font-size: 26px;
		font-weight: 400;
	}
	h3:focus {
		outline: none;
	}
	h3:focus-visible {
		outline: 2px solid var(--accent-hover);
		outline-offset: 4px;
	}
	.blurb {
		flex: 1 1 260px;
		font-size: 15px;
		line-height: 1.5;
		color: var(--text-3);
	}
	.tabs-wrap {
		padding: 18px 24px 0;
		display: flex;
		flex-direction: column;
	}
	.tabs-label {
		font-size: 11px;
		margin-bottom: 10px;
	}
	.tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		align-items: flex-end;
		border-bottom: 1px solid var(--accent);
	}
	.tabs button {
		min-height: var(--tap);
		padding: 0 16px;
		font-size: 14px;
		color: var(--text-3);
		background: var(--surface-1);
		border: 1px solid var(--border);
		border-bottom: none;
		border-radius: 8px 8px 0 0;
	}
	.tabs button:hover {
		color: var(--text);
	}
	.tabs button[aria-pressed='true'] {
		color: var(--text);
		background: var(--surface-3);
		border-color: var(--accent);
		font-weight: 600;
	}
	.tab-n {
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--muted);
	}
	.tabs button[aria-pressed='true'] .tab-n {
		color: #998e7c;
	}
	.sub-blurb {
		padding: 16px 24px 0;
		font-size: 15px;
		line-height: 1.55;
		color: var(--text-2);
		max-width: 900px;
	}
	.sort-row {
		padding: 18px 24px;
		border-bottom: 1px solid var(--border);
	}
	.nothing {
		padding: 24px;
		font-size: 15px;
		color: var(--text-3);
	}
	.cards {
		list-style: none;
		margin: 0;
		padding: 20px 24px 24px;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
		gap: 14px;
	}
	.cards li {
		min-width: 0;
	}
	.cards li.wide {
		grid-column: 1 / -1;
	}

	@media (max-width: 640px) {
		.opened-head,
		.sort-row {
			padding-left: 16px;
			padding-right: 16px;
		}
		.tabs-wrap {
			padding-left: 16px;
			padding-right: 16px;
		}
		.sub-blurb {
			padding-left: 16px;
			padding-right: 16px;
		}
		.cards {
			padding: 16px;
		}
	}
</style>
