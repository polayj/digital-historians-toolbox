<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { DATASET_QUESTIONS, TOOL_QUESTIONS } from '#lib/checks.js';
	import type { EntryDraft } from '#lib/drafts.js';
	import PairsEditor from './PairsEditor.svelte';

	let {
		entry,
		drawers,
		subdrawers,
		errors = {},
		buttons
	}: {
		entry: EntryDraft;
		drawers: { id: string; number: string; label: string }[];
		subdrawers: { drawer_id: string; id: string; label: string }[];
		errors?: Record<string, string>;
		buttons: Snippet;
	} = $props();

	// The form starts from the saved card, then keeps your edits until you save.
	const start = untrack(() => entry);
	// The three standard questions are always offered, even if a card has fewer notes.
	const questions = start.type === 'dataset' ? DATASET_QUESTIONS : TOOL_QUESTIONS;
	const startingNotes = start.notes.length ? start.notes : questions.map((q) => ({ q, a: '' }));

	let chosenDrawers = $state(new Set(start.drawers));
	const subsFor = (drawerId: string) => subdrawers.filter((s) => s.drawer_id === drawerId);
	const chosenSubs = new Set(start.subdrawers);
</script>

<div class="form">
	<section>
		<h2 class="label">The card</h2>
		<div class="grid">
			<div class="f">
				<label for="name">Name</label>
				<input id="name" name="name" class="field" value={entry.name} aria-invalid={!!errors.name} />
				{#if errors.name}<p class="err">{errors.name}</p>{/if}
			</div>
			<div class="f small">
				<label for="type">Type</label>
				<select id="type" name="type" class="field">
					<option value="tool" selected={entry.type === 'tool'}>Tool</option>
					<option value="dataset" selected={entry.type === 'dataset'}>Dataset</option>
				</select>
			</div>
			<div class="f small">
				<label for="catalogue_number">Catalogue No.</label>
				<input id="catalogue_number" name="catalogue_number" class="field" value={entry.catalogueNumber} aria-invalid={!!errors.catalogue_number} />
				{#if errors.catalogue_number}<p class="err">{errors.catalogue_number}</p>{/if}
			</div>
			<div class="f">
				<label for="website">Website</label>
				<input id="website" name="website" class="field" value={entry.website ?? ''} aria-invalid={!!errors.website} />
				{#if errors.website}<p class="err">{errors.website}</p>{/if}
			</div>
			<div class="f small">
				<label for="release_year">Release year <span class="opt">(for “Newest”)</span></label>
				<input id="release_year" name="release_year" class="field" inputmode="numeric" value={entry.releaseYear ?? ''} aria-invalid={!!errors.release_year} />
				{#if errors.release_year}<p class="err">{errors.release_year}</p>{/if}
			</div>
			<label class="check f small">
				<input type="checkbox" name="ai" checked={entry.ai} /> Uses AI (shows the AI badge)
			</label>
		</div>
		<div class="f">
			<label for="description">Description <span class="opt">(shown on the card)</span></label>
			<textarea id="description" name="description" rows="3" class="field" aria-invalid={!!errors.description}>{entry.description}</textarea>
			{#if errors.description}<p class="err">{errors.description}</p>{/if}
		</div>
	</section>

	<section>
		<h2 class="label">Drawers and guide cards</h2>
		{#if errors.drawers}<p class="err">{errors.drawers}</p>{/if}
		<div class="drawers">
			{#each drawers as d (d.id)}
				<fieldset>
					<legend>
						<label class="check">
							<input
								type="checkbox"
								name="drawers"
								value={d.id}
								checked={chosenDrawers.has(d.id)}
								onchange={(e) => {
									const on = (e.currentTarget as HTMLInputElement).checked;
									const next = new Set(chosenDrawers);
									if (on) next.add(d.id);
									else next.delete(d.id);
									chosenDrawers = next;
								}}
							/>
							{d.number} · {d.label}
						</label>
					</legend>
					{#if chosenDrawers.has(d.id) && subsFor(d.id).length}
						<div class="subs">
							{#each subsFor(d.id) as s (s.id)}
								<label class="check sub">
									<input type="checkbox" name="subdrawers" value={s.id} checked={chosenSubs.has(s.id)} />
									{s.label}
								</label>
							{/each}
						</div>
					{/if}
				</fieldset>
			{/each}
		</div>
		<p class="hint">A guide card such as “Handwriting (HTR)” applies in every drawer that has it.</p>
	</section>

	<section>
		<h2 class="label">At a glance <span class="opt">(facts, in order)</span></h2>
		<PairsEditor name="facts" rows={entry.facts} keys={['k', 'v']} labels={['Label, e.g. Licence', 'Value']} addLabel="Add a fact" />
	</section>

	<section>
		<h2 class="label">Historian’s notes</h2>
		<PairsEditor name="notes" rows={startingNotes} keys={['q', 'a']} labels={['Question', 'Answer']} long addLabel="Add a note" />
	</section>

	<section>
		<h2 class="label">Search filters</h2>
		<div class="grid">
			<div class="f small">
				<label for="cost_band">Cost</label>
				<select id="cost_band" name="cost_band" class="field">
					<option value="" selected={!entry.costBand}>Not set</option>
					<option value="free" selected={entry.costBand === 'free'}>Free</option>
					<option value="freemium" selected={entry.costBand === 'freemium'}>Free tier + paid</option>
					<option value="paid" selected={entry.costBand === 'paid'}>Paid</option>
				</select>
			</div>
			<div class="f small">
				<label for="skill_level">Skill needed</label>
				<select id="skill_level" name="skill_level" class="field">
					<option value="" selected={!entry.skillLevel}>Not set</option>
					<option value="no_code" selected={entry.skillLevel === 'no_code'}>No code</option>
					<option value="some_code" selected={entry.skillLevel === 'some_code'}>Some code</option>
					<option value="programming" selected={entry.skillLevel === 'programming'}>Programming</option>
				</select>
			</div>
			<div class="f small">
				<label for="runs_locally">Runs locally</label>
				<select id="runs_locally" name="runs_locally" class="field">
					<option value="" selected={entry.runsLocally === null}>Not set</option>
					<option value="1" selected={entry.runsLocally === true}>Yes</option>
					<option value="0" selected={entry.runsLocally === false}>No</option>
				</select>
			</div>
		</div>
	</section>

	<section class="admin-only">
		<h2 class="label">Research notes · editors only, never shown publicly</h2>
		<PairsEditor name="research" rows={Object.entries(entry.research).map(([k, v]) => ({ k, v }))} keys={['k', 'v']} labels={['Field', 'Notes']} long addLabel="Add a research note" />
	</section>

	<div class="buttons">{@render buttons()}</div>
</div>

<style>
	.form {
		display: flex;
		flex-direction: column;
		gap: 28px;
	}
	section {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	h2.label {
		font-size: 12px;
		border-bottom: 1px solid var(--border);
		padding-bottom: 6px;
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
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 14px;
		align-items: end;
	}
	.f {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
	}
	.f label,
	legend {
		font-size: 14px;
		font-weight: 600;
	}
	.field {
		width: 100%;
	}
	select.field {
		padding: 0 10px;
	}
	.field[aria-invalid='true'] {
		border-color: var(--warning);
	}
	.err {
		font-size: 14px;
		color: var(--warning);
	}
	.check {
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: var(--tap);
		font-size: 14px;
		cursor: pointer;
	}
	.check input {
		width: 18px;
		height: 18px;
		accent-color: var(--accent);
	}
	.drawers {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: 6px 16px;
	}
	fieldset {
		border: none;
		margin: 0;
		padding: 0;
	}
	.subs {
		padding-left: 28px;
	}
	.sub {
		font-weight: 400;
		color: var(--text-2);
	}
	.hint {
		font-size: 13px;
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
