<script lang="ts">
	import Placeholder from '#lib/components/Placeholder.svelte';
</script>

<svelte:head><title>Review queue · Editor’s desk</title></svelte:head>

<div class="container page">
	<h1>Review queue</h1>
	<Placeholder
		step={5}
		what="Pending / Filed / Returned, with File it, Edit then file, and Return with a note. Seeded records arrive here marked “From seed data”."
	/>
</div>

<style>
	.page {
		padding-top: 36px;
		padding-bottom: 56px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}
	h1 {
		font-size: 38px;
	}
</style>
