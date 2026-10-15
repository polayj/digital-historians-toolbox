<script lang="ts">
	import { afterNavigate, goto } from '$app/navigation';
	import { page } from '$app/state';
	import { tick, untrack } from 'svelte';
	import Drawer from '#lib/components/catalogue/Drawer.svelte';
	import { DEFAULT_WINDOW, SORTS, WINDOWS, buildStats, comparator, topTrending, type SortKey } from '#lib/ranking.js';
	import type { Guide } from '#lib/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const cat = $derived(data.catalogue);

	const stats = $derived(buildStats(cat));
	const guidesByEntry = $derived.by(() => {
		const map = new Map<string, Guide[]>();
		for (const g of cat.guides) map.set(g.entryId, [...(map.get(g.entryId) ?? []), g]);
		return map;
	});

	// ---------- State, read once from the address bar so any card can be linked to ----------
	const params = page.url.searchParams;
	const initialCard = params.get('card');
	const cardEntry = untrack(() => data.catalogue.entries.find((e) => e.id === initialCard));
	const initialSort = params.get('sort');
	const initialWindow = Number(params.get('window'));

	let sort = $state<SortKey>(SORTS.some((s) => s.id === initialSort) ? (initialSort as SortKey) : 'trending');
	let windowYears = $state<number>((WINDOWS as readonly number[]).includes(initialWindow) ? initialWindow : DEFAULT_WINDOW);
	let openDrawer = $state<string | null>(params.get('drawer') ?? cardEntry?.drawers[0] ?? null);
	let sub = $state<string>(params.get('sub') ?? 'all');
	let openCard = $state<string | null>(cardEntry ? cardEntry.id : null);

	function syncUrl() {
		const url = new URL(page.url.href);
		const set = (k: string, v: string | null) => (v ? url.searchParams.set(k, v) : url.searchParams.delete(k));
		set('drawer', openDrawer);
		set('sub', openDrawer && sub !== 'all' ? sub : null);
		set('card', openCard);
		set('sort', sort !== 'trending' ? sort : null);
		set('window', sort === 'trending' && windowYears !== DEFAULT_WINDOW ? String(windowYears) : null);
		goto(url, { shallow: true, replace: true });
	}

	async function focusId(id: string) {
		await tick();
		document.getElementById(id)?.focus();
	}

	function toggleDrawer(id: string) {
		const closing = openDrawer === id;
		openDrawer = closing ? null : id;
		sub = 'all';
		openCard = null;
		syncUrl();
		focusId(closing ? `drawer-${id}-btn` : `drawer-${id}-title`);
	}

	function pickSub(id: string) {
		sub = id;
		openCard = null;
		syncUrl();
	}

	function toggleCard(id: string) {
		const closing = openCard === id;
		openCard = closing ? null : id;
		syncUrl();
		focusId(closing ? `card-${id}-btn` : `card-${id}-title`);
	}

	function openFromStrip(e: MouseEvent, entryId: string) {
		const entry = cat.entries.find((x) => x.id === entryId);
		if (!entry) return;
		e.preventDefault();
		openDrawer = entry.drawers[0] ?? null;
		sub = 'all';
		openCard = entryId;
		syncUrl();
		tick().then(() => {
			const title = document.getElementById(`card-${entryId}-title`);
			title?.scrollIntoView({ block: 'start' });
			title?.focus({ preventScroll: true });
		});
	}

	// Arriving from a link to a card (search, network, a citation): bring that card into view.
	// Runs after SvelteKit has set its own scroll position, so it isn't overridden.
	afterNavigate(({ type }) => {
		if (type !== 'enter' || !openCard) return;
		const title = document.getElementById(`card-${openCard}-title`);
		title?.scrollIntoView({ block: 'start' });
		title?.focus({ preventScroll: true });
	});

	// ---------- Derived views ----------
	const order = $derived(comparator(sort, windowYears, stats));
	const drawerEntries = $derived(
		new Map(cat.drawers.map((d) => [d.id, cat.entries.filter((e) => e.drawers.includes(d.id)).sort(order)]))
	);
	const trending = $derived(topTrending(cat.entries, stats, DEFAULT_WINDOW));
	const tools = $derived(cat.entries.filter((e) => e.type === 'tool').length);
	const datasets = $derived(cat.entries.filter((e) => e.type === 'dataset').length);
	const preview = $derived(page.data.showUnreviewed);
	const pad = (n: number) => String(n).padStart(2, '0');

	// "I’m using this now": who is signed in, their check-ins this year, and this year’s totals per card.
	const checkin = $derived({
		signedIn: !!page.data.user,
		mine: new Set<string>(data.myCheckins),
		counts: Object.fromEntries(cat.entries.map((e) => [e.id, cat.checkins[e.id]?.[cat.currentYear] ?? 0]))
	});
	const SIGNIN_MESSAGES: Record<string, string> = {
		unavailable: 'Signing in with ORCID isn’t switched on for this site yet, so your check-in wasn’t recorded.',
		cancelled: 'Sign-in was cancelled, so nothing was recorded.',
		expired: 'That sign-in took too long or came from an old page. Please try again.',
		failed: 'ORCID couldn’t confirm the sign-in. Please try again.'
	};
	const signinMessage = $derived(SIGNIN_MESSAGES[page.url.searchParams.get('signin') ?? ''] ?? '');
</script>

<svelte:head>
	<title>The Digital Historian’s Toolbox</title>
	<meta
		name="description"
		content="A curated catalogue of the tools and public datasets historians use, linked to the projects that used them."
	/>
</svelte:head>

{#if signinMessage}
	<p class="container signin-message" role="status">{signinMessage}</p>
{/if}

<section class="container hero">
	<div class="intro">
		<p class="kicker">
			{#if preview}Preview ·{/if}
			{tools} tools · {datasets} datasets · {cat.projects.length} projects{#if preview}{' '}· seeded October 2026{/if}
		</p>
		<h1>The tools and datasets historians <em>actually</em> used, and where.</h1>
		<p class="lede">
			Pull out a drawer to see what’s filed inside. Every card separates research that used a tool from the
			benchmarks that tested it.
		</p>
	</div>
	<form class="search" role="search" action="/search" method="get">
		<label for="q" class="sr-only">Search the catalogue</label>
		<input id="q" name="q" type="search" class="field" placeholder="Search every drawer" />
		<button type="submit" class="btn">Go</button>
	</form>
</section>

<section class="container" aria-labelledby="trending-title">
	<div class="trending">
		<h2 class="label trending-title" id="trending-title">Trending · past {DEFAULT_WINDOW} years</h2>
		{#if trending.length}
			<ol>
				{#each trending as t, i (t.entry.id)}
					<li>
						<a href="/?card={t.entry.id}" onclick={(e) => openFromStrip(e, t.entry.id)}>
							<span class="rank" aria-hidden="true">{pad(i + 1)}</span>{t.entry.name}
							<span class="score">({t.score}<span class="sr-only">{t.score === 1 ? ' use' : ' uses'}</span>)</span>
						</a>
					</li>
				{/each}
			</ol>
		{:else}
			<p class="none">Nothing yet in this window.</p>
		{/if}
		<p class="trending-note">Research + corpus-building uses. Benchmarks don’t count.</p>
	</div>
</section>

<section class="container drawers" aria-labelledby="drawers-title">
	<div class="drawers-head">
		<h2 id="drawers-title">The drawers</h2>
		<span>A tool can be filed in more than one drawer</span>
	</div>

	<ul class="drawer-grid">
		{#each cat.drawers as d (d.id)}
			<li class:wide={openDrawer === d.id}>
				<Drawer
					drawer={d}
					entries={drawerEntries.get(d.id) ?? []}
					{stats}
					{guidesByEntry}
					open={openDrawer === d.id}
					{sub}
					{openCard}
					{sort}
					{windowYears}
					today={cat.today}
					{checkin}
					ontoggle={() => toggleDrawer(d.id)}
					onsub={pickSub}
					oncard={toggleCard}
					onsort={(s) => {
						sort = s;
						syncUrl();
					}}
					onwindow={(w) => {
						windowYears = w;
						syncUrl();
					}}
				/>
			</li>
		{/each}
	</ul>
</section>

<style>
	.signin-message {
		padding-top: 16px;
		color: var(--warning);
	}
	.hero {
		padding-top: 56px;
		padding-bottom: 28px;
		display: flex;
		flex-wrap: wrap;
		gap: 32px;
		align-items: flex-end;
	}
	.intro {
		flex: 999 1 560px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	h1 {
		font-size: clamp(36px, 6vw, 52px);
		line-height: 1.1;
		max-width: 860px;
	}
	h1 em {
		color: var(--accent);
	}
	.lede {
		font-size: 18px;
		line-height: 1.6;
		color: var(--text-3);
		max-width: 680px;
	}
	.search {
		flex: 1 1 320px;
		display: flex;
		gap: 8px;
	}
	.search .field {
		flex: 1 1 auto;
		min-width: 0;
		min-height: 48px;
	}
	.search .btn {
		min-height: 48px;
	}

	.trending {
		display: flex;
		flex-wrap: wrap;
		gap: 10px 22px;
		align-items: center;
		padding: 14px 18px;
		margin-bottom: 28px;
		background: var(--surface-1);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
	}
	.trending-title {
		font-family: var(--font-mono);
		color: var(--accent);
	}
	.trending ol {
		list-style: none;
		margin: 0;
		padding: 0;
		display: contents;
	}
	.trending a {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: var(--tap);
		font-size: 15px;
		color: var(--text-2);
		text-decoration: none;
	}
	.trending a:hover {
		color: var(--accent-hover);
	}
	.rank {
		font-family: var(--font-mono);
		color: var(--muted);
	}
	.score {
		font-size: 13px;
		color: var(--muted);
	}
	.none {
		font-size: 15px;
		color: var(--text-3);
	}
	.trending-note {
		margin-left: auto;
		font-size: 13px;
		color: var(--muted);
	}

	.drawers {
		padding-bottom: 64px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}
	.drawers-head {
		border-top: 3px double var(--border);
		padding-top: 24px;
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		justify-content: space-between;
		align-items: baseline;
	}
	.drawers-head h2 {
		font-size: 30px;
	}
	.drawers-head span {
		font-size: 14px;
		color: var(--muted);
	}
	.drawer-grid {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 18px;
	}
	.drawer-grid li {
		min-width: 0;
	}
	.drawer-grid li.wide {
		grid-column: 1 / -1;
	}
</style>
