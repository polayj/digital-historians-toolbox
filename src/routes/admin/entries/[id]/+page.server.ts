import { error, fail, redirect } from '@sveltejs/kit';
import { allEntries, getEntry, getSubmission, saveEntry, setSubmissionStatus, taxonomy } from '#lib/server/admin.js';
import { parseEntryForm } from '#lib/server/forms.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const entry = await getEntry(params.id);
	if (!entry) error(404, 'No such card');
	const correctionId = Number(url.searchParams.get('correction'));
	const correction = correctionId ? await getSubmission(correctionId) : null;
	return {
		entry,
		...(await taxonomy()),
		correction: correction && correction.type === 'correction' && correction.targetEntryId === entry.id ? correction : null
	};
};

async function save(request: Request, id: string, editor: string, { file = false, correctionId = 0 } = {}) {
	const form = await request.formData();
	const [before, tax, entries] = await Promise.all([getEntry(id), taxonomy(), allEntries()]);
	if (!before) error(404, 'No such card');
	const { draft, errors } = parseEntryForm(form, before, {
		drawerIds: new Set(tax.drawers.map((d) => d.id)),
		subdrawerIds: new Set(tax.subdrawers.map((s) => s.id)),
		catalogueNumbers: new Map(entries.map((e) => [e.catalogueNumber, e.id]))
	});
	if (Object.keys(errors).length) return fail(400, { errors, message: 'Please fix the highlighted fields.' });
	const changed = await saveEntry(draft, editor, { file });
	if (correctionId) await setSubmissionStatus(correctionId, 'filed', 'Correction applied.', editor);
	if (file || correctionId) redirect(303, '/admin');
	return { message: changed.length ? `Saved. Changed: ${changed.join(', ')}.` : 'No changes to save.' };
}

export const actions: Actions = {
	save: ({ request, params, locals }) => save(request, params.id, locals.editor!),
	saveAndFile: ({ request, params, locals }) => save(request, params.id, locals.editor!, { file: true }),
	saveCorrection: async ({ request, params, locals, url }) =>
		save(request, params.id, locals.editor!, { correctionId: Number(url.searchParams.get('correction')) })
};
