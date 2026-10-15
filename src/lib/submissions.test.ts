import { describe, expect, it } from 'vitest';
import { normaliseUrl, validateSubmission, type ProjectPayload, type ToolPayload } from './submissions';

const known = { entryIds: new Set(['transkribus', 'kraken']), drawerIds: new Set(['ocr', 'ai']) };
const form = (fields: Record<string, string | string[]>) => {
	const fd = new FormData();
	for (const [k, v] of Object.entries(fields)) for (const x of [v].flat()) fd.append(k, x);
	return fd;
};
const contact = { submitter_name: 'Ada', submitter_email: 'ada@example.org' };

describe('links', () => {
	it('accepts addresses with or without https://, and bare DOIs', () => {
		expect(normaliseUrl('example.org/tool')).toBe('https://example.org/tool');
		expect(normaliseUrl('10.5334/johd.273')).toBe('https://doi.org/10.5334/johd.273');
		expect(normaliseUrl('doi: 10.1075/btl.172.10iva')).toBe('https://doi.org/10.1075/btl.172.10iva');
	});
	it('keeps complete addresses exactly as written', () => {
		expect(normaliseUrl('https://kraken.re')).toBe('https://kraken.re');
		expect(normaliseUrl(' https://example.org/a/ ')).toBe('https://example.org/a/');
	});
	it('rejects things that are not web links', () => {
		expect(normaliseUrl('javascript:alert(1)')).toBeNull();
		expect(normaliseUrl('not a link')).toBeNull();
	});
});

describe('tool submissions', () => {
	it('accepts a complete AI tool', () => {
		const r = validateSubmission(
			form({ type: 'tool', name: 'NewOCR', url: 'newocr.org', description: 'Reads pages.', drawers: ['ocr', 'nope'], ai: 'on', data_handling: 'local', known_problems: 'Invents names.', ...contact }),
			known
		);
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		const p = r.submission.payload as ToolPayload;
		expect(p.url).toBe('https://newocr.org');
		expect(p.drawers).toEqual(['ocr']); // unknown drawers are dropped
		expect(p.ai).toBe(true);
		expect(r.submission.submitterEmail).toBe('ada@example.org');
	});
	it('ignores AI answers when the AI box is not ticked', () => {
		const r = validateSubmission(form({ type: 'tool', name: 'X', url: 'x.org', description: 'd', data_handling: 'local', known_problems: 'p', ...contact }), known);
		expect(r.ok && (r.submission.payload as ToolPayload).knownProblems).toBe('');
	});
	it('lists every missing field', () => {
		const r = validateSubmission(form({ type: 'tool', submitter_email: 'not-an-email' }), known);
		expect(r.ok).toBe(false);
		if (r.ok) return;
		expect(Object.keys(r.errors).sort()).toEqual(['description', 'name', 'submitter_email', 'url']);
	});
	it('limits length', () => {
		const r = validateSubmission(form({ type: 'tool', name: 'x'.repeat(201), url: 'x.org', description: 'd', ...contact }), known);
		expect(!r.ok && r.errors.name).toMatch(/under 200/);
	});
});

describe('project submissions', () => {
	it('links only to real catalogue entries', () => {
		const r = validateSubmission(
			form({ type: 'project', name: 'My thesis', url: '10.1000/xyz', kind: 'research', entries: ['kraken', 'made-up'], how_used: 'Transcribed letters.', ...contact }),
			known
		);
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect((r.submission.payload as ProjectPayload).entries).toEqual(['kraken']);
		expect(r.submission.targetEntryId).toBe('kraken');
	});
	it('needs a kind and at least one tool', () => {
		const r = validateSubmission(form({ type: 'project', name: 'T', url: 'x.org', how_used: 'h', ...contact }), known);
		expect(!r.ok && Object.keys(r.errors).sort()).toEqual(['entries', 'kind']);
	});
	it('accepts a tool that is not in the catalogue yet, named in words', () => {
		const r = validateSubmission(form({ type: 'project', name: 'T', url: 'x.org', kind: 'evaluation', how_used: 'h', other_tools: 'SomeNewTool', ...contact }), known);
		expect(r.ok).toBe(true);
	});
});

describe('corrections', () => {
	it('must point at a real card', () => {
		const bad = validateSubmission(form({ type: 'correction', entry_id: 'nope', problem: 'Price changed.', ...contact }), known);
		expect(!bad.ok && bad.errors.entry_id).toBeTruthy();
		const good = validateSubmission(form({ type: 'correction', entry_id: 'transkribus', problem: 'Price changed.', ...contact }), known);
		expect(good.ok && good.submission.targetEntryId).toBe('transkribus');
	});
});

it('rejects an unknown type', () => {
	expect(validateSubmission(form({ type: 'spam' }), known).ok).toBe(false);
});
