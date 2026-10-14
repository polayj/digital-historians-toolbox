<script lang="ts">
	import Placeholder from '#lib/components/Placeholder.svelte';
</script>

<svelte:head>
	<title>The Digital Historian’s Toolbox</title>
	<meta
		name="description"
		content="A curated catalogue of the tools and public datasets historians use, linked to the projects that used them."
	/>
</svelte:head>

<section class="container hero">
	<div class="intro">
		<p class="kicker">Preview · seeded October 2026</p>
		<h1>The tools and datasets historians <em>actually</em> used, and where.</h1>
		<p class="lede">
			Pull out a drawer to see what’s filed inside. Every card separates research that used a tool
			from the benchmarks that tested it.
		</p>
	</div>
	<form class="search" role="search" action="/search" method="get">
		<label for="q" class="sr-only">Search the catalogue</label>
		<input id="q" name="q" type="search" class="field" placeholder="Search every drawer" />
		<button type="submit" class="btn">Go</button>
	</form>
</section>

<section class="container drawers" aria-labelledby="drawers-title">
	<div class="drawers-head">
		<h2 id="drawers-title">The drawers</h2>
		<span>A tool can be filed in more than one drawer</span>
	</div>
	<Placeholder
		step={3}
		what="The Trending strip, the eight drawers, guide-card tabs, sorting and expanding cards arrive once the database is in place."
	/>
</section>

<style>
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
</style>
