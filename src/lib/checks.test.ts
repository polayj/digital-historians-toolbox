import { describe, expect, it } from 'vitest';
import { describeLink, linkKey, missingNotes, possibleDuplicates, projectLinkProblems } from './checks';
import { diffFields, entryDraftFromSubmission, nextCatalogueNumber, nextProjectId, projectDraftFromSubmission, slugFor } from './drafts';

describe('possible duplicates', () => {
	const existing = [
		{ id: 'transkribus', name: 'Transkribus', url: 'https://www.transkribus.org/' },
		{ id: 'whg', name: 'World Historical Gazetteer', url: 'https://whgazetteer.org/' },
		{ id: 'qgis', name: 'QGIS', url: 'https://qgis.org' }
	];
	it('spots the same name written differently', () => {
		expect(possibleDuplicates({ name: 'transkribus ' }, existing)).toEqual(['Transkribus']);
		expect(possibleDuplicates({ name: 'Transkribus (READ-COOP)' }, existing)).toEqual(['Transkribus']);
	});
	it('spots the same website', () => {
		expect(possibleDuplicates({ name: 'Another name', url: 'http://transkribus.org' }, existing)).toEqual(['Transkribus']);
	});
	it('does not flag a record as a duplicate of itself, or short names inside longer ones', () => {
		expect(possibleDuplicates({ id: 'qgis', name: 'QGIS' }, existing)).toEqual([]);
		expect(possibleDuplicates({ name: 'GIS' }, existing)).toEqual([]);
	});
	it('compares DOIs whatever the address style', () => {
		expect(linkKey('https://doi.org/10.5334/JOHD.273')).toBe(linkKey('http://dx.doi.org/10.5334/johd.273'));
	});
});

describe('missing historian’s notes', () => {
	it('lists unanswered questions for AI tools only', () => {
		const notes = [
			{ q: 'Where your sources go', a: 'Local.' },
			{ q: 'How it’s been tested', a: '' },
			{ q: 'Known problems on historical sources', a: '' }
		];
		expect(missingNotes({ ai: true, type: 'tool', notes })).toEqual(['How it’s been tested', 'Known problems on historical sources']);
		expect(missingNotes({ ai: false, type: 'tool', notes })).toEqual([]);
	});
});

describe('project links', () => {
	const entries = new Map([
		['kraken', { name: 'Kraken', status: 'approved' }],
		['chandra', { name: 'Chandra', status: 'needs_review' }]
	]);
	it('flags projects with no linked cards, or cards not yet filed', () => {
		expect(projectLinkProblems([], entries).noEntries).toBe(true);
		expect(projectLinkProblems(['kraken', 'chandra'], entries).unfiled).toEqual(['Chandra']);
	});
});

describe('link results', () => {
	it('tells blocked checks apart from broken links', () => {
		expect(describeLink({ ok: 0, status: 403, note: null }).level).toBe('unsure');
		expect(describeLink({ ok: 0, status: 404, note: null }).level).toBe('bad');
		expect(describeLink({ ok: 1, status: 200, note: null }).level).toBe('ok');
		expect(describeLink(undefined).level).toBe('unknown');
	});
});

describe('drafts from submissions', () => {
	it('makes unique ids and catalogue numbers in the right range', () => {
		expect(slugFor('World Historical Gazetteer', new Set(['world-historical-gazetteer']))).toBe('world-historical-gazetteer-2');
		expect(nextCatalogueNumber('tool', ['012', '081', '101', '106'])).toBe('082');
		expect(nextCatalogueNumber('dataset', ['012', '101', '106'])).toBe('107');
		expect(nextProjectId(['p001', 'p075'])).toBe('p076');
	});
	it('turns an AI tool’s answers into historian’s notes', () => {
		const d = entryDraftFromSubmission(
			'tool',
			{ name: 'New OCR', url: 'https://x.org/', description: 'Reads.', drawers: ['ocr'], ai: true, dataHandling: 'local', evaluationUrl: '', knownProblems: 'Invents names.', projectsUsed: '' },
			'Ada',
			{ ids: new Set(), catalogueNumbers: ['012'] }
		);
		expect(d.notes.map((n) => n.a)).toEqual(['Stays on your own computer.', '', 'Invents names.']);
		expect(d.submittedBy).toBe('Ada');
		expect(d.catalogueNumber).toBe('013');
	});
	it('puts datasets in the Public Datasets drawer', () => {
		const d = entryDraftFromSubmission(
			'dataset',
			{ name: 'Letters', url: 'https://l.org/', description: 'Letters.', holder: 'An archive', howMade: 'Typed', gaps: '', terms: 'CC BY', projectsUsed: '' },
			null,
			{ ids: new Set(), catalogueNumbers: [] }
		);
		expect(d.drawers).toEqual(['data']);
		expect(d.facts).toEqual([{ k: 'Holder', v: 'An archive' }]);
	});
	it('keeps tools named outside the catalogue in the editor notes', () => {
		const p = projectDraftFromSubmission(
			{ title: 'T', url: 'https://t.org/', year: '2026', who: 'W', kind: 'research', entries: ['kraken'], howUsed: 'h', otherTools: 'NewTool' },
			'Ada',
			['p075']
		);
		expect(p.id).toBe('p076');
		expect(p.editorNotes).toContain('NewTool');
	});
});

describe('version history', () => {
	it('records only the fields that changed', () => {
		expect(diffFields({ name: 'A', facts: [{ k: 'x', v: '1' }] }, { name: 'A', facts: [{ k: 'x', v: '2' }] })).toEqual({
			facts: { from: [{ k: 'x', v: '1' }], to: [{ k: 'x', v: '2' }] }
		});
	});
});
