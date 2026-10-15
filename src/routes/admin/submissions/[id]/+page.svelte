<script lang="ts">
	import { enhance } from '$app/forms';
	import EntryForm from '#lib/components/admin/EntryForm.svelte';
	import ProjectForm from '#lib/components/admin/ProjectForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	// Shown if the server fails while saving. Saves are all-or-nothing, so nothing will have changed.
	let saveError = $state('');
	const s = $derived(data.submission);
</script>

<svelte:head><title>Edit, then file · Editor’s desk</title></svelte:head>

<div class="container page">
	<p class="crumbs"><a href="/admin">← Review queue</a></p>
	<div class="head">
		<p class="kicker">Submission #{s.id} · {s.type}</p>
		<h1>Edit, then file</h1>
		<p class="meta">
			Sent by {s.submitterName || 'an anonymous submitter'} on {s.createdAt.slice(0, 10)}.
			{#if s.submitterEmail}Their email (never shown publicly): <a href="mailto:{s.submitterEmail}">{s.submitterEmail}</a>.{/if}
		</p>
		<p class="meta">
			Fill in anything missing, then file it. The submitter’s name is credited on the card
			{s.submitterName ? `as “${s.submitterName}”` : '(none given)'}.
		</p>
	</div>

	{#if saveError}<p class="flash save-error" role="alert">{saveError}</p>{/if}
	{#if form?.message}<p class="flash" role="alert">{form.message}</p>{/if}

	<form method="POST" action="?/file" use:enhance={() => async ({ update, result }) => {
		saveError = result.type === 'error' ? 'Something went wrong while saving, so nothing was changed. Please try again; if it keeps happening, note what you were editing.' : '';
		if (result.type !== 'error') await update({ reset: false });
	}}>
		{#if data.kind === 'entry'}
			<EntryForm entry={data.entry} drawers={data.drawers} subdrawers={data.subdrawers} errors={form?.errors ?? {}}>
				{#snippet buttons()}
					<button type="submit" class="btn btn-primary">File it</button>
					<a class="btn" href="/admin">Cancel</a>
				{/snippet}
			</EntryForm>
		{:else}
			<ProjectForm project={data.project} entries={data.entries} flags={data.flags} errors={form?.errors ?? {}}>
				{#snippet buttons()}
					<button type="submit" class="btn btn-primary">File it</button>
					<a class="btn" href="/admin">Cancel</a>
				{/snippet}
			</ProjectForm>
		{/if}
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
		color: var(--text-3);
	}
	.meta a {
		padding: 12px 0;
	}
	.flash {
		color: var(--warning);
	}
	.save-error {
		color: var(--warning);
	}
</style>
