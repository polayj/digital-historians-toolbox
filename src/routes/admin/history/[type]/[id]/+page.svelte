<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const ACTIONS: Record<string, string> = {
		seeded: 'Loaded from seed data',
		created: 'Created from a submission',
		edited: 'Edited',
		filed: 'Filed (went live)',
		returned: 'Returned with a note'
	};
	const editHref = $derived(`/admin/${data.type === 'entry' ? 'entries' : 'projects'}/${data.record.id}`);
</script>

<svelte:head><title>History: {data.record.name} · Editor’s desk</title></svelte:head>

<div class="container page">
	<p class="crumbs"><a href={editHref}>← Back to editing</a> · <a href="/history/{data.type}/{data.record.id}">Public version</a></p>
	<h1>{data.record.name}</h1>
	<p class="lede">Every change, newest first, with old and new values. Editors only: the public version shows only which fields changed.</p>

	<ol class="history">
		{#each data.history as h (h.id)}
			<li class="raised-2">
				<p class="what"><strong>{ACTIONS[h.action] ?? h.action}</strong> <span class="meta">· {h.at} · {h.editor ?? 'unknown'}</span></p>
				{#if h.note}<p class="note">{h.note}</p>{/if}
				{#each h.changes as c (c.field)}
					<div class="change">
						<p class="label">{c.field}</p>
						<div class="cols">
							<div><span class="tag">Before</span><pre>{c.from}</pre></div>
							<div><span class="tag">After</span><pre>{c.to}</pre></div>
						</div>
					</div>
				{/each}
			</li>
		{:else}
			<li class="raised-2">No changes recorded.</li>
		{/each}
	</ol>
</div>

<style>
	.page {
		max-width: 1100px;
		padding-top: 28px;
		padding-bottom: 64px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.crumbs a {
		display: inline-block;
		padding: 12px 0;
	}
	h1 {
		font-size: 32px;
	}
	.lede {
		color: var(--text-3);
	}
	.history {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.history > li {
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		padding: 16px 18px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.meta {
		color: var(--muted);
		font-size: 14px;
	}
	.note {
		color: var(--text-2);
		font-size: 14px;
	}
	.change {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.cols {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 10px;
	}
	.tag {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--muted);
	}
	pre {
		margin: 4px 0 0;
		padding: 10px 12px;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		font-family: var(--font-mono);
		font-size: 12.5px;
		line-height: 1.5;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		max-height: 320px;
		overflow: auto;
		color: var(--text-2);
	}
</style>
