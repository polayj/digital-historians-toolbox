<script lang="ts">
	import { enhance } from '$app/forms';
	import EntryForm from '#lib/components/admin/EntryForm.svelte';
	import { formatDate } from '#lib/format.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	// Shown if the server fails while saving. Saves are all-or-nothing, so nothing will have changed.
	let saveError = $state('');
	const e = $derived(data.entry);
	const STATUS: Record<string, string> = { needs_review: 'Waiting for review', approved: 'Filed (live)', returned: 'Returned' };
</script>

<svelte:head><title>Edit {e.name} · Editor’s desk</title></svelte:head>

<div class="container page">
	<p class="crumbs"><a href="/admin">← Review queue</a> · <a href="/admin/cards">All cards</a></p>
	<div class="head">
		<h1>{e.name}</h1>
		<p class="meta">
			{e.type} · No. {e.catalogueNumber} · {STATUS[e.status]} · last updated {formatDate(e.lastUpdated)} ·
			{e.source === 'seed' ? 'from seed data' : `suggested by ${e.submittedBy ?? 'an anonymous submitter'}`} ·
			<a href="/history/entry/{e.id}">version history</a>
			{#if e.status === 'approved'} · <a href="/?card={e.id}">see it live</a>{/if}
		</p>
		{#if e.reviewNote}<p class="note">Returned with the note: {e.reviewNote}</p>{/if}
	</div>

	{#if data.correction}
		<div class="correction raised-2">
			<p class="label">Correction suggested {data.correction.submitterName ? `by ${data.correction.submitterName}` : ''}</p>
			<p>{data.correction.payload.problem}</p>
			{#if data.correction.payload.source}<p><a href={data.correction.payload.source} target="_blank" rel="noopener">{data.correction.payload.source}</a></p>{/if}
		</div>
	{/if}

	{#if saveError}<p class="flash save-error" role="alert">{saveError}</p>{/if}
	{#if form?.message}<p class="flash" class:bad={!!form?.errors} role="status">{form.message}</p>{/if}

	<form method="POST" action="?/save" use:enhance={() => async ({ update, result }) => {
		saveError = result.type === 'error' ? 'Something went wrong while saving, so nothing was changed. Please try again; if it keeps happening, note what you were editing.' : '';
		if (result.type !== 'error') await update({ reset: false });
	}}>
		<EntryForm entry={e} drawers={data.drawers} subdrawers={data.subdrawers} errors={form?.errors ?? {}}>
			{#snippet buttons()}
				{#if data.correction}
					<button type="submit" class="btn btn-primary" formaction="?/saveCorrection&correction={data.correction.id}">Save and mark the correction done</button>
				{:else if e.status !== 'approved'}
					<button type="submit" class="btn btn-primary" formaction="?/saveAndFile">Save and file it</button>
				{/if}
				<button type="submit" class="btn" class:btn-primary={e.status === 'approved' && !data.correction}>Save changes</button>
				<span class="help">
					{e.status === 'approved' ? 'Saving updates the card’s “last updated” date and adds a line to its version history.' : 'Saving keeps it in the queue; “Save and file it” also puts it on the public site.'}
				</span>
			{/snippet}
		</EntryForm>
	</form>
</div>

<style>
	.page {
		max-width: 1000px;
		padding-top: 28px;
		padding-bottom: 64px;
		display: flex;
		flex-direction: column;
		gap: 22px;
	}
	.crumbs a {
		display: inline-block;
		padding: 12px 0;
	}
	.head {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	h1 {
		font-size: 36px;
	}
	.meta {
		font-size: 14px;
		color: var(--muted);
	}
	.meta a {
		padding: 12px 0;
	}
	.note {
		color: var(--warning);
		font-size: 14px;
	}
	.correction {
		border: 1px solid var(--warning);
		border-radius: var(--radius-lg);
		padding: 16px 18px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.correction .label {
		color: var(--warning);
	}
	.flash {
		color: var(--dataset);
	}
	.flash.bad {
		color: var(--warning);
	}
	.help {
		font-size: 13px;
		color: var(--muted);
		align-self: center;
	}
	.save-error {
		color: var(--warning);
	}
</style>
