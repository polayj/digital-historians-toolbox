<script lang="ts">
	import { page } from '$app/state';
	import { KINDS, formatDate, isDueForReview } from '#lib/format.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let show = $state<'cards' | 'projects'>(page.url.searchParams.get('show') === 'projects' ? 'projects' : 'cards');
	let filter = $state('');
	const today = new Date().toISOString().slice(0, 10);
	const STATUS: Record<string, string> = { needs_review: 'waiting', approved: 'live', returned: 'returned' };
	const match = (name: string) => !filter.trim() || name.toLowerCase().includes(filter.trim().toLowerCase());
</script>

<svelte:head><title>All cards · Editor’s desk</title></svelte:head>

<div class="container page">
	<h1>All cards</h1>
	<p class="lede">Edit any card or project, live or not. Editing a live card updates its “last updated” date and its version history.</p>

	<div class="bar">
		<div class="tabs" role="group" aria-label="Show">
			<button type="button" aria-pressed={show === 'cards'} onclick={() => (show = 'cards')}>Tools and datasets <span class="n">{data.entries.length}</span></button>
			<button type="button" aria-pressed={show === 'projects'} onclick={() => (show = 'projects')}>Projects <span class="n">{data.projects.length}</span></button>
		</div>
		<label class="sr-only" for="filter">Filter by name</label>
		<input id="filter" type="search" class="field" placeholder="Filter by name…" bind:value={filter} />
	</div>

	<table>
		<thead>
			{#if show === 'cards'}
				<tr><th scope="col">No.</th><th scope="col">Name</th><th scope="col">Status</th><th scope="col">Last updated</th></tr>
			{:else}
				<tr><th scope="col">Id</th><th scope="col">Title</th><th scope="col">Kind</th><th scope="col">Status</th></tr>
			{/if}
		</thead>
		<tbody>
			{#if show === 'cards'}
				{#each data.entries.filter((e) => match(e.name)) as e (e.id)}
					<tr>
						<td class="mono">{e.no}</td>
						<td><a href="/admin/entries/{e.id}">{e.name}</a> <span class="muted">{e.type}</span></td>
						<td class="status {e.status}">{STATUS[e.status]}</td>
						<td class:due={isDueForReview(e.lastUpdated, today)}>{formatDate(e.lastUpdated)}{isDueForReview(e.lastUpdated, today) ? ' · due for review' : ''}</td>
					</tr>
				{/each}
			{:else}
				{#each data.projects.filter((p) => match(p.name)) as p (p.id)}
					<tr>
						<td class="mono">{p.id}</td>
						<td><a href="/admin/projects/{p.id}">{p.name}</a> <span class="muted">{p.year ?? ''}</span></td>
						<td style:color={KINDS[p.kind].colour}>{KINDS[p.kind].label}</td>
						<td class="status {p.status}">{STATUS[p.status]}</td>
					</tr>
				{/each}
			{/if}
		</tbody>
	</table>
</div>

<style>
	.page {
		padding-top: 36px;
		padding-bottom: 56px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	h1 {
		font-size: 38px;
	}
	.lede {
		color: var(--text-3);
	}
	.bar {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		align-items: center;
	}
	.bar .field {
		max-width: 320px;
		flex: 1 1 200px;
	}
	.tabs {
		display: flex;
		gap: 4px;
		background: var(--surface-1);
		border: 1px solid var(--border);
		padding: 4px;
		border-radius: var(--radius-lg);
	}
	.tabs button {
		min-height: var(--tap);
		padding: 0 14px;
		font-size: 14px;
		color: var(--text-2);
		background: transparent;
		border: none;
		border-radius: var(--radius);
	}
	.tabs button[aria-pressed='true'] {
		font-weight: 600;
		color: var(--on-accent);
		background: var(--accent);
	}
	.n {
		font-family: var(--font-mono);
		font-size: 12px;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 15px;
	}
	th {
		text-align: left;
		font-family: var(--font-mono);
		font-size: 12px;
		font-weight: 500;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--muted);
		border-bottom: 3px double var(--border);
		padding: 8px 10px;
	}
	td {
		border-bottom: 1px solid var(--border);
		padding: 0 10px;
		height: var(--tap);
	}
	td a {
		display: inline-block;
		padding: 12px 0;
	}
	.mono {
		font-family: var(--font-mono);
		font-size: 13px;
		color: var(--text-3);
	}
	.muted {
		color: var(--muted);
		font-size: 13px;
	}
	.status.approved {
		color: var(--dataset);
	}
	.status.needs_review {
		color: var(--text-3);
	}
	.status.returned,
	.due {
		color: var(--warning);
	}
</style>
