<script lang="ts">
	import { enhance } from '$app/forms';
	import ProjectForm from '#lib/components/admin/ProjectForm.svelte';
	import { formatDate } from '#lib/format.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	// Shown if the server fails while saving. Saves are all-or-nothing, so nothing will have changed.
	let saveError = $state('');
	const p = $derived(data.project);
	const STATUS: Record<string, string> = { needs_review: 'Waiting for review', approved: 'Filed (live)', returned: 'Returned' };
</script>

<svelte:head><title>Edit {p.shortTitle ?? p.title} · Editor’s desk</title></svelte:head>

<div class="container page">
	<p class="crumbs"><a href="/admin">← Review queue</a> · <a href="/admin/cards?show=projects">All projects</a></p>
	<div class="head">
		<h1>{p.shortTitle ?? p.title}</h1>
		<p class="meta">
			Project {p.id} · {STATUS[p.status]} · last updated {formatDate(p.lastUpdated)} ·
			{p.source === 'seed' ? 'from seed data' : `suggested by ${p.submittedBy ?? 'an anonymous submitter'}`} ·
			<a href="/admin/history/project/{p.id}">version history</a>
		</p>
		{#if p.reviewNote}<p class="note">Returned with the note: {p.reviewNote}</p>{/if}
	</div>

	{#if saveError}<p class="flash save-error" role="alert">{saveError}</p>{/if}
	{#if form?.message}<p class="flash" class:bad={!!form?.errors} role="status">{form.message}</p>{/if}

	<form method="POST" action="?/save" use:enhance={() => async ({ update, result }) => {
		saveError = result.type === 'error' ? 'Something went wrong while saving, so nothing was changed. Please try again; if it keeps happening, note what you were editing.' : '';
		if (result.type !== 'error') await update({ reset: false });
	}}>
		<ProjectForm project={p} entries={data.entries} flags={data.flags} errors={form?.errors ?? {}}>
			{#snippet buttons()}
				{#if p.status !== 'approved'}
					<button type="submit" class="btn btn-primary" formaction="?/saveAndFile">Save and file it</button>
				{/if}
				<button type="submit" class="btn" class:btn-primary={p.status === 'approved'}>Save changes</button>
			{/snippet}
		</ProjectForm>
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
		font-size: 32px;
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
	.flash {
		color: var(--dataset);
	}
	.flash.bad {
		color: var(--warning);
	}
	.save-error {
		color: var(--warning);
	}
</style>
