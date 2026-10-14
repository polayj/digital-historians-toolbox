<script lang="ts">
	import PageIntro from '#lib/components/PageIntro.svelte';
	import { formatDate } from '#lib/format.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const ACTIONS: Record<string, string> = {
		seeded: 'Added from the researched seed data',
		created: 'Added to the catalogue',
		edited: 'Edited by the editors',
		filed: 'Reviewed and filed by the editors',
		returned: 'Sent back for changes'
	};
	const backHref = $derived(data.type === 'entry' ? `/?card=${data.record.id}` : '/');
</script>

<svelte:head><title>Version history: {data.record.name} · The Digital Historian’s Toolbox</title></svelte:head>

<div class="page">
	<PageIntro title={data.record.name} kicker="Version history">
		Every change to this card, newest first. Last updated {formatDate(data.record.last_updated)}.
	</PageIntro>

	<ol class="history">
		{#each data.history as h, i (i)}
			<li>
				<span class="date">{formatDate(h.date)}</span>
				<span class="what">
					{ACTIONS[h.action] ?? h.action}{#if h.fields.length}: {h.fields.join(', ')}{/if}
				</span>
			</li>
		{:else}
			<li><span class="what">No recorded changes yet.</span></li>
		{/each}
	</ol>

	<p><a href={backHref}>← Back to the card</a></p>
</div>

<style>
	.page {
		max-width: 820px;
		margin: 0 auto;
		padding: 48px var(--gutter) 64px;
		display: flex;
		flex-direction: column;
		gap: 24px;
	}
	.history {
		list-style: none;
		margin: 0;
		padding: 0;
		border-top: 3px double var(--border);
	}
	.history li {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 20px;
		padding: 14px 0;
		border-bottom: 1px solid var(--border);
	}
	.date {
		flex: 0 0 120px;
		font-family: var(--font-mono);
		font-size: 13px;
		color: var(--muted);
		padding-top: 2px;
	}
	.what {
		flex: 1 1 300px;
		color: var(--text-2);
	}
	p a {
		display: inline-flex;
		align-items: center;
		min-height: var(--tap);
	}
</style>
