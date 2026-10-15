<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import type { ProjectDraft } from '#lib/drafts.js';
	import { KINDS, KIND_DEFINITIONS } from '#lib/format.js';
	import type { ProjectKind } from '#lib/types.js';

	let {
		project,
		entries,
		flags,
		errors = {},
		buttons
	}: {
		project: ProjectDraft;
		entries: { id: string; name: string; status: string }[];
		flags: { id: string; label: string }[];
		errors?: Record<string, string>;
		buttons: Snippet;
	} = $props();

	const chosen = new Set(untrack(() => project.entries));
	let filter = $state('');
</script>

<div class="form">
	<section>
		<h2 class="label">The project</h2>
		<div class="f">
			<label for="title">Full title</label>
			<input id="title" name="title" class="field" value={project.title} aria-invalid={!!errors.title} />
			{#if errors.title}<p class="err">{errors.title}</p>{/if}
		</div>
		<div class="f">
			<label for="short_title">Title shown on cards <span class="opt">(optional; the full title is used if blank)</span></label>
			<input id="short_title" name="short_title" class="field" value={project.shortTitle ?? ''} />
		</div>
		<div class="grid">
			<div class="f">
				<label for="who">Who</label>
				<input id="who" name="who" class="field" value={project.who ?? ''} />
			</div>
			<div class="f">
				<label for="year">Year <span class="opt">(as written, e.g. c. 2011, 2017–, n.d.)</span></label>
				<input id="year" name="year" class="field" value={project.year ?? ''} />
			</div>
			<div class="f">
				<label for="url">Link or DOI</label>
				<input id="url" name="url" class="field" value={project.url ?? ''} aria-invalid={!!errors.url} />
				{#if errors.url}<p class="err">{errors.url}</p>{/if}
			</div>
			<div class="f">
				<label for="verified">Link checked on <span class="opt">(YYYY-MM-DD)</span></label>
				<input id="verified" name="verified" class="field" value={project.verified ?? ''} aria-invalid={!!errors.verified} />
				{#if errors.verified}<p class="err">{errors.verified}</p>{/if}
			</div>
		</div>
		<div class="f">
			<label for="how_used">How it used them</label>
			<textarea id="how_used" name="how_used" rows="3" class="field">{project.howUsed ?? ''}</textarea>
		</div>
	</section>

	<fieldset>
		<legend class="label">Kind</legend>
		{#if errors.kind}<p class="err">{errors.kind}</p>{/if}
		{#each Object.entries(KIND_DEFINITIONS) as [k, def] (k)}
			<label class="radio" style:--ink={KINDS[k as ProjectKind].colour}>
				<input type="radio" name="kind" value={k} checked={project.kind === k} />
				<span><strong>{KINDS[k as ProjectKind].label}</strong> {def}</span>
			</label>
		{/each}
	</fieldset>

	<fieldset>
		<legend class="label">Tools and datasets it used</legend>
		<label class="sr-only" for="entry-filter">Filter the list</label>
		<input id="entry-filter" type="search" class="field filter" placeholder="Filter the list…" bind:value={filter} />
		<div class="chips">
			{#each entries as e (e.id)}
				<label class="chip" class:hidden={!!filter && !e.name.toLowerCase().includes(filter.toLowerCase())}>
					<input type="checkbox" name="entries" value={e.id} checked={chosen.has(e.id)} />
					{e.name}
					{#if e.status !== 'approved'}<span class="unfiled">not filed</span>{/if}
				</label>
			{/each}
		</div>
	</fieldset>

	<fieldset>
		<legend class="label">Flags <span class="opt">(shown as tags on the card)</span></legend>
		{#each flags as fl (fl.id)}
			<label class="check">
				<input type="checkbox" name="flags" value={fl.id} checked={project.flags.includes(fl.id)} />
				{fl.label}
			</label>
		{/each}
	</fieldset>

	<section class="admin-only">
		<h2 class="label">Editor notes · editors only, never shown publicly</h2>
		<label class="sr-only" for="editor_notes">Editor notes</label>
		<textarea id="editor_notes" name="editor_notes" rows="4" class="field">{project.editorNotes}</textarea>
	</section>

	<div class="buttons">{@render buttons()}</div>
</div>

<style>
	.form {
		display: flex;
		flex-direction: column;
		gap: 28px;
	}
	section,
	fieldset {
		display: flex;
		flex-direction: column;
		gap: 12px;
		border: none;
		margin: 0;
		padding: 0;
	}
	h2.label,
	legend.label {
		font-size: 12px;
		border-bottom: 1px solid var(--border);
		padding-bottom: 6px;
		margin-bottom: 4px;
		width: 100%;
	}
	.opt {
		text-transform: none;
		letter-spacing: 0;
		font-family: var(--font-sans);
		font-weight: 400;
		color: var(--muted);
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: 14px;
	}
	.f {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
	}
	.f label {
		font-size: 14px;
		font-weight: 600;
	}
	.field {
		width: 100%;
	}
	.field[aria-invalid='true'] {
		border-color: var(--warning);
	}
	.err {
		font-size: 14px;
		color: var(--warning);
	}
	.radio,
	.check {
		display: flex;
		gap: 10px;
		align-items: flex-start;
		min-height: var(--tap);
		padding: 8px 0;
		font-size: 14px;
		line-height: 1.5;
		color: var(--text-2);
		cursor: pointer;
	}
	.radio strong {
		color: var(--ink);
	}
	.radio input,
	.check input {
		width: 18px;
		height: 18px;
		margin-top: 2px;
		flex: none;
		accent-color: var(--accent);
	}
	.filter {
		max-width: 320px;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-height: var(--tap);
		padding: 0 14px;
		background: var(--surface-1);
		border: 1px solid var(--border);
		border-radius: 999px;
		font-size: 14px;
		color: var(--text-2);
		cursor: pointer;
	}
	.chip:has(input:checked) {
		border-color: var(--accent);
		color: var(--text);
	}
	.chip.hidden {
		display: none;
	}
	.chip input {
		width: 16px;
		height: 16px;
		accent-color: var(--accent);
	}
	.unfiled {
		font-size: 12px;
		color: var(--muted);
	}
	.admin-only {
		border: 1px dashed var(--warning);
		border-radius: var(--radius-lg);
		padding: 16px;
	}
	.admin-only h2.label {
		color: var(--warning);
		border-bottom-color: transparent;
	}
	.buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		border-top: 3px double var(--border);
		padding-top: 20px;
	}
</style>
