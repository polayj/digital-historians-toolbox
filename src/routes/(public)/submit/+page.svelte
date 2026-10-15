<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { onMount, tick, untrack } from 'svelte';
	import PageIntro from '#lib/components/PageIntro.svelte';
	import { KINDS, KIND_DEFINITIONS } from '#lib/format.js';
	import { DATA_HANDLING, SUBMISSION_TYPES, type SubmissionType } from '#lib/submissions.js';
	import type { ProjectKind } from '#lib/types.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	// ---------- Starting values: from a failed submission, or from a card's link ----------
	type Values = Record<string, string | string[]>;
	const initial: Values = untrack(() => (form && 'values' in form ? (form.values as Values) : {}));
	const params = page.url.searchParams;
	const fromCard = params.get('entry');
	const startType = (initial.type ?? params.get('type') ?? 'tool') as SubmissionType;

	let type = $state<SubmissionType>(SUBMISSION_TYPES.some((t) => t.id === startType) ? startType : 'tool');
	let ai = $state(initial.ai === 'on');
	let entryFilter = $state('');
	let sending = $state(false);

	const val = (k: string) => (typeof initial[k] === 'string' ? (initial[k] as string) : '');
	const list = (k: string) => [initial[k] ?? []].flat() as string[];
	const chosenEntries = new Set(list('entries').length ? list('entries') : fromCard && startType === 'project' ? [fromCard] : []);
	const chosenDrawers = new Set(list('drawers'));

	const errors = $derived((form && 'errors' in form ? form.errors : {}) as Record<string, string>);
	const sent = $derived(!!(form && 'sent' in form && form.sent));
	const errorCount = $derived(Object.keys(errors).length);

	const visibleEntries = $derived(
		data.entries.filter((e) => !entryFilter.trim() || e.name.toLowerCase().includes(entryFilter.trim().toLowerCase()))
	);
	const nameLabel = $derived(
		type === 'project' ? 'Title' : type === 'dataset' ? 'Name of the dataset' : 'Name'
	);

	// ---------- Turnstile ("are you human?") ----------
	let widget: HTMLDivElement | undefined = $state();
	let widgetId: string | undefined;
	type TurnstileApi = { render: (el: HTMLElement, opts: object) => string; reset: (id?: string) => void };

	onMount(() => {
		const w = window as unknown as { turnstile?: TurnstileApi; onTurnstileLoad?: () => void };
		const render = () => {
			if (widget && w.turnstile && !widgetId) {
				widgetId = w.turnstile.render(widget, { sitekey: data.siteKey, theme: 'dark', size: 'flexible' });
			}
		};
		if (w.turnstile) render();
		else {
			w.onTurnstileLoad = render;
			if (!document.getElementById('turnstile-script')) {
				const s = document.createElement('script');
				s.id = 'turnstile-script';
				s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad';
				s.async = true;
				document.head.appendChild(s);
			}
		}
	});

	const resetTurnstile = () => {
		const w = window as unknown as { turnstile?: TurnstileApi };
		if (widgetId && w.turnstile) w.turnstile.reset(widgetId);
	};

	async function focusFirstError() {
		await tick();
		(document.querySelector('.error-summary') as HTMLElement | null)?.focus();
	}
</script>

<svelte:head><title>Submit an entry · The Digital Historian’s Toolbox</title></svelte:head>

<div class="page">
	<PageIntro title="Submit an entry" kicker="Add a card to the catalogue">
		A tool, a dataset, or a project that used them. An editor reviews every card before it’s filed, usually within
		[timeframe].
	</PageIntro>

	{#if sent}
		<div class="thanks raised-3" role="status" tabindex="-1">
			<h2>Thank you. It’s in the editors’ queue.</h2>
			<p>
				An editor will check it and file it, usually within [timeframe]. If they have a question, they’ll use the email
				you gave. Your email is never shown on the site.
			</p>
			<p><a href="/submit">Submit another</a> · <a href="/">Back to the catalogue</a></p>
		</div>
	{:else}
		<form
			method="POST"
			novalidate
			use:enhance={() => {
				sending = true;
				return async ({ update, result }) => {
					await update({ reset: false });
					sending = false;
					if (result.type === 'failure') {
						resetTurnstile();
						focusFirstError();
					}
				};
			}}
		>
			{#if errorCount}
				<div class="error-summary" role="alert" tabindex="-1">
					<p><strong>Please fix {errorCount === 1 ? 'one thing' : `${errorCount} things`} before sending:</strong></p>
					<ul>
						{#each Object.entries(errors) as [field, msg] (field)}
							<li><a href="#{field === 'turnstile' ? 'turnstile-widget' : field}">{msg}</a></li>
						{/each}
					</ul>
				</div>
			{/if}

			<fieldset class="types">
				<legend>What are you adding?</legend>
				<div class="type-grid">
					{#each SUBMISSION_TYPES as t (t.id)}
						<label class="type-option" class:on={type === t.id}>
							<input type="radio" name="type" value={t.id} bind:group={type} />
							<span><strong class="t-{t.id}">{t.label}</strong><span>{t.hint}</span></span>
						</label>
					{/each}
				</div>
			</fieldset>

			{#if type === 'correction'}
				<div class="field-block">
					<label for="entry_id">Which card?</label>
					<select id="entry_id" name="entry_id" class="field" aria-invalid={!!errors.entry_id}>
						<option value="">Choose a card…</option>
						{#each data.entries as e (e.id)}
							<option value={e.id} selected={(val('entry_id') || fromCard) === e.id}>{e.name}</option>
						{/each}
					</select>
					{#if errors.entry_id}<p class="err">{errors.entry_id}</p>{/if}
				</div>
				<div class="field-block">
					<label for="problem">What needs correcting?</label>
					<textarea id="problem" name="problem" rows="4" class="field" aria-invalid={!!errors.problem}
						placeholder="e.g. the price changed in 2026; the licence is now MIT">{val('problem')}</textarea>
					{#if errors.problem}<p class="err">{errors.problem}</p>{/if}
				</div>
				<div class="field-block">
					<label for="source">Where can the editors check it? <span class="opt">(optional link or DOI)</span></label>
					<input id="source" name="source" type="text" inputmode="url" class="field" value={val('source')} aria-invalid={!!errors.source} />
					{#if errors.source}<p class="err">{errors.source}</p>{/if}
				</div>
			{:else}
				<div class="two">
					<div class="field-block">
						<label for="name">{nameLabel}</label>
						<input id="name" name="name" type="text" class="field" value={val('name')} aria-invalid={!!errors.name}
							placeholder={type === 'project' ? 'e.g. Mining the Dispatch' : type === 'dataset' ? 'e.g. Old Bailey Online' : 'e.g. Transkribus'} />
						{#if errors.name}<p class="err">{errors.name}</p>{/if}
					</div>
					<div class="field-block">
						<label for="url">{type === 'project' ? 'Link or DOI' : 'Website or repository'}</label>
						<input id="url" name="url" type="text" inputmode="url" class="field" value={val('url')} aria-invalid={!!errors.url} placeholder="https://" />
						{#if errors.url}<p class="err">{errors.url}</p>{/if}
					</div>
				</div>

				{#if type === 'project'}
					<div class="two">
						<div class="field-block">
							<label for="who">Who <span class="opt">(authors or team)</span></label>
							<input id="who" name="who" type="text" class="field" value={val('who')} />
						</div>
						<div class="field-block">
							<label for="year">Year <span class="opt">(e.g. 2024, or 2019–2022)</span></label>
							<input id="year" name="year" type="text" class="field" value={val('year')} />
						</div>
					</div>

					<fieldset class="field-block">
						<legend id="kind">What kind of project is it?</legend>
						{#each Object.entries(KIND_DEFINITIONS) as [k, def] (k)}
							<label class="kind-option" style:--ink={KINDS[k as ProjectKind].colour}>
								<input type="radio" name="kind" value={k} checked={val('kind') === k} />
								<span><strong>{KINDS[k as ProjectKind].label}</strong> {def}</span>
							</label>
						{/each}
						{#if errors.kind}<p class="err">{errors.kind}</p>{/if}
					</fieldset>

					<fieldset class="field-block">
						<legend id="entries">Which tools and datasets did it use? <span class="opt">(tick any)</span></legend>
						{#if data.entries.length > 12}
							<label class="sr-only" for="entry-filter">Filter the list</label>
							<input id="entry-filter" type="search" class="field filter" placeholder="Filter the list…" bind:value={entryFilter} />
						{/if}
						<div class="chips">
							{#each data.entries as e (e.id)}
								<label class="chip" class:hidden={!visibleEntries.includes(e)}>
									<input type="checkbox" name="entries" value={e.id} checked={chosenEntries.has(e.id)} />
									{e.name}
								</label>
							{/each}
						</div>
						{#if errors.entries}<p class="err">{errors.entries}</p>{/if}
						<label for="other_tools" class="sub-label">Anything it used that isn’t in the catalogue yet? <span class="opt">(optional)</span></label>
						<input id="other_tools" name="other_tools" type="text" class="field" value={val('other_tools')} />
					</fieldset>

					<div class="field-block">
						<label for="how_used">How did it use them? <span class="opt">(one or two sentences)</span></label>
						<textarea id="how_used" name="how_used" rows="3" class="field" aria-invalid={!!errors.how_used}>{val('how_used')}</textarea>
						{#if errors.how_used}<p class="err">{errors.how_used}</p>{/if}
					</div>
				{:else}
					<div class="field-block">
						<label for="description">
							{type === 'dataset' ? 'What does it hold?' : 'What does it do?'} <span class="opt">(one or two sentences)</span>
						</label>
						<textarea id="description" name="description" rows="3" class="field" aria-invalid={!!errors.description}>{val('description')}</textarea>
						{#if errors.description}<p class="err">{errors.description}</p>{/if}
					</div>
				{/if}

				{#if type === 'tool'}
					<fieldset class="field-block">
						<legend>Drawers it belongs in <span class="opt">(pick any)</span></legend>
						<div class="chips">
							{#each data.drawers.filter((d) => d.id !== 'data') as d (d.id)}
								<label class="chip">
									<input type="checkbox" name="drawers" value={d.id} checked={chosenDrawers.has(d.id)} />
									{d.label}
								</label>
							{/each}
						</div>
					</fieldset>

					<section class="ai-box raised-3">
						<label class="ai-toggle">
							<input type="checkbox" name="ai" bind:checked={ai} />
							This tool uses AI (machine learning, LLMs, vision or speech models)
						</label>
						{#if ai}
							<p class="ai-help">These answers become the card’s “Historian’s notes.” Leave any you don’t know blank.</p>
							<div class="two">
								<div class="field-block">
									<label for="data_handling" class="small">Where do uploaded sources go?</label>
									<select id="data_handling" name="data_handling" class="field">
										<option value="">Choose…</option>
										{#each DATA_HANDLING as o (o.id)}
											<option value={o.id} selected={val('data_handling') === o.id}>{o.label}</option>
										{/each}
									</select>
								</div>
								<div class="field-block">
									<label for="evaluation_url" class="small">Published evaluation or benchmark</label>
									<input id="evaluation_url" name="evaluation_url" type="text" inputmode="url" class="field" placeholder="Link or DOI"
										value={val('evaluation_url')} aria-invalid={!!errors.evaluation_url} />
									{#if errors.evaluation_url}<p class="err">{errors.evaluation_url}</p>{/if}
								</div>
							</div>
							<div class="field-block">
								<label for="known_problems" class="small">Known problems on historical sources</label>
								<textarea id="known_problems" name="known_problems" rows="2" class="field"
									placeholder="e.g. invents words on damaged pages, drops marginalia">{val('known_problems')}</textarea>
							</div>
						{/if}
					</section>
				{/if}

				{#if type === 'dataset'}
					<section class="ai-box raised-3">
						<p class="ai-help">These answers become the card’s notes. Leave any you don’t know blank.</p>
						<div class="field-block">
							<label for="holder" class="small">Who holds or publishes it?</label>
							<input id="holder" name="holder" type="text" class="field" value={val('holder')} />
						</div>
						<div class="field-block">
							<label for="how_made" class="small">How was the text made? <span class="opt">(typed by hand, corrected OCR, raw OCR…)</span></label>
							<textarea id="how_made" name="how_made" rows="2" class="field">{val('how_made')}</textarea>
						</div>
						<div class="field-block">
							<label for="gaps" class="small">Known gaps and biases</label>
							<textarea id="gaps" name="gaps" rows="2" class="field">{val('gaps')}</textarea>
						</div>
						<div class="field-block">
							<label for="terms" class="small">What are you allowed to do with it? <span class="opt">(licence, data mining, AI training)</span></label>
							<textarea id="terms" name="terms" rows="2" class="field">{val('terms')}</textarea>
						</div>
					</section>
				{/if}

				{#if type === 'tool' || type === 'dataset'}
					<div class="field-block">
						<label for="projects_used">Projects or publications that used it <span class="opt">(optional, one per line)</span></label>
						<textarea id="projects_used" name="projects_used" rows="3" class="field" placeholder="Title, link or DOI">{val('projects_used')}</textarea>
						<span class="help">These become the lines on the network graph.</span>
					</div>
				{/if}
			{/if}

			<div class="two">
				<div class="field-block">
					<label for="submitter_name">Your name <span class="opt">(credited on the card; leave blank to stay anonymous)</span></label>
					<input id="submitter_name" name="submitter_name" type="text" class="field" autocomplete="name" value={val('submitter_name')} />
				</div>
				<div class="field-block">
					<label for="submitter_email">Email <span class="opt">(never shown; only for the editors’ questions)</span></label>
					<input id="submitter_email" name="submitter_email" type="email" class="field" autocomplete="email"
						value={val('submitter_email')} aria-invalid={!!errors.submitter_email} />
					{#if errors.submitter_email}<p class="err">{errors.submitter_email}</p>{/if}
				</div>
			</div>

			<div class="send">
				<div id="turnstile-widget" class="turnstile" bind:this={widget}></div>
				{#if errors.turnstile}<p class="err">{errors.turnstile}</p>{/if}
				<div class="send-row">
					<button type="submit" class="btn btn-primary send-btn" disabled={sending}>{sending ? 'Sending…' : 'Send for review'}</button>
					<span class="help">An editor checks every submission before it appears.</span>
				</div>
			</div>
		</form>
	{/if}
</div>

<style>
	.page {
		max-width: 820px;
		margin: 0 auto;
		padding: 48px var(--gutter) 64px;
		display: flex;
		flex-direction: column;
		gap: 28px;
	}
	form {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}
	fieldset {
		border: none;
		margin: 0;
		padding: 0;
	}
	legend,
	label {
		font-weight: 600;
		font-size: 15px;
	}
	legend {
		margin-bottom: 10px;
		padding: 0;
	}
	.opt {
		font-weight: 400;
		color: var(--muted);
	}
	.type-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
		gap: 10px;
	}
	.type-option {
		display: flex;
		gap: 10px;
		align-items: flex-start;
		padding: 16px;
		background: var(--surface-1);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		cursor: pointer;
		font-weight: 400;
	}
	.type-option.on {
		background: var(--surface-3);
		border-color: var(--accent);
		--muted: #998e7c;
	}
	.type-option input,
	.kind-option input {
		width: 18px;
		height: 18px;
		margin-top: 2px;
		flex: none;
		accent-color: var(--accent);
	}
	.type-option > span {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.type-option > span > span {
		font-size: 14px;
		color: var(--text-3);
	}
	.t-tool {
		color: var(--accent);
	}
	.t-dataset {
		color: var(--dataset);
	}
	.t-project {
		color: var(--kind-research);
	}
	.t-correction {
		color: var(--warning);
	}
	.two {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 18px;
	}
	.field-block {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
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
	.small {
		font-weight: 400;
		font-size: 14px;
		color: var(--text-2);
	}
	.sub-label {
		margin-top: 12px;
		font-weight: 400;
		font-size: 14px;
		color: var(--text-2);
	}
	.kind-option {
		display: flex;
		gap: 10px;
		align-items: flex-start;
		padding: 10px 0;
		min-height: var(--tap);
		font-weight: 400;
		font-size: 15px;
		line-height: 1.5;
		color: var(--text-2);
		cursor: pointer;
	}
	.kind-option strong {
		color: var(--ink);
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
		font-weight: 400;
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
	.filter {
		margin-bottom: 10px;
		max-width: 320px;
	}
	.ai-box {
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-lg);
		padding: 22px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.ai-toggle {
		display: flex;
		gap: 10px;
		align-items: center;
		min-height: var(--tap);
		cursor: pointer;
	}
	.ai-toggle input {
		width: 18px;
		height: 18px;
		flex: none;
		accent-color: var(--accent);
	}
	.ai-help,
	.help {
		font-size: 14px;
		line-height: 1.5;
		color: var(--text-3);
		font-weight: 400;
	}
	.help {
		font-size: 13px;
		color: var(--muted);
	}
	.err {
		font-size: 14px;
		color: var(--warning);
		font-weight: 400;
	}
	.error-summary {
		border: 1px solid var(--warning);
		border-radius: var(--radius-lg);
		padding: 16px 20px;
		background: var(--surface-2);
		color: var(--text-2);
	}
	.error-summary ul {
		margin: 8px 0 0;
		padding-left: 20px;
	}
	.error-summary a {
		color: var(--warning);
		display: inline-block;
		padding: 10px 0;
	}
	.send {
		border-top: 3px double var(--border);
		padding-top: 22px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.turnstile {
		min-height: 65px;
	}
	.send-row {
		display: flex;
		flex-wrap: wrap;
		gap: 16px;
		align-items: center;
	}
	.send-btn {
		min-height: 52px;
		padding: 0 28px;
		font-size: 16px;
	}
	.send-btn:disabled {
		opacity: 0.7;
		cursor: progress;
	}
	.thanks {
		border: 1px solid var(--accent);
		border-radius: var(--radius-lg);
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.thanks h2 {
		font-size: 26px;
	}
	.thanks p {
		color: var(--text-2);
		line-height: 1.6;
	}
	.thanks a {
		display: inline-block;
		padding: 12px 0;
	}
</style>
