<!-- Page heading block: optional brass kicker, a serif title, an optional lede. -->
<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		kicker,
		children
	}: { title: string; kicker?: string; children?: Snippet } = $props();
</script>

<div class="intro">
	{#if kicker}<p class="kicker">{kicker}</p>{/if}
	<h1>{title}</h1>
	{#if children}<p class="lede">{@render children()}</p>{/if}
</div>

<style>
	.intro {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	h1 {
		font-size: clamp(32px, 5vw, 44px);
	}
	.lede {
		font-size: 17px;
		line-height: 1.6;
		color: var(--text-3);
		max-width: 760px;
	}
</style>
