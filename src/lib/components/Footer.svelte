<script lang="ts">
	import { GITHUB_URL, RUN_BY, ZENODO_URL } from '#lib/site.js';

	let { preview = false }: { preview?: boolean } = $props();
</script>

<footer>
	<div class="container row">
		<span>
			Community submitted, editor reviewed.{#if preview}{' '}Preview data: verify before citing.{/if}
		</span>
		<span>
			Run by {RUN_BY} ·
			{#if GITHUB_URL}<a href={GITHUB_URL}>Data on GitHub</a>{:else}Data on GitHub [link to come]{/if}
			·
			{#if ZENODO_URL}<a href={ZENODO_URL}>Archived on Zenodo</a>{:else}Archived on Zenodo [link to come]{/if}
		</span>
	</div>
</footer>

<style>
	footer {
		border-top: 1px solid var(--border);
	}
	.row {
		padding-top: 28px;
		padding-bottom: 28px;
		display: flex;
		flex-wrap: wrap;
		gap: 16px;
		justify-content: space-between;
		font-size: 14px;
		color: var(--muted);
	}
	a {
		display: inline-block;
		padding: 12px 0;
		margin: -12px 0;
	}
</style>
