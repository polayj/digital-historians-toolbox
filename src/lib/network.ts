// Layout for the "Who used what" network graph.
//
// Tools and datasets sit on an inner ring, grouped by drawer; projects sit on an outer ring,
// pulled towards the tools they used. Positions come from a d3-force simulation that is run
// to completion before anything is drawn, so the picture is still (no animation) and the
// same data always gives the same layout.
import { forceCollide, forceLink, forceManyBody, forceRadial, forceSimulation, type SimulationNodeDatum } from 'd3-force';
import { countsAsUse } from './ranking';
import type { Drawer, Entry, Project, ProjectKind } from './types';

export const VIEW = { width: 1000, height: 820 };
const CX = VIEW.width / 2;
const CY = VIEW.height / 2;
const INNER = 215; // radius of the tools ring
const OUTER = 350; // radius of the projects ring
const STRETCH_X = 1.22; // the view is wider than tall, so spread the rings sideways afterwards

export interface GraphNode {
	key: string; // 'e:<entry id>' or 'p:<project id>'
	type: 'tool' | 'dataset' | 'project';
	id: string;
	label: string;
	x: number;
	y: number;
	size: number; // radius-like size in view units
	kind?: ProjectKind;
	/** Above the centre, labels go above the shape so they point outwards. */
	labelAbove?: boolean;
}

export interface GraphLink {
	source: string; // node key of the project
	target: string; // node key of the entry
	kind: ProjectKind;
}

interface SimNode extends SimulationNodeDatum {
	key: string;
	ring: number;
	r: number;
}

/** Size of a tool or dataset: grows with research + corpus-building uses (square root, so big tools don't swamp). */
export const entrySize = (uses: number) => 7 + 3.2 * Math.sqrt(uses);
const PROJECT_SIZE = 6.5;
const EVAL_SIZE = 5;

export function layoutGraph(entries: Entry[], projects: Project[], drawers: Drawer[], showEvaluations: boolean) {
	const shown = projects.filter((p) => (showEvaluations || p.kind !== 'evaluation') && p.entries.length > 0);
	const drawerOrder = new Map(drawers.map((d, i) => [d.id, i]));

	const uses = new Map<string, number>();
	for (const p of projects) if (countsAsUse(p)) for (const id of p.entries) uses.set(id, (uses.get(id) ?? 0) + 1);

	// Inner ring: entries grouped by their first drawer so related tools sit together.
	const ordered = entries
		.slice()
		.sort(
			(a, b) =>
				(drawerOrder.get(a.drawers[0]) ?? 99) - (drawerOrder.get(b.drawers[0]) ?? 99) ||
				a.catalogueNumber.localeCompare(b.catalogueNumber)
		);
	const angle = new Map<string, number>();
	ordered.forEach((e, i) => angle.set(e.id, -Math.PI / 2 + (i / Math.max(ordered.length, 1)) * Math.PI * 2));

	const sim: SimNode[] = [];
	for (const e of ordered) {
		const a = angle.get(e.id)!;
		sim.push({ key: `e:${e.id}`, ring: INNER, r: entrySize(uses.get(e.id) ?? 0), x: CX + Math.cos(a) * INNER, y: CY + Math.sin(a) * INNER });
	}
	for (const p of shown) {
		// Start each project at the average direction of the tools it used.
		let sx = 0;
		let sy = 0;
		for (const id of p.entries) {
			const a = angle.get(id) ?? 0;
			sx += Math.cos(a);
			sy += Math.sin(a);
		}
		const a = Math.atan2(sy, sx);
		const r = p.kind === 'evaluation' ? EVAL_SIZE : PROJECT_SIZE;
		sim.push({ key: `p:${p.id}`, ring: OUTER, r, x: CX + Math.cos(a) * OUTER, y: CY + Math.sin(a) * OUTER });
	}

	const links: GraphLink[] = shown.flatMap((p) =>
		p.entries.filter((id) => angle.has(id)).map((id) => ({ source: `p:${p.id}`, target: `e:${id}`, kind: p.kind }))
	);

	forceSimulation(sim)
		.force('ring', forceRadial<SimNode>((d) => d.ring, CX, CY).strength(0.9))
		.force(
			'link',
			forceLink<SimNode, { source: string; target: string }>(links.map((l) => ({ source: l.source, target: l.target })))
				.id((d) => d.key)
				.distance(OUTER - INNER)
				.strength(0.04)
		)
		.force('charge', forceManyBody<SimNode>().strength(-18).distanceMax(120))
		.force('collide', forceCollide<SimNode>((d) => d.r + 5).strength(0.9))
		.stop()
		.tick(320);

	const byKey = new Map(sim.map((n) => [n.key, n]));
	const place = (key: string) => {
		const n = byKey.get(key)!;
		const x = CX + (n.x! - CX) * STRETCH_X;
		return { x: Math.min(VIEW.width - 20, Math.max(20, x)), y: Math.min(VIEW.height - 20, Math.max(20, n.y!)) };
	};

	const nodes: GraphNode[] = [
		...ordered.map((e) => {
			const { x, y } = place(`e:${e.id}`);
			return {
				key: `e:${e.id}`,
				type: e.type,
				id: e.id,
				label: e.name,
				x,
				y,
				size: byKey.get(`e:${e.id}`)!.r,
				labelAbove: y < CY - 40
			} satisfies GraphNode;
		}),
		...shown.map((p) => {
			const { x, y } = place(`p:${p.id}`);
			return {
				key: `p:${p.id}`,
				type: 'project' as const,
				id: p.id,
				label: p.shortTitle ?? p.title,
				x,
				y,
				size: byKey.get(`p:${p.id}`)!.r,
				kind: p.kind
			} satisfies GraphNode;
		})
	];

	return { nodes, links, shownProjects: shown };
}

/** Pairs of tools/datasets used in the same project, most frequent first. */
export function usedTogether(projects: Project[], limit = 5) {
	const counts = new Map<string, { a: string; b: string; n: number; fromEvaluations: number }>();
	for (const p of projects) {
		const ids = [...new Set(p.entries)].sort();
		for (let i = 0; i < ids.length; i++)
			for (let j = i + 1; j < ids.length; j++) {
				const k = `${ids[i]}|${ids[j]}`;
				const c = counts.get(k) ?? { a: ids[i], b: ids[j], n: 0, fromEvaluations: 0 };
				c.n++;
				if (p.kind === 'evaluation') c.fromEvaluations++;
				counts.set(k, c);
			}
	}
	return [...counts.values()].sort((x, y) => y.n - x.n || x.a.localeCompare(y.a) || x.b.localeCompare(y.b)).slice(0, limit);
}
