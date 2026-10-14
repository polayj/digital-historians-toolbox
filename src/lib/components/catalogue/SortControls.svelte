<script lang="ts">
	import { SORTS, WINDOWS, type SortKey } from '#lib/ranking.js';

	let {
		sort,
		windowYears,
		onsort,
		onwindow,
		idPrefix
	}: {
		sort: SortKey;
		windowYears: number;
		onsort: (s: SortKey) => void;
		onwindow: (w: number) => void;
		idPrefix: string;
	} = $props();

	const note = $derived(SORTS.find((s) => s.id === sort)!.note);
</script>

<div class="sort-bar">
	<div class="sorts" role="group" aria-label="Sort cards">
		{#each SORTS as s (s.id)}
			<button type="button" aria-pressed={s.id === sort} onclick={() => onsort(s.id)}>{s.label}</button>
		{/each}
	</div>
	{#if sort === 'trending'}
		<label class="window" for="{idPrefix}-window">
			over the
			<select
				id="{idPrefix}-window"
				value={windowYears}
				onchange={(e) => onwindow(Number((e.currentTarget as HTMLSelectElement).value))}
			>
				{#each WINDOWS as w (w)}
					<option value={w}>{w === 1 ? 'past year' : `past ${w} years`}</option>
				{/each}
			</select>
		</label>
	{/if}
	<p class="note" aria-live="polite">{note}</p>
</div>

<style>
	.sort-bar {
		display: flex;
		flex-wrap: wrap;
		gap: 12px 20px;
		align-items: center;
	}
	.sorts {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		padding: 4px;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
	}
	.sorts button {
		min-height: var(--tap);
		padding: 0 14px;
		font-size: 14px;
		border: none;
		border-radius: var(--radius);
		color: var(--text-2);
		background: transparent;
	}
	.sorts button:hover {
		color: var(--text);
		background: var(--surface-2);
	}
	.sorts button[aria-pressed='true'] {
		color: var(--on-accent);
		background: var(--accent);
		font-weight: 600;
	}
	.window {
		display: flex;
		gap: 8px;
		align-items: center;
		font-size: 14px;
		color: var(--text-3);
	}
	select {
		min-height: var(--tap);
		padding: 0 10px;
		font-size: 14px;
		color: var(--text);
		background: var(--surface-1);
		border: 1px solid var(--border-strong);
		border-radius: var(--radius);
	}
	.note {
		flex: 1 1 280px;
		font-size: 14px;
		line-height: 1.45;
		color: var(--muted);
	}
</style>
