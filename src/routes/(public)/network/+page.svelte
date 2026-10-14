<script lang="ts">
	import PageIntro from '#lib/components/PageIntro.svelte';
	import Placeholder from '#lib/components/Placeholder.svelte';
</script>

<svelte:head><title>Network · The Digital Historian’s Toolbox</title></svelte:head>

<div class="container page">
	<PageIntro title="Who used what">
		Tools and datasets in the centre, projects around the edge. Click any point to see its
		connections. Turn benchmarks off to see which tools historians have actually put to work.
	</PageIntro>
	<Placeholder
		step={4}
		what="The interactive graph (d3-force, with zoom and pan), the side panel, the benchmark toggle and “Often used together”."
	/>
</div>

<style>
	.page {
		padding-top: 40px;
		padding-bottom: 56px;
		display: flex;
		flex-direction: column;
		gap: 22px;
	}
</style>
