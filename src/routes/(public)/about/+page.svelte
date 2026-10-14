<script lang="ts">
	import PageIntro from '#lib/components/PageIntro.svelte';
	import Placeholder from '#lib/components/Placeholder.svelte';
</script>

<svelte:head><title>About · The Digital Historian’s Toolbox</title></svelte:head>

<div class="container page">
	<PageIntro title="A card catalogue of what historians actually used." kicker="About the Toolbox">
		The Digital Historian’s Toolbox collects the software and public datasets historians work with,
		and links each one to the projects that put it to use. It is community-submitted and
		editor-reviewed.
	</PageIntro>
	<Placeholder
		step={7}
		what="The full About page from the mockup, with the latest data release and its Zenodo DOI."
	/>
</div>

<style>
	.page {
		padding-top: 56px;
		padding-bottom: 72px;
		display: flex;
		flex-direction: column;
		gap: 28px;
	}
</style>
