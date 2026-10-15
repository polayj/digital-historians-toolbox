<!--
  Edits an ordered list of pairs (facts: label + value; notes: question + answer; research: field + text).
  The list is sent with the form as JSON in a hidden field.
-->
<script lang="ts">
	import { untrack } from 'svelte';

	let {
		name,
		rows: initial,
		keys,
		labels,
		long = false,
		addLabel = 'Add a row'
	}: {
		name: string;
		rows: object[];
		keys: [string, string];
		labels: [string, string];
		long?: boolean;
		addLabel?: string;
	} = $props();

	// The editor starts from the saved values and then keeps its own copy while you edit.
	let rows = $state(untrack(() => initial.map((r) => ({ ...(r as Record<string, string>) }))));
	const [a, b] = untrack(() => keys);

	function move(i: number, by: number) {
		const j = i + by;
		if (j < 0 || j >= rows.length) return;
		[rows[i], rows[j]] = [rows[j], rows[i]];
	}
</script>

<input type="hidden" {name} value={JSON.stringify(rows)} />
<ol class="rows">
	{#each rows as row, i (i)}
		<li>
			<div class="inputs" class:long>
				<label>
					<span class="sr-only">{labels[0]} {i + 1}</span>
					<input type="text" class="field" placeholder={labels[0]} bind:value={row[a]} />
				</label>
				<label>
					<span class="sr-only">{labels[1]} {i + 1}</span>
					{#if long}
						<textarea class="field" rows="3" placeholder={labels[1]} bind:value={row[b]}></textarea>
					{:else}
						<input type="text" class="field" placeholder={labels[1]} bind:value={row[b]} />
					{/if}
				</label>
			</div>
			<div class="row-actions">
				<button type="button" class="btn icon" onclick={() => move(i, -1)} disabled={i === 0} aria-label="Move row {i + 1} up">↑</button>
				<button type="button" class="btn icon" onclick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="Move row {i + 1} down">↓</button>
				<button type="button" class="btn icon" onclick={() => rows.splice(i, 1)} aria-label="Remove row {i + 1}">✕</button>
			</div>
		</li>
	{/each}
</ol>
<button type="button" class="btn add" onclick={() => rows.push({ [a]: '', [b]: '' })}>+ {addLabel}</button>

<style>
	.rows {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	li {
		display: flex;
		gap: 8px;
		align-items: flex-start;
	}
	.inputs {
		flex: 1;
		min-width: 0;
		display: grid;
		grid-template-columns: minmax(120px, 1fr) 2.5fr;
		gap: 8px;
	}
	.inputs.long {
		grid-template-columns: 1fr;
	}
	.inputs label {
		min-width: 0;
	}
	.field {
		width: 100%;
	}
	.row-actions {
		display: flex;
		gap: 4px;
	}
	.icon {
		min-width: var(--tap);
		padding: 0;
	}
	.icon:disabled {
		opacity: 0.35;
		cursor: default;
	}
	.add {
		align-self: flex-start;
		margin-top: 8px;
	}
	@media (max-width: 640px) {
		li {
			flex-direction: column;
		}
		.inputs {
			grid-template-columns: 1fr;
			width: 100%;
		}
	}
</style>
