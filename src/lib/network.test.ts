import { describe, expect, it } from 'vitest';
import { VIEW, entrySize, layoutGraph, usedTogether } from './network';
import type { Drawer, Entry, Project } from './types';

const drawers: Drawer[] = [{ id: 'ocr', number: 'II', label: 'OCR', blurb: '', subdrawers: [] }];
const entry = (id: string): Entry => ({
	id, type: 'tool', catalogueNumber: id, name: id, ai: false, website: null, releaseYear: 2020, description: '',
	facts: [], notes: [], drawers: ['ocr'], subdrawers: [], costBand: null, skillLevel: null, runsLocally: null,
	status: 'approved', lastUpdated: '2026-10-14'
});
const project = (id: string, kind: Project['kind'], used: string[], flags: string[] = []): Project => ({
	id, title: id, shortTitle: null, year: '2020', yearSort: 2020, who: null, kind, howUsed: null, url: null, flags, entries: used, status: 'approved'
});

const entries = ['a', 'b', 'c'].map(entry);
const projects = [
	project('p1', 'research', ['a']),
	project('p2', 'corpus_building', ['a', 'b']),
	project('p3', 'evaluation', ['a', 'b', 'c']),
	project('p4', 'corpus_building', ['c'], ['tried_and_rejected'])
];

describe('network layout', () => {
	it('gives the same picture for the same data', () => {
		const one = layoutGraph(entries, projects, drawers, true).nodes.map((n) => [n.key, n.x.toFixed(3), n.y.toFixed(3)]);
		const two = layoutGraph(entries, projects, drawers, true).nodes.map((n) => [n.key, n.x.toFixed(3), n.y.toFixed(3)]);
		expect(one).toEqual(two);
	});
	it('keeps every point inside the view', () => {
		for (const n of layoutGraph(entries, projects, drawers, true).nodes) {
			expect(n.x).toBeGreaterThanOrEqual(0);
			expect(n.x).toBeLessThanOrEqual(VIEW.width);
			expect(n.y).toBeGreaterThanOrEqual(0);
			expect(n.y).toBeLessThanOrEqual(VIEW.height);
		}
	});
	it('puts tools nearer the centre than projects', () => {
		const { nodes } = layoutGraph(entries, projects, drawers, true);
		const dist = (n: { x: number; y: number }) => Math.hypot((n.x - VIEW.width / 2) / 1.22, n.y - VIEW.height / 2);
		const tools = nodes.filter((n) => n.type !== 'project').map(dist);
		const projs = nodes.filter((n) => n.type === 'project').map(dist);
		expect(Math.max(...tools)).toBeLessThan(Math.min(...projs));
	});
	it('hiding benchmarks removes evaluation projects and their lines', () => {
		const { nodes, links } = layoutGraph(entries, projects, drawers, false);
		expect(nodes.some((n) => n.kind === 'evaluation')).toBe(false);
		expect(links.some((l) => l.kind === 'evaluation')).toBe(false);
		expect(links).toHaveLength(4);
	});
	it('sizes tools by research + corpus uses only', () => {
		const { nodes } = layoutGraph(entries, projects, drawers, true);
		const size = (id: string) => nodes.find((n) => n.key === `e:${id}`)!.size;
		expect(size('a')).toBe(entrySize(2));
		expect(size('b')).toBe(entrySize(1));
		expect(size('c')).toBe(entrySize(0)); // its only corpus project was tried and rejected
	});
});

describe('often used together', () => {
	it('counts pairs and notes how many come from evaluations', () => {
		expect(usedTogether(projects)).toEqual([
			{ a: 'a', b: 'b', n: 2, fromEvaluations: 1 },
			{ a: 'a', b: 'c', n: 1, fromEvaluations: 1 },
			{ a: 'b', b: 'c', n: 1, fromEvaluations: 1 }
		]);
	});
});

describe('scale', () => {
	it('lays out hundreds of points quickly and keeps them in view', () => {
		const many = Array.from({ length: 60 }, (_, i) => entry(`t${i}`));
		const kinds: Project['kind'][] = ['research', 'corpus_building', 'evaluation'];
		const lots = Array.from({ length: 500 }, (_, i) =>
			project(`q${i}`, kinds[i % 3], [`t${i % 60}`, `t${(i * 7) % 60}`])
		);
		const started = performance.now();
		const { nodes } = layoutGraph(many, lots, drawers, true);
		const ms = performance.now() - started;
		expect(nodes).toHaveLength(560);
		expect(ms).toBeLessThan(3000);
		for (const n of nodes) {
			expect(n.x).toBeGreaterThanOrEqual(0);
			expect(n.x).toBeLessThanOrEqual(VIEW.width);
		}
		console.log(`560 points laid out in ${Math.round(ms)} ms`);
	});
});
