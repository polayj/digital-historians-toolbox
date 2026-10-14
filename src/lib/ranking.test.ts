import { describe, expect, it } from 'vitest';
import { buildStats, comparator, countsAsUse, inWindow, topTrending } from './ranking';
import type { Entry, Project, ProjectKind } from './types';

const entry = (id: string, releaseYear: number | null = 2020): Entry => ({
	id,
	type: 'tool',
	catalogueNumber: id,
	name: id,
	ai: false,
	website: null,
	releaseYear,
	description: '',
	facts: [],
	notes: [],
	drawers: [],
	subdrawers: [],
	costBand: null,
	skillLevel: null,
	runsLocally: null,
	status: 'approved',
	lastUpdated: '2026-10-14'
});

let n = 0;
const project = (entries: string[], kind: ProjectKind, year: string | null, flags: string[] = []): Project => {
	const all = year?.match(/\d{4}/g);
	return {
		id: `p${++n}`,
		title: `Project ${n}`,
		shortTitle: null,
		year,
		yearSort: all ? Number(all[all.length - 1]) : null,
		who: null,
		kind,
		howUsed: null,
		url: null,
		flags,
		entries,
		status: 'approved'
	};
};

describe('what counts as a use', () => {
	it('counts research and corpus building', () => {
		expect(countsAsUse(project(['a'], 'research', '2020'))).toBe(true);
		expect(countsAsUse(project(['a'], 'corpus_building', '2020'))).toBe(true);
	});
	it('never counts evaluations', () => {
		expect(countsAsUse(project(['a'], 'evaluation', '2020'))).toBe(false);
	});
	it('never counts a project flagged tried and rejected', () => {
		expect(countsAsUse(project(['a'], 'corpus_building', '2026', ['tried_and_rejected']))).toBe(false);
	});
	it('still counts other flags, such as the editor’s own paper', () => {
		expect(countsAsUse(project(['a'], 'research', '2026', ['editor_conflict_of_interest']))).toBe(true);
	});
});

describe('trending windows', () => {
	it('"past 1 year" is the current calendar year only', () => {
		expect(inWindow(2026, 1, 2026)).toBe(true);
		expect(inWindow(2025, 1, 2026)).toBe(false);
	});
	it('"past 2 years" covers this year and last', () => {
		expect(inWindow(2025, 2, 2026)).toBe(true);
		expect(inWindow(2024, 2, 2026)).toBe(false);
	});
	it('ignores undated projects', () => {
		expect(inWindow(null, 20, 2026)).toBe(false);
	});
});

describe('scores', () => {
	const entries = [entry('a'), entry('b'), entry('c')];
	const projects = [
		project(['a'], 'research', '2026'),
		project(['a'], 'corpus_building', 'c. 2011'),
		project(['a'], 'evaluation', '2026'),
		project(['b'], 'evaluation', '2026'),
		project(['b'], 'evaluation', '2025'),
		project(['b'], 'evaluation', '2026'),
		project(['c'], 'corpus_building', '2026', ['tried_and_rejected']),
		project(['c'], 'research', 'n.d.'),
		project(['c'], 'research', '2017–2025')
	];
	const stats = buildStats({ entries, projects, checkins: { b: { 2026: 2, 2010: 5 } }, currentYear: 2026 });

	it('most used counts all-time research and corpus uses', () => {
		expect(stats.get('a')!.uses).toBe(2);
		expect(stats.get('b')!.uses).toBe(0);
		expect(stats.get('c')!.uses).toBe(2); // the rejected project is left out
	});
	it('trending counts only uses inside the window', () => {
		expect(stats.get('a')!.trend(2)).toBe(1);
		expect(stats.get('a')!.trend(20)).toBe(2);
	});
	it('a burst of benchmarks does not make a tool trend', () => {
		expect(stats.get('b')!.trend(2) - 2).toBe(0); // only its 2 check-ins count
	});
	it('adds check-ins inside the window, and only those', () => {
		expect(stats.get('b')!.trend(2)).toBe(2);
		expect(stats.get('b')!.trend(20)).toBe(7);
	});
	it('uses the last year of a range', () => {
		expect(stats.get('c')!.trend(2)).toBe(1); // '2017–2025' counts as 2025
	});
	it('keeps every linked project on the card, rejected and evaluations included', () => {
		expect(stats.get('c')!.corpus).toHaveLength(1);
		expect(stats.get('b')!.tested).toHaveLength(3);
	});
	it('sorts trending by score, then most used, then name', () => {
		const order = entries.slice().sort(comparator('trending', 2, stats)).map((e) => e.id);
		expect(order).toEqual(['b', 'a', 'c']); // b: 2, a: 1 (2 uses), c: 1 (2 uses) -> a before c by name
	});
	it('the Trending strip leaves out entries with no score', () => {
		const strip = topTrending(entries, stats, 1);
		expect(strip.map((s) => s.entry.id)).toEqual(['b', 'a']);
	});
});

describe('other sorts', () => {
	const entries = [entry('Zotero', 2006), entry('alpha', null), entry('Beta', 2025)];
	const stats = buildStats({ entries, projects: [], checkins: {}, currentYear: 2026 });
	it('A–Z ignores capitalisation', () => {
		expect(entries.slice().sort(comparator('az', 2, stats)).map((e) => e.name)).toEqual(['alpha', 'Beta', 'Zotero']);
	});
	it('Newest puts undated releases last', () => {
		expect(entries.slice().sort(comparator('new', 2, stats)).map((e) => e.name)).toEqual(['Beta', 'Zotero', 'alpha']);
	});
});
