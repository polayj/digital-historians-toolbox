// "Edit, then file" for a public submission: the submission becomes a draft card or project
// that the editor can complete before it goes live.
import { error, fail, redirect } from '@sveltejs/kit';
import { entryDraftFromSubmission, projectDraftFromSubmission, slugFor, nextProjectId } from '#lib/drafts.js';
import { allEntries, allProjects, createEntry, createProject, getSubmission, taxonomy } from '#lib/server/admin.js';
import { KNOWN_FLAGS, parseEntryForm, parseProjectForm } from '#lib/server/forms.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const s = await getSubmission(Number(params.id));
	if (!s) error(404, 'No such submission');
	if (s.type === 'correction') redirect(303, `/admin/entries/${s.targetEntryId}?correction=${s.id}`);
	if (s.status === 'filed' && s.filedAs) redirect(303, s.type === 'project' ? `/admin/projects/${s.filedAs}` : `/admin/entries/${s.filedAs}`);

	const [entries, projects, tax] = await Promise.all([allEntries(), allProjects(), taxonomy()]);
	if (s.type === 'project') {
		return {
			submission: s,
			kind: 'project' as const,
			project: projectDraftFromSubmission(s.payload, s.submitterName, projects.map((p) => p.id)),
			entries: entries.map((e) => ({ id: e.id, name: e.name, status: e.status })).sort((a, b) => a.name.localeCompare(b.name)),
			flags: KNOWN_FLAGS
		};
	}
	return {
		submission: s,
		kind: 'entry' as const,
		entry: entryDraftFromSubmission(s.type, s.payload, s.submitterName, {
			ids: new Set(entries.map((e) => e.id)),
			catalogueNumbers: entries.map((e) => e.catalogueNumber)
		}),
		...tax
	};
};

export const actions: Actions = {
	file: async ({ request, params, locals }) => {
		const s = await getSubmission(Number(params.id));
		if (!s || s.type === 'correction') error(404, 'No such submission');
		if (s.status === 'filed') redirect(303, '/admin');
		const form = await request.formData();

		if (s.type === 'project') {
			const [entries, projects] = await Promise.all([allEntries(), allProjects()]);
			const id = nextProjectId(projects.map((p) => p.id));
			const { draft, errors } = parseProjectForm(form, { id, submittedBy: s.submitterName, flags: [] }, { entryIds: new Set(entries.map((e) => e.id)) });
			if (Object.keys(errors).length) return fail(400, { errors, message: 'Please fix the highlighted fields.' });
			await createProject(draft, locals.editor!, s.id);
		} else {
			const [entries, tax] = await Promise.all([allEntries(), taxonomy()]);
			const ids = new Set(entries.map((e) => e.id));
			const id = slugFor(String(form.get('name') ?? s.payload.name), ids);
			const { draft, errors } = parseEntryForm(form, { id, submittedBy: s.submitterName }, {
				drawerIds: new Set(tax.drawers.map((d) => d.id)),
				subdrawerIds: new Set(tax.subdrawers.map((x) => x.id)),
				catalogueNumbers: new Map(entries.map((e) => [e.catalogueNumber, e.id]))
			});
			if (Object.keys(errors).length) return fail(400, { errors, message: 'Please fix the highlighted fields.' });
			await createEntry(draft, locals.editor!, s.id);
		}
		redirect(303, '/admin?tab=filed');
	}
};
