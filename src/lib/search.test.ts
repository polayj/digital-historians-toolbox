import { describe, expect, it } from 'vitest';
import { buildStats } from './ranking';
import { DEFAULT_FILTERS, normalise, search, terms, type Filters } from './search';
import type { Drawer, Entry, Project } from './types';

const drawers: Drawer[] = [
	{ id: 'ocr', number: 'II', label: 'OCR & Handwriting', blurb: '', subdrawers: [{ id: 'htr', label: 'Handwriting (HTR)', blurb: null }] },
	{ id: 'maps', number: 'VII', label: 'Mapping & GIS', blurb: '', subdrawers: [] }
];

const base = {
	website: null,
	releaseYear: 2020,
	facts: [],
	notes: [],
	status: 'approved' as const,
	lastUpdated: '2026-10-14'
};

const entries: Entry[] = [
	{ ...base, id: 'transkribus', type: 'tool', catalogueNumber: '014', name: 'Transkribus', ai: true, description: 'Upload scans and get transcriptions.', drawers: ['ocr'], subdrawers: ['htr'], costBand: 'freemium', skillLevel: 'no_code', runsLocally: false },
	{ ...base, id: 'kraken', type: 'tool', catalogueNumber: '013', name: 'Kraken', ai: true, description: 'Recognition engine.', drawers: ['ocr'], subdrawers: ['htr'], costBand: 'free', skillLevel: 'programming', runsLocally: true },
	{ ...base, id: 'qgis', type: 'tool', catalogueNumber: '070', name: 'QGIS', ai: false, description: 'Free desktop GIS for Montréal maps.', drawers: ['maps'], subdrawers: [], costBand: 'free', skillLevel: 'no_code', runsLocally: true },
	{ ...base, id: 'trove', type: 'dataset', catalogueNumber: '103', name: 'Trove newspapers', ai: false, description: 'Australian newspapers.', drawers: ['maps'], subdrawers: [], costBand: 'free', skillLevel: null, runsLocally: null }
];

const project = (id: string, title: string, used: string[], kind: Project['kind'] = 'research'): Project => ({
	id, title, shortTitle: null, year: '2020', yearSort: 2020, who: 'Someone', kind, howUsed: null, url: null, flags: [], entries: used, status: 'approved'
});
const projects: Project[] = [
	project('p1', 'VOC notarial deeds', ['transkribus'], 'corpus_building'),
	project('p2', 'Housing in Montreal', ['qgis']),
	project('p3', 'A benchmark', ['kraken', 'transkribus'], 'evaluation')
];

const cat = { entries, projects, drawers };
const stats = buildStats({ entries, projects, checkins: {}, currentYear: 2026 });
const ids = (q: string, f: Partial<Filters> = {}) =>
	search(cat, stats, q, { ...DEFAULT_FILTERS, ...f }).map((r) => (r.kind === 'entry' ? r.entry.id : r.project.id));

describe('text matching', () => {
	it('ignores capitals and accents', () => {
		expect(normalise('Montréal')).toBe('montreal');
		expect(ids('montreal')).toEqual(['qgis', 'p2']);
	});
	it('needs every word', () => {
		expect(terms('Free  GIS!')).toEqual(['free', 'gis']);
		expect(ids('free gis')).toEqual(['qgis']);
	});
	it('finds entries by their guide-card label', () => {
		expect(ids('handwriting')).toEqual(['transkribus', 'kraken', 'p1', 'p3']);
	});
	it('does not match every card in a drawer through a combined drawer name', () => {
		expect(ids('ocr')).toEqual([]); // "OCR & Handwriting" has guide cards, so its name is not used
	});
	it('uses the drawer name when the drawer has no guide cards', () => {
		const noTabs = { ...cat, drawers: [{ ...drawers[1], subdrawers: [] }, drawers[0]] };
		expect(search(noTabs, stats, 'mapping', DEFAULT_FILTERS).map((r) => (r.kind === 'entry' ? r.entry.id : r.project.id))).toEqual(['qgis', 'trove', 'p2']);
	});
	it('scores a word for every place it appears', () => {
		const scores = search(cat, stats, 'transkribus', DEFAULT_FILTERS).map((r) => r.score);
		expect(scores[0]).toBeGreaterThan(scores[1]); // the card itself outranks projects that used it
	});
	it('finds projects by the tools they used', () => {
		expect(ids('transkribus')).toEqual(['transkribus', 'p1', 'p3']);
	});
	it('an empty search lists everything', () => {
		expect(ids('')).toHaveLength(entries.length + projects.length);
	});
});

describe('filters', () => {
	it('type checkboxes hide whole types', () => {
		expect(ids('', { types: ['dataset'] })).toEqual(['trove']);
	});
	it('options within a group widen, groups narrow', () => {
		expect(ids('', { types: ['tool'], cost: ['free', 'freemium'] })).toEqual(['transkribus', 'kraken', 'qgis']);
		expect(ids('', { types: ['tool'], cost: ['free'], skill: ['no_code'] })).toEqual(['qgis']);
	});
	it('runs locally and has a published evaluation', () => {
		expect(ids('', { types: ['tool'], runsLocally: true })).toEqual(['kraken', 'qgis']);
		expect(ids('', { types: ['tool'], evaluated: true })).toEqual(['transkribus', 'kraken']);
	});
	it('projects match tool filters through the tools they used', () => {
		expect(ids('', { types: ['project'], aiOnly: true })).toEqual(['p1', 'p3']);
	});
	it('project kind', () => {
		expect(ids('', { types: ['project'], kinds: ['research', 'corpus_building'] })).toEqual(['p1', 'p2']);
	});
	it('datasets have no skill level, so a skill filter leaves them out', () => {
		expect(ids('', { types: ['dataset'], skill: ['no_code'] })).toEqual([]);
	});
});
