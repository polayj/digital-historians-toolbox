<!--
  The drawn graph: shapes, lines, labels, zoom and pan.
  Tools are brass circles, datasets teal squares, projects diamonds coloured by kind
  (evaluations hollow), so shape as well as colour tells them apart.
  Zoom: buttons, Ctrl/⌘ + scroll, or pinch. Pan: drag (one finger scrolls the page on phones).
-->
<script lang="ts">
	import { select } from 'd3-selection';
	import { zoom, zoomIdentity, type D3ZoomEvent, type ZoomBehavior } from 'd3-zoom';
	import { onMount } from 'svelte';
	import { KINDS } from '#lib/format.js';
	import { VIEW, type GraphLink, type GraphNode } from '#lib/network.js';

	let {
		nodes,
		links,
		selected,
		onselect
	}: {
		nodes: GraphNode[];
		links: GraphLink[];
		selected: string | null;
		onselect: (key: string | null) => void;
	} = $props();

	let svg: SVGSVGElement;
	let transform = $state({ x: 0, y: 0, k: 1 });
	let zoomer: ZoomBehavior<SVGSVGElement, unknown> | undefined;
	let focusedKey = $state<string | null>(null);

	onMount(() => {
		zoomer = zoom<SVGSVGElement, unknown>()
			.scaleExtent([0.6, 8])
			.filter((event: Event) => {
				// Plain scrolling should scroll the page; zoom needs Ctrl/⌘ (trackpad pinch sends Ctrl too).
				if (event.type === 'wheel') return (event as WheelEvent).ctrlKey || (event as WheelEvent).metaKey;
				// On touch screens, one finger scrolls the page; two fingers pan and zoom.
				if (event.type.startsWith('touch')) return (event as TouchEvent).touches.length > 1;
				return !(event as MouseEvent).button;
			})
			.on('zoom', (e: D3ZoomEvent<SVGSVGElement, unknown>) => {
				transform = { x: e.transform.x, y: e.transform.y, k: e.transform.k };
			});
		const sel = select(svg).call(zoomer).on('dblclick.zoom', null);
		svg.style.touchAction = 'pan-y';
		return () => sel.on('.zoom', null);
	});

	export function zoomBy(factor: number) {
		if (zoomer) select(svg).call(zoomer.scaleBy, factor);
	}
	export function resetZoom() {
		if (zoomer) select(svg).call(zoomer.transform, zoomIdentity);
	}

	const nodeByKey = $derived(new Map(nodes.map((n) => [n.key, n])));
	const linked = $derived.by(() => {
		if (!selected) return null;
		const set = new Set([selected]);
		for (const l of links) {
			if (l.source === selected) set.add(l.target);
			if (l.target === selected) set.add(l.source);
		}
		return set;
	});
	const isHi = (l: GraphLink) => !!selected && (l.source === selected || l.target === selected);

	const EDGE: Record<string, string> = {
		research: 'var(--kind-research)',
		corpus_building: 'var(--kind-corpus)',
		evaluation: 'var(--border-strong)'
	};

	const diamond = (s: number) => `M0 ${-s * 1.25}L${s * 1.25} 0L0 ${s * 1.25}L${-s * 1.25} 0Z`;

	function describe(n: GraphNode) {
		if (n.type === 'project') return `${n.label} (${KINDS[n.kind!].label} project)`;
		return `${n.label} (${n.type})`;
	}

	function onKey(e: KeyboardEvent, key: string) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onselect(selected === key ? null : key);
		} else if (e.key === 'Escape') {
			onselect(null);
		}
	}

	// Draw selected and labelled things last so they sit on top.
	const drawOrder = $derived(
		nodes.slice().sort((a, b) => Number(a.type !== 'project') - Number(b.type !== 'project') || Number(a.key === selected) - Number(b.key === selected))
	);
</script>

<svg
	bind:this={svg}
	viewBox="0 0 {VIEW.width} {VIEW.height}"
	class="graph"
	role="group"
	aria-label="Network graph of tools, datasets and the projects that used them. Use the list below the graph for a text version."
>
	<rect width={VIEW.width} height={VIEW.height} fill="transparent" onclick={() => onselect(null)} role="presentation" />
	<g transform="translate({transform.x} {transform.y}) scale({transform.k})">
		<g class="edges" class:dimmed={!!selected}>
			{#each links as l (l.source + l.target)}
				{@const a = nodeByKey.get(l.source)}
				{@const b = nodeByKey.get(l.target)}
				{#if a && b && !isHi(l)}
					<line
						x1={a.x}
						y1={a.y}
						x2={b.x}
						y2={b.y}
						stroke={EDGE[l.kind]}
						stroke-width={l.kind === 'evaluation' ? 1 : l.kind === 'research' ? 1.5 : 1.3}
						stroke-dasharray={l.kind === 'evaluation' ? '3 4' : undefined}
						vector-effect="non-scaling-stroke"
					/>
				{/if}
			{/each}
		</g>
		<g class="edges-hi">
			{#each links.filter(isHi) as l (l.source + l.target)}
				{@const a = nodeByKey.get(l.source)}
				{@const b = nodeByKey.get(l.target)}
				{#if a && b}
					<line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--accent-hover)" stroke-width="2.5" vector-effect="non-scaling-stroke" />
				{/if}
			{/each}
		</g>

		{#each drawOrder as n (n.key)}
			{@const on = !linked || linked.has(n.key)}
			{@const isSel = selected === n.key}
			<g
				class="node"
				class:faded={!on}
				transform="translate({n.x} {n.y})"
				role="button"
				tabindex={n.type === 'project' ? -1 : 0}
				aria-label={describe(n)}
				aria-pressed={isSel}
				onclick={(e) => {
					e.stopPropagation();
					onselect(isSel ? null : n.key);
				}}
				onkeydown={(e) => onKey(e, n.key)}
				onfocus={() => (focusedKey = n.key)}
				onblur={() => (focusedKey = null)}
			>
				<title>{describe(n)}</title>
				<!-- Invisible larger hit area so small shapes are easy to tap -->
				<circle r={Math.max(n.size + 4, 11)} fill="transparent" />
				{#if isSel || focusedKey === n.key}
					<circle r={n.size * (n.type === 'project' ? 1.25 : 1) + 6} fill="none" stroke="var(--accent-hover)" stroke-width="2" vector-effect="non-scaling-stroke" />
				{/if}
				{#if n.type === 'tool'}
					<circle r={n.size} fill="var(--accent)" />
				{:else if n.type === 'dataset'}
					<rect x={-n.size} y={-n.size} width={n.size * 2} height={n.size * 2} rx="2" fill="var(--dataset)" />
				{:else if n.kind === 'evaluation'}
					<path d={diamond(n.size)} fill="var(--surface-1)" stroke="var(--kind-evaluation)" stroke-width="1.5" vector-effect="non-scaling-stroke" />
				{:else}
					<path d={diamond(n.size)} fill={KINDS[n.kind!].colour} />
				{/if}
				{#if n.type !== 'project' || isSel}
					<text
						class="node-label"
						y={n.labelAbove ? -(n.size + 7) : n.size + 15}
						text-anchor="middle"
						font-size={13 / Math.sqrt(transform.k)}>{n.label}</text
					>
				{/if}
			</g>
		{/each}
	</g>
</svg>

<style>
	.graph {
		display: block;
		width: 100%;
		height: auto;
		cursor: grab;
		user-select: none;
	}
	.graph:active {
		cursor: grabbing;
	}
	.edges {
		opacity: 0.8;
	}
	.edges.dimmed {
		opacity: 0.2;
	}
	.node {
		cursor: pointer;
		outline: none;
	}
	.node.faded {
		opacity: 0.25;
	}
	.node-label {
		fill: var(--text);
		font-family: var(--font-sans);
		font-weight: 600;
		paint-order: stroke;
		stroke: var(--bg);
		stroke-width: 4px;
		stroke-linejoin: round;
		pointer-events: none;
	}
</style>
