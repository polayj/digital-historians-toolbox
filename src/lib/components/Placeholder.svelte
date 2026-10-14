<!-- Temporary note on pages that are not built yet. Removed as each page is finished. -->
<script lang="ts">
	let { step, what }: { step: number; what: string } = $props();
</script>

<p class="placeholder raised-2">
	<span class="label">Being built · step {step}</span>
	<span>{what}</span>
</p>

<style>
	.placeholder {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 18px 20px;
		border: 1px dashed var(--border-strong);
		border-radius: var(--radius-lg);
		color: var(--text-3);
		font-size: 15px;
		max-width: 760px;
	}
</style>
