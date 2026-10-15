<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { QueueItem, QueueKind, QueueStatus } from '#lib/server/queue.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const TABS: { id: QueueStatus; label: string }[] = [
		{ id: 'pending', label: 'Pending' },
		{ id: 'filed', label: 'Filed' },
		{ id: 'returned', label: 'Returned' }
	];
	const KIND_FILTERS: { id: 'all' | QueueKind; label: string }[] = [
		{ id: 'all', label: 'Everything' },
		{ id: 'tool', label: 'Tools' },
		{ id: 'dataset', label: 'Datasets' },
		{ id: 'project', label: 'Projects' },
		{ id: 'correction', label: 'Corrections' }
	];
	const KIND_LABEL: Record<QueueKind, string> = { tool: 'Tool', dataset: 'Dataset', project: 'Project', correction: 'Correction' };

	const tab = $derived((page.url.searchParams.get('tab') as QueueStatus) || 'pending');
	const kind = $derived((page.url.searchParams.get('kind') as 'all' | QueueKind) || 'all');

	function setView(next: { tab?: QueueStatus; kind?: string }) {
		const url = new URL(page.url.href);
		if (next.tab) url.searchParams.set('tab', next.tab);
		if (next.kind) url.searchParams.set('kind', next.kind);
		goto(url, { replace: true, reset: false });
	}

	// Submissions first (newest first), then seeded cards, then seeded projects.
	const order = (i: QueueItem) => (i.origin === 'submission' && i.key.startsWith('submission') ? 0 : i.key.startsWith('entry') ? 1 : 2);
	const inTab = $derived(data.items.filter((i) => i.status === tab));
	const shown = $derived(inTab.filter((i) => kind === 'all' || i.kind === kind).sort((a, b) => order(a) - order(b)));
	const counts = $derived(Object.fromEntries(TABS.map((t) => [t.id, data.items.filter((i) => i.status === t.id).length])));
	const kindCounts = $derived(
		Object.fromEntries(KIND_FILTERS.map((k) => [k.id, inTab.filter((i) => k.id === 'all' || i.kind === k.id).length]))
	);
	const uncheckedLinks = $derived(
		data.items.filter((i) => i.status === 'pending').flatMap((i) => i.links).filter((l) => l.level === 'unknown').length
	);

	let returning = $state<string | null>(null);
	let busy = $state<string | null>(null);

	const KIND_INK: Record<QueueKind, string> = {
		tool: 'var(--accent)',
		dataset: 'var(--dataset)',
		project: 'var(--kind-research)',
		correction: 'var(--warning)'
	};
</script>

<svelte:head><title>Review queue · Editor’s desk</title></svelte:head>

<div class="container page">
	<div class="head">
		<div class="title">
			<h1>Review queue</h1>
			<p>
				{counts.pending}
				{counts.pending === 1 ? 'card' : 'cards'} waiting to be filed
			</p>
		</div>
		<div class="tabs" role="group" aria-label="Queue">
			{#each TABS as t (t.id)}
				<button type="button" aria-pressed={tab === t.id} onclick={() => setView({ tab: t.id })}>
					{t.label} <span class="n">{counts[t.id]}</span>
				</button>
			{/each}
		</div>
	</div>

	<div class="toolbar">
		<div class="kinds" role="group" aria-label="Show">
			{#each KIND_FILTERS as k (k.id)}
				<button type="button" aria-pressed={kind === k.id} onclick={() => setView({ kind: k.id })}>
					{k.label} <span class="n">{kindCounts[k.id]}</span>
				</button>
			{/each}
		</div>
		{#if tab === 'pending'}
			<form
				method="POST"
				action="?/checkLinks"
				use:enhance={() => {
					busy = 'all-links';
					return async ({ update }) => {
						await update({ reset: false });
						busy = null;
					};
				}}
			>
				<button type="submit" class="btn" disabled={busy === 'all-links'}>
					{busy === 'all-links' ? 'Checking links…' : `Check links${uncheckedLinks ? ` (${uncheckedLinks} not checked yet)` : ''}`}
				</button>
			</form>
		{/if}
	</div>

	{#if form?.message && (form.key === 'all-links' || form.key === 'links')}
		<p class="flash" role="status">{form.message}</p>
	{/if}

	{#if tab === 'pending' && kind !== 'correction' && kind !== 'tool' && kind !== 'dataset'}
		<p class="tip">
			Tip: file tools and datasets before the projects that use them. A project only links to cards that are filed.
		</p>
	{/if}

	{#if shown.length === 0}
		<p class="empty">Nothing here.</p>
	{/if}

	<ul class="queue">
		{#each shown as item (item.key)}
			<li>
				<article class="item raised-2" aria-labelledby="t-{item.key}">
					<div class="main">
						<div class="meta">
							<span class="kind" style:color={KIND_INK[item.kind]}>{KIND_LABEL[item.kind]}</span>
							{#if item.ai}<span class="ai-badge">AI</span>{/if}
							<span class="credit">{item.credit}</span>
						</div>
						<h2 id="t-{item.key}">{item.title}</h2>
						{#if item.description}<p class="desc">{item.description}</p>{/if}

						{#if item.checks.length}
							<ul class="checks">
								{#each item.checks as c, i (i)}
									<li class={c.level}>{c.text}</li>
								{/each}
							</ul>
						{/if}

						{#if item.links.length}
							<ul class="links">
								{#each item.links as l (l.url)}
									<li class={l.level}>
										{l.label}: <a href={l.url} target="_blank" rel="noopener">{l.url}</a> · {l.text}
									</li>
								{/each}
							</ul>
						{/if}

						{#if item.details.length || item.adminNotes.length}
							<details>
								<summary>More detail</summary>
								<dl>
									{#each item.details as d, i (i)}
										<dt>{d.label}</dt>
										<dd>{d.text}</dd>
									{/each}
								</dl>
								{#if item.adminNotes.length}
									<div class="admin-only">
										<p class="label">Editors only · never shown publicly</p>
										<dl>
											{#each item.adminNotes as d, i (i)}
												<dt>{d.label}</dt>
												<dd>{d.text}</dd>
											{/each}
										</dl>
									</div>
								{/if}
							</details>
						{/if}

						{#if item.reviewNote}
							<p class="review-note"><strong>Note:</strong> {item.reviewNote}</p>
						{/if}
						{#if form?.key === item.key && form?.message}
							<p class="flash" role="status">{form.message}</p>
						{/if}
					</div>

					<div class="actions">
						{#if item.status === 'pending'}
							<form
								method="POST"
								action="?/file"
								use:enhance={() => {
									busy = item.key;
									return async ({ update }) => {
										await update({ reset: false });
										busy = null;
									};
								}}
							>
								<input type="hidden" name="key" value={item.key} />
								<button type="submit" class="btn btn-primary wide" disabled={busy === item.key}>
									{item.kind === 'correction' ? 'Mark as done' : 'File it'}
								</button>
							</form>
							<a class="btn wide" href={item.editHref}>{item.kind === 'correction' ? 'Edit the card' : 'Edit, then file'}</a>
							{#if returning === item.key}
								<form
									method="POST"
									action="?/return"
									class="return-form"
									use:enhance={() =>
										async ({ update, result }) => {
											await update({ reset: false });
											if (result.type === 'success') returning = null;
										}}
								>
									<input type="hidden" name="key" value={item.key} />
									<label for="note-{item.key}">What needs to change?</label>
									<textarea id="note-{item.key}" name="note" rows="3" class="field" required></textarea>
									<div class="row">
										<button type="submit" class="btn">Return it</button>
										<button type="button" class="btn btn-link" onclick={() => (returning = null)}>Cancel</button>
									</div>
								</form>
							{:else}
								<button type="button" class="btn btn-link return" onclick={() => (returning = item.key)}>Return with a note</button>
							{/if}
						{:else}
							{#if item.publicHref}
								<a class="btn wide" href={item.publicHref}>See it on the site</a>
							{/if}
							{#if !(item.status === 'filed' && item.key.startsWith('submission'))}
								<a class="btn wide" href={item.editHref}>Edit</a>
								<form method="POST" action="?/reopen" use:enhance>
									<input type="hidden" name="key" value={item.key} />
									<button type="submit" class="btn btn-link wide">Move back to Pending</button>
								</form>
							{/if}
						{/if}
					</div>
				</article>
			</li>
		{/each}
	</ul>
</div>

<style>
	.page {
		padding-top: 36px;
		padding-bottom: 56px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}
	.head {
		display: flex;
		flex-wrap: wrap;
		gap: 16px;
		align-items: flex-end;
		justify-content: space-between;
	}
	.title {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	h1 {
		font-size: 38px;
	}
	.title p {
		color: var(--text-3);
	}
	.tabs,
	.kinds {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		background: var(--surface-1);
		border: 1px solid var(--border);
		padding: 4px;
		border-radius: var(--radius-lg);
	}
	.tabs button,
	.kinds button {
		min-height: var(--tap);
		padding: 0 14px;
		font-size: 14px;
		color: var(--text-2);
		background: transparent;
		border: none;
		border-radius: var(--radius);
	}
	.tabs button[aria-pressed='true'],
	.kinds button[aria-pressed='true'] {
		font-weight: 600;
		color: var(--on-accent);
		background: var(--accent);
	}
	.kinds {
		background: transparent;
		border: none;
		padding: 0;
	}
	.kinds button {
		border: 1px solid var(--border);
	}
	.n {
		font-family: var(--font-mono);
		font-size: 12px;
		opacity: 0.85;
	}
	.toolbar {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		justify-content: space-between;
		align-items: center;
	}
	.tip,
	.empty {
		font-size: 14px;
		color: var(--muted);
	}
	.flash {
		font-size: 14px;
		color: var(--dataset);
	}
	.queue {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.item {
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		padding: 22px;
		display: flex;
		flex-wrap: wrap;
		gap: 20px;
		align-items: flex-start;
	}
	.main {
		flex: 999 1 480px;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		align-items: center;
	}
	.kind {
		font-family: var(--font-mono);
		font-size: 12px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.credit {
		font-size: 14px;
		color: var(--muted);
	}
	h2 {
		font-size: 24px;
	}
	.desc {
		font-size: 15px;
		line-height: 1.5;
		color: var(--text-3);
	}
	.checks,
	.links {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 14px;
		line-height: 1.5;
		overflow-wrap: anywhere;
	}
	.checks li::before,
	.links li::before {
		content: '● ';
		font-size: 10px;
		vertical-align: 2px;
	}
	.ok {
		color: var(--dataset);
	}
	.warn,
	.bad {
		color: var(--warning);
	}
	.info,
	.unsure,
	.unknown {
		color: var(--text-3);
	}
	.links a {
		color: inherit;
		padding: 12px 0;
	}
	details summary {
		min-height: var(--tap);
		display: flex;
		align-items: center;
		cursor: pointer;
		font-size: 14px;
		color: var(--accent);
	}
	dl {
		margin: 0;
		display: grid;
		grid-template-columns: minmax(90px, auto) 1fr;
		gap: 6px 14px;
		font-size: 14px;
		line-height: 1.45;
	}
	dt {
		color: var(--muted);
	}
	dd {
		margin: 0;
		color: var(--text-2);
		overflow-wrap: anywhere;
		white-space: pre-line;
	}
	.admin-only {
		margin-top: 12px;
		padding: 12px 14px;
		border: 1px dashed var(--warning);
		border-radius: var(--radius);
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.admin-only .label {
		color: var(--warning);
		font-size: 11px;
	}
	.review-note {
		font-size: 14px;
		color: var(--warning);
	}
	.actions {
		flex: 1 1 200px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.wide {
		width: 100%;
	}
	.return {
		color: var(--warning);
		text-decoration: underline;
	}
	.return-form {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.return-form label {
		font-size: 14px;
		color: var(--text-2);
	}
	.row {
		display: flex;
		gap: 8px;
	}
</style>
