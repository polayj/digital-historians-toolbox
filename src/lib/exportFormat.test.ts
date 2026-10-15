import { describe, expect, it } from 'vitest';
import { csvCell, entriesFile, guidesFile, linksFile, projectsFile, taxonomyFile } from './exportFormat';
import type { Entry, Project } from './types';

const entry: Entry & { research?: unknown } = {
	id: 'kraken',
	type: 'tool',
	catalogueNumber: '013',
	name: 'Kraken',
	ai: true,
	website: 'https://kraken.re',
	releaseYear: 2015,
	description: 'Engine.',
	facts: [{ k: 'Licence', v: 'Apache-2.0' }],
	notes: [{ q: 'Where your sources go', a: 'Fully local.' }],
	drawers: ['ai', 'ocr'],
	subdrawers: ['htr'],
	costBand: 'free',
	skillLevel: 'programming',
	runsLocally: true,
	status: 'approved',
	lastUpdated: '2026-10-14',
	submittedBy: null,
	research: { editor_flags: 'UNVERIFIED secret note' } // must never be exported
};

const project: Project & { editorNotes?: string } = {
	id: 'p003',
	title: 'BiblIA, "medieval" Hebrew, manuscripts',
	shortTitle: null,
	year: '2021',
	yearSort: 2021,
	who: 'Stökl Ben Ezra et al.',
	kind: 'corpus_building',
	howUsed: 'Transcribed.',
	url: 'https://zenodo.org/records/5167263',
	flags: [],
	entries: ['escriptorium', 'kraken'],
	status: 'approved',
	editorNotes: 'admin only' // must never be exported
};

describe('public data export', () => {
	it('keeps the seed shape for cards, without research notes', () => {
		const [e] = JSON.parse(entriesFile([entry]));
		expect(e).toMatchObject({ id: 'kraken', catalogue_number: '013', card: { description: 'Engine.' }, status: 'approved' });
		expect(Object.keys(e)).not.toContain('research');
		expect(entriesFile([entry])).not.toContain('UNVERIFIED');
	});

	it('keeps the seed shape for projects, without editor notes', () => {
		const [p] = JSON.parse(projectsFile([project]));
		expect(p).toMatchObject({ id: 'p003', kind: 'corpus_building', entries: ['escriptorium', 'kraken'] });
		expect(Object.keys(p)).not.toContain('editor_notes');
		expect(projectsFile([project])).not.toContain('admin only');
	});

	it('writes one link row per project–card pair, matching the projects file', () => {
		expect(linksFile([project])).toBe('project_id,entry_id,kind\np003,escriptorium,corpus_building\np003,kraken,corpus_building\n');
	});

	it('quotes CSV cells only when needed', () => {
		expect(csvCell('plain')).toBe('plain');
		expect(csvCell('a,b')).toBe('"a,b"');
		expect(csvCell('say "hi"')).toBe('"say ""hi"""');
	});

	it('writes guides and taxonomy', () => {
		expect(JSON.parse(guidesFile([{ entryId: 'kraken', title: 'T', url: 'https://x' }]))).toEqual([{ entry_id: 'kraken', title: 'T', url: 'https://x' }]);
		const tax = JSON.parse(taxonomyFile([{ id: 'ocr', number: 'II', label: 'OCR', blurb: 'b', subdrawers: [{ id: 'htr', label: 'HTR', blurb: null }] }]));
		expect(tax.drawers[0].subdrawers).toEqual([{ id: 'htr', label: 'HTR' }]);
		expect(Object.keys(tax.project_kinds)).toEqual(['research', 'corpus_building', 'evaluation']);
	});
});
