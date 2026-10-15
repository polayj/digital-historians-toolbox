import { describe, expect, it } from 'vitest';
import { parseEntryForm, parseProjectForm } from './forms';

const fd = (fields: Record<string, string | string[]>) => {
	const f = new FormData();
	for (const [k, v] of Object.entries(fields)) for (const x of [v].flat()) f.append(k, x);
	return f;
};
const known = {
	drawerIds: new Set(['ai', 'ocr']),
	subdrawerIds: new Set(['htr', 'vlm']),
	catalogueNumbers: new Map([['013', 'kraken'], ['014', 'transkribus']])
};
const base = {
	name: 'Kraken',
	type: 'tool',
	catalogue_number: '013',
	description: 'Engine.',
	drawers: ['ai', 'ocr'],
	facts: JSON.stringify([{ k: 'Licence', v: 'Apache-2.0' }, { k: '', v: '' }]),
	notes: JSON.stringify([{ q: 'Where your sources go', a: 'Local.' }]),
	research: JSON.stringify([{ k: 'editor_flags', v: 'UNVERIFIED year' }])
};

describe('card edit form', () => {
	it('keeps a guide card once even when it is ticked under two drawers', () => {
		const { draft, errors } = parseEntryForm(fd({ ...base, subdrawers: ['htr', 'htr', 'vlm'] }), { id: 'kraken', submittedBy: null }, known);
		expect(errors).toEqual({});
		expect(draft.subdrawers).toEqual(['htr', 'vlm']);
	});
	it('drops empty fact rows and keeps research notes, UNVERIFIED markers included', () => {
		const { draft } = parseEntryForm(fd(base), { id: 'kraken', submittedBy: null }, known);
		expect(draft.facts).toEqual([{ k: 'Licence', v: 'Apache-2.0' }]);
		expect(draft.research).toEqual({ editor_flags: 'UNVERIFIED year' });
	});
	it('refuses a catalogue number another card already uses', () => {
		const { errors } = parseEntryForm(fd({ ...base, catalogue_number: '014' }), { id: 'kraken', submittedBy: null }, known);
		expect(errors.catalogue_number).toMatch(/already used/);
	});
	it('needs at least one drawer', () => {
		const { errors } = parseEntryForm(fd({ ...base, drawers: [] }), { id: 'kraken', submittedBy: null }, known);
		expect(errors.drawers).toBeTruthy();
	});
});

describe('project edit form', () => {
	it('keeps flags the form does not know about', () => {
		const { draft } = parseProjectForm(
			fd({ title: 'T', kind: 'research', flags: ['tried_and_rejected'], entries: ['kraken', 'kraken', 'nope'] }),
			{ id: 'p001', submittedBy: null, flags: ['some_future_flag'] },
			{ entryIds: new Set(['kraken']) }
		);
		expect(draft.flags).toEqual(['tried_and_rejected', 'some_future_flag']);
		expect(draft.entries).toEqual(['kraken']);
	});
});
