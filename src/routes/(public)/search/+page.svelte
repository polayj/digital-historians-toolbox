<script lang="ts">
	import { page } from '$app/state';
	import PageIntro from '#lib/components/PageIntro.svelte';
	import Placeholder from '#lib/components/Placeholder.svelte';
</script>

<svelte:head><title>Search · The Digital Historian’s Toolbox</title></svelte:head>

<div class="container page">
	<PageIntro title="Search the catalogue" />
	<form class="search" role="search" method="get">
		<label for="q" class="sr-only">Search</label>
		<input id="q" name="q" type="search" class="field" value={page.url.searchParams.get('q') ?? ''} />
		<button type="submit" class="btn btn-primary">Search</button>
	</form>
	<Placeholder
		step={4}
		what="Results across tools, datasets and projects, with filters for type, AI, runs locally, published evaluation, cost and skill level."
	/>
</div>

<style>
	.page {
		padding-top: 40px;
		padding-bottom: 56px;
		display: flex;
		flex-direction: column;
		gap: 20px;
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
</style>
