// What "File it", "Return with a note" and "Move back to the queue" do for each kind of queue item.
import { entryDraftFromSubmission, projectDraftFromSubmission } from '#lib/drafts.js';
import {
	allEntries,
	allProjects,
	createEntry,
	createProject,
	fileRecord,
	getSubmission,
	reopenRecord,
	returnRecord,
	setSubmissionStatus
} from './admin';

export function parseKey(key: string): { kind: 'entry' | 'project' | 'submission'; id: string } | null {
	const m = /^(entry|project|submission):(.+)$/.exec(key);
	return m ? { kind: m[1] as 'entry' | 'project' | 'submission', id: m[2] } : null;
}

/** Files a queue item as it stands. Returns the id of the live card/project, if one was made. */
export async function fileItem(key: string, editor: string): Promise<string | null> {
	const k = parseKey(key);
	if (!k) throw new Error('Unknown item');
	if (k.kind !== 'submission') {
		await fileRecord(k.kind, k.id, editor);
		return k.id;
	}
	const s = await getSubmission(Number(k.id));
	if (!s) throw new Error('No such submission');
	if (s.status === 'filed') return s.filedAs;
	if (s.type === 'correction') {
		await setSubmissionStatus(s.id, 'filed', 'Correction handled.', editor);
		return s.targetEntryId;
	}
	if (s.type === 'project') {
		const projects = await allProjects();
		const draft = projectDraftFromSubmission(s.payload, s.submitterName, projects.map((p) => p.id));
		await createProject(draft, editor, s.id);
		return draft.id;
	}
	const entries = await allEntries();
	const draft = entryDraftFromSubmission(s.type, s.payload, s.submitterName, {
		ids: new Set(entries.map((e) => e.id)),
		catalogueNumbers: entries.map((e) => e.catalogueNumber)
	});
	await createEntry(draft, editor, s.id);
	return draft.id;
}

export async function returnItem(key: string, note: string, editor: string) {
	const k = parseKey(key);
	if (!k) throw new Error('Unknown item');
	if (k.kind === 'submission') await setSubmissionStatus(Number(k.id), 'returned', note, editor);
	else await returnRecord(k.kind, k.id, note, editor);
}

export async function reopenItem(key: string, editor: string) {
	const k = parseKey(key);
	if (!k) throw new Error('Unknown item');
	if (k.kind === 'submission') await setSubmissionStatus(Number(k.id), 'pending', null, editor);
	else await reopenRecord(k.kind, k.id, editor);
}
