<script lang="ts">
	import PageIntro from '#lib/components/PageIntro.svelte';
	import Placeholder from '#lib/components/Placeholder.svelte';
</script>

<svelte:head><title>Submit an entry · The Digital Historian’s Toolbox</title></svelte:head>

<div class="page">
	<PageIntro title="Submit an entry" kicker="Add a card to the catalogue">
		A tool, a dataset, or a project that used them. An editor reviews every card before it’s filed,
		usually within [timeframe].
	</PageIntro>
	<Placeholder
		step={5}
		what="One form for a tool, dataset or project, with AI questions that become the card’s historian’s notes. Protected by Turnstile; saved as pending."
	/>
</div>

<style>
	.page {
		max-width: 820px;
		margin: 0 auto;
		padding: 48px var(--gutter) 64px;
		display: flex;
		flex-direction: column;
		gap: 28px;
	}
</style>
