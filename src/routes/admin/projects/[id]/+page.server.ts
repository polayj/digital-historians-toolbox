import { error, fail, redirect } from '@sveltejs/kit';
import { allEntries, getProject, saveProject } from '#lib/server/admin.js';
import { KNOWN_FLAGS, parseProjectForm } from '#lib/server/forms.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const [project, entries] = await Promise.all([getProject(params.id), allEntries()]);
	if (!project) error(404, 'No such project');
	return {
		project,
		entries: entries.map((e) => ({ id: e.id, name: e.name, status: e.status })).sort((a, b) => a.name.localeCompare(b.name)),
		flags: KNOWN_FLAGS
	};
};

async function save(request: Request, id: string, editor: string, file: boolean) {
	const form = await request.formData();
	const [before, entries] = await Promise.all([getProject(id), allEntries()]);
	if (!before) error(404, 'No such project');
	const { draft, errors } = parseProjectForm(form, before, { entryIds: new Set(entries.map((e) => e.id)) });
	if (Object.keys(errors).length) return fail(400, { errors, message: 'Please fix the highlighted fields.' });
	const changed = await saveProject(draft, editor, { file });
	if (file) redirect(303, '/admin');
	return { message: changed.length ? `Saved. Changed: ${changed.join(', ')}.` : 'No changes to save.' };
}

export const actions: Actions = {
	save: ({ request, params, locals }) => save(request, params.id, locals.editor!, false),
	saveAndFile: ({ request, params, locals }) => save(request, params.id, locals.editor!, true)
};
