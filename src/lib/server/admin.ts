// Database work for the editor's desk: reading full records (including admin-only fields),
// filing, returning, editing and creating cards. Every change writes a version-history record.
import { env } from 'cloudflare:workers';
import { diffFields, type EntryDraft, type ProjectDraft } from '#lib/drafts.js';
import type { Fact, Note, ProjectKind, Status } from '#lib/types.js';

export type RecordKind = 'entry' | 'project';

export interface EntryRecord extends EntryDraft {
	status: Status;
	reviewNote: string | null;
	source: 'seed' | 'submission';
	lastUpdated: string;
	researched: string | null;
}

export interface ProjectRecord extends ProjectDraft {
	status: Status;
	reviewNote: string | null;
	source: 'seed' | 'submission';
	lastUpdated: string;
}

const today = () => new Date().toISOString().slice(0, 10);
const json = <T>(text: string | null, fallback: T): T => {
	try {
		return text ? (JSON.parse(text) as T) : fallback;
	} catch {
		return fallback;
	}
};

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

function entryFromRow(r: any, drawers: string[], subdrawers: string[]): EntryRecord {
	return {
		id: r.id,
		type: r.type,
		catalogueNumber: r.catalogue_number,
		name: r.name,
		ai: r.ai === 1,
		website: r.website,
		releaseYear: r.release_year,
		description: r.description,
		facts: json<Fact[]>(r.facts, []),
		notes: json<Note[]>(r.notes, []),
		research: json<Record<string, string>>(r.research, {}),
		drawers,
		subdrawers,
		costBand: r.cost_band,
		skillLevel: r.skill_level,
		runsLocally: r.runs_locally === null ? null : r.runs_locally === 1,
		submittedBy: r.submitted_by,
		status: r.status,
		reviewNote: r.review_note,
		source: r.source,
		lastUpdated: r.last_updated,
		researched: r.researched
	};
}

function projectFromRow(r: any, entries: string[]): ProjectRecord {
	return {
		id: r.id,
		title: r.title,
		shortTitle: r.short_title,
		year: r.year,
		who: r.who,
		kind: r.kind,
		howUsed: r.how_used,
		url: r.url,
		flags: json<string[]>(r.flags, []),
		editorNotes: r.editor_notes ?? '',
		verified: r.verified,
		entries,
		submittedBy: r.submitted_by,
		status: r.status,
		reviewNote: r.review_note,
		source: r.source,
		lastUpdated: r.last_updated
	};
}

const group = (rows: any[], key: string, value: string) => {
	const map = new Map<string, string[]>();
	for (const r of rows) map.set(r[key], [...(map.get(r[key]) ?? []), r[value]]);
	return map;
};

export async function allEntries(): Promise<EntryRecord[]> {
	const [rows, drawers, subs] = await env.DB.batch([
		env.DB.prepare('SELECT * FROM entries ORDER BY catalogue_number'),
		env.DB.prepare('SELECT entry_id, drawer_id FROM entry_drawers ORDER BY entry_id, position'),
		env.DB.prepare('SELECT entry_id, subdrawer_id FROM entry_subdrawers ORDER BY entry_id, position')
	]);
	const d = group(drawers.results, 'entry_id', 'drawer_id');
	const s = group(subs.results, 'entry_id', 'subdrawer_id');
	return rows.results.map((r: any) => entryFromRow(r, d.get(r.id) ?? [], s.get(r.id) ?? []));
}

export async function allProjects(): Promise<ProjectRecord[]> {
	const [rows, links] = await env.DB.batch([
		env.DB.prepare('SELECT * FROM projects ORDER BY id'),
		env.DB.prepare('SELECT project_id, entry_id FROM project_entries')
	]);
	const l = group(links.results, 'project_id', 'entry_id');
	return rows.results.map((r: any) => projectFromRow(r, l.get(r.id) ?? []));
}

export async function getEntry(id: string): Promise<EntryRecord | null> {
	const [row, drawers, subs] = await env.DB.batch([
		env.DB.prepare('SELECT * FROM entries WHERE id = ?').bind(id),
		env.DB.prepare('SELECT drawer_id FROM entry_drawers WHERE entry_id = ? ORDER BY position').bind(id),
		env.DB.prepare('SELECT subdrawer_id FROM entry_subdrawers WHERE entry_id = ? ORDER BY position').bind(id)
	]);
	const r = row.results[0];
	if (!r) return null;
	return entryFromRow(
		r,
		drawers.results.map((x: any) => x.drawer_id),
		subs.results.map((x: any) => x.subdrawer_id)
	);
}

export async function getProject(id: string): Promise<ProjectRecord | null> {
	const [row, links] = await env.DB.batch([
		env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(id),
		env.DB.prepare('SELECT entry_id FROM project_entries WHERE project_id = ?').bind(id)
	]);
	const r = row.results[0];
	return r ? projectFromRow(r, links.results.map((x: any) => x.entry_id)) : null;
}

export async function taxonomy() {
	const [drawers, subs] = await env.DB.batch([
		env.DB.prepare('SELECT id, number, label FROM drawers ORDER BY position'),
		env.DB.prepare('SELECT drawer_id, id, label FROM subdrawers ORDER BY drawer_id, position')
	]);
	return {
		drawers: drawers.results as { id: string; number: string; label: string }[],
		subdrawers: subs.results as { drawer_id: string; id: string; label: string }[]
	};
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

const history = (type: RecordKind, id: string, action: string, editor: string, changes: object = {}, note: string | null = null) =>
	env.DB.prepare('INSERT INTO edit_history (entity_type, entity_id, action, changes, editor, note) VALUES (?, ?, ?, ?, ?, ?)').bind(
		type,
		id,
		action,
		JSON.stringify(changes),
		editor,
		note
	);

/** The fields an editor can change, in a form that can be compared for the history. */
const entryFields = (e: EntryDraft) => ({
	name: e.name,
	type: e.type,
	catalogueNumber: e.catalogueNumber,
	ai: e.ai,
	website: e.website,
	releaseYear: e.releaseYear,
	description: e.description,
	facts: e.facts,
	notes: e.notes,
	research: e.research,
	drawers: e.drawers,
	subdrawers: e.subdrawers,
	costBand: e.costBand,
	skillLevel: e.skillLevel,
	runsLocally: e.runsLocally
});

const projectFields = (p: ProjectDraft) => ({
	title: p.title,
	shortTitle: p.shortTitle,
	year: p.year,
	who: p.who,
	kind: p.kind,
	howUsed: p.howUsed,
	url: p.url,
	flags: p.flags,
	editorNotes: p.editorNotes,
	verified: p.verified,
	entries: p.entries
});

/** Last 4-digit year in a year string, for trending. */
const yearSort = (year: string | null) => {
	const all = (year ?? '').match(/\d{4}/g);
	return all ? Number(all[all.length - 1]) : null;
};

function entryStatements(e: EntryDraft) {
	return [
		env.DB.prepare(
			`UPDATE entries SET type = ?, catalogue_number = ?, name = ?, ai = ?, website = ?, release_year = ?, description = ?,
			 facts = ?, notes = ?, research = ?, cost_band = ?, skill_level = ?, runs_locally = ?, last_updated = ? WHERE id = ?`
		).bind(
			e.type,
			e.catalogueNumber,
			e.name,
			e.ai ? 1 : 0,
			e.website,
			e.releaseYear,
			e.description,
			JSON.stringify(e.facts),
			JSON.stringify(e.notes),
			JSON.stringify(e.research),
			e.costBand,
			e.skillLevel,
			e.runsLocally === null ? null : e.runsLocally ? 1 : 0,
			today(),
			e.id
		),
		env.DB.prepare('DELETE FROM entry_drawers WHERE entry_id = ?').bind(e.id),
		...e.drawers.map((d, i) => env.DB.prepare('INSERT INTO entry_drawers (entry_id, drawer_id, position) VALUES (?, ?, ?)').bind(e.id, d, i)),
		env.DB.prepare('DELETE FROM entry_subdrawers WHERE entry_id = ?').bind(e.id),
		...e.subdrawers.map((s, i) =>
			env.DB.prepare('INSERT INTO entry_subdrawers (entry_id, subdrawer_id, position) VALUES (?, ?, ?)').bind(e.id, s, i)
		)
	];
}

function projectStatements(p: ProjectDraft) {
	return [
		env.DB.prepare(
			`UPDATE projects SET title = ?, short_title = ?, year = ?, year_sort = ?, who = ?, kind = ?, how_used = ?, url = ?,
			 flags = ?, editor_notes = ?, verified = ?, last_updated = ? WHERE id = ?`
		).bind(
			p.title,
			p.shortTitle,
			p.year,
			yearSort(p.year),
			p.who,
			p.kind,
			p.howUsed,
			p.url,
			JSON.stringify(p.flags),
			p.editorNotes,
			p.verified,
			today(),
			p.id
		),
		env.DB.prepare('DELETE FROM project_entries WHERE project_id = ?').bind(p.id),
		...p.entries.map((id) => env.DB.prepare('INSERT INTO project_entries (project_id, entry_id) VALUES (?, ?)').bind(p.id, id))
	];
}

/** Saves an editor's changes to an existing card; with `file`, also files it. */
export async function saveEntry(e: EntryDraft, editor: string, { file = false } = {}) {
	const before = await getEntry(e.id);
	if (!before) throw new Error('No such card');
	const changes = diffFields(entryFields(before), entryFields(e));
	const statements = [];
	if (Object.keys(changes).length) {
		statements.push(...entryStatements(e), history('entry', e.id, 'edited', editor, changes));
	}
	if (file) statements.push(...fileStatements('entry', e.id, editor));
	if (statements.length) await env.DB.batch(statements);
	return Object.keys(changes);
}

export async function saveProject(p: ProjectDraft, editor: string, { file = false } = {}) {
	const before = await getProject(p.id);
	if (!before) throw new Error('No such project');
	const changes = diffFields(projectFields(before), projectFields(p));
	const statements = [];
	if (Object.keys(changes).length) {
		statements.push(...projectStatements(p), history('project', p.id, 'edited', editor, changes));
	}
	if (file) statements.push(...fileStatements('project', p.id, editor));
	if (statements.length) await env.DB.batch(statements);
	return Object.keys(changes);
}

function fileStatements(kind: RecordKind, id: string, editor: string) {
	const table = kind === 'entry' ? 'entries' : 'projects';
	return [
		env.DB.prepare(`UPDATE ${table} SET status = 'approved', review_note = NULL, last_updated = ? WHERE id = ?`).bind(today(), id),
		...(kind === 'entry'
			? [env.DB.prepare("UPDATE guides SET status = 'approved' WHERE entry_id = ? AND status = 'needs_review'").bind(id)]
			: []),
		history(kind, id, 'filed', editor)
	];
}

/** Files a card or project: it goes live (on the public site) and its "last updated" date is reset. */
export async function fileRecord(kind: RecordKind, id: string, editor: string) {
	await env.DB.batch(fileStatements(kind, id, editor));
}

/** Sends a card or project back with a note. It disappears from the public site until filed. */
export async function returnRecord(kind: RecordKind, id: string, note: string, editor: string) {
	const table = kind === 'entry' ? 'entries' : 'projects';
	await env.DB.batch([
		env.DB.prepare(`UPDATE ${table} SET status = 'returned', review_note = ? WHERE id = ?`).bind(note, id),
		history(kind, id, 'returned', editor, {}, note)
	]);
}

/** Moves a returned or filed record back to the queue. */
export async function reopenRecord(kind: RecordKind, id: string, editor: string) {
	const table = kind === 'entry' ? 'entries' : 'projects';
	await env.DB.batch([
		env.DB.prepare(`UPDATE ${table} SET status = 'needs_review', review_note = NULL WHERE id = ?`).bind(id),
		history(kind, id, 'edited', editor, { status: { from: 'filed or returned', to: 'needs_review' } }, 'Moved back to the review queue.')
	]);
}

/** Creates a card from a submission and files it straight away. */
export async function createEntry(e: EntryDraft, editor: string, submissionId: number) {
	await env.DB.batch([
		env.DB.prepare(
			`INSERT INTO entries (id, type, catalogue_number, name, ai, website, release_year, description, facts, notes, research,
			 cost_band, skill_level, runs_locally, status, source, submitted_by, last_updated)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, '[]', '[]', '{}', NULL, NULL, NULL, 'needs_review', 'submission', ?, ?)`
		).bind(e.id, e.type, e.catalogueNumber, e.name, e.ai ? 1 : 0, e.website, e.releaseYear, e.description, e.submittedBy, today()),
		...entryStatements(e),
		history('entry', e.id, 'created', editor, {}, `From submission #${submissionId}.`),
		...fileStatements('entry', e.id, editor),
		submissionStatement(submissionId, 'filed', null, editor, e.id)
	]);
}

export async function createProject(p: ProjectDraft, editor: string, submissionId: number) {
	await env.DB.batch([
		env.DB.prepare(
			`INSERT INTO projects (id, title, kind, status, source, submitted_by, last_updated)
			 VALUES (?, ?, ?, 'needs_review', 'submission', ?, ?)`
		).bind(p.id, p.title, p.kind as ProjectKind, p.submittedBy, today()),
		...projectStatements(p),
		history('project', p.id, 'created', editor, {}, `From submission #${submissionId}.`),
		...fileStatements('project', p.id, editor),
		submissionStatement(submissionId, 'filed', null, editor, p.id)
	]);
}

// ---------------------------------------------------------------------------
// Submissions
// ---------------------------------------------------------------------------

export interface SubmissionRow {
	id: number;
	type: 'tool' | 'dataset' | 'project' | 'correction';
	payload: any;
	submitterName: string | null;
	submitterEmail: string | null;
	targetEntryId: string | null;
	status: 'pending' | 'filed' | 'returned';
	editorNote: string | null;
	filedAs: string | null;
	createdAt: string;
}

const submissionFromRow = (r: any): SubmissionRow => ({
	id: r.id,
	type: r.type,
	payload: json(r.payload, {}),
	submitterName: r.submitter_name,
	submitterEmail: r.submitter_email,
	targetEntryId: r.target_entry_id,
	status: r.status,
	editorNote: r.editor_note,
	filedAs: r.filed_as,
	createdAt: r.created_at
});

export async function allSubmissions(): Promise<SubmissionRow[]> {
	const { results } = await env.DB.prepare('SELECT * FROM submissions ORDER BY created_at DESC, id DESC').all();
	return results.map(submissionFromRow);
}

export async function getSubmission(id: number): Promise<SubmissionRow | null> {
	const r = await env.DB.prepare('SELECT * FROM submissions WHERE id = ?').bind(id).first();
	return r ? submissionFromRow(r) : null;
}

function submissionStatement(id: number, status: 'pending' | 'filed' | 'returned', note: string | null, editor: string, filedAs: string | null = null) {
	return env.DB.prepare(
		`UPDATE submissions SET status = ?, editor_note = ?, reviewed_by = ?, filed_as = COALESCE(?, filed_as),
		 updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?`
	).bind(status, note, editor, filedAs, id);
}

export async function setSubmissionStatus(id: number, status: 'pending' | 'filed' | 'returned', note: string | null, editor: string) {
	await submissionStatement(id, status, note, editor).run();
}

// ---------------------------------------------------------------------------
// Link checks
// ---------------------------------------------------------------------------

export async function linkResults(): Promise<Map<string, { ok: number; status: number | null; note: string | null; checked_at: string }>> {
	const { results } = await env.DB.prepare('SELECT * FROM link_checks').all<any>();
	return new Map(results.map((r) => [r.url, r]));
}

/** Opens each link and records whether it works. Keep batches small: Cloudflare limits outgoing requests per visit. */
export async function checkLinks(urls: string[]) {
	const results = await Promise.all(
		urls.map(async (url) => {
			const attempt = async (method: 'HEAD' | 'GET') =>
				fetch(url, {
					method,
					redirect: 'follow',
					signal: AbortSignal.timeout(8000),
					headers: { 'user-agent': 'DigitalHistoriansToolbox-LinkCheck/1.0 (+editor review)' }
				});
			try {
				let res = await attempt('HEAD');
				if ([403, 405, 501].includes(res.status)) res = await attempt('GET');
				return { url, ok: res.status < 400 ? 1 : 0, status: res.status, note: null };
			} catch (e) {
				const note = e instanceof Error && e.name === 'TimeoutError' ? 'timed out' : 'no response';
				return { url, ok: 0, status: null, note };
			}
		})
	);
	if (results.length) {
		await env.DB.batch(
			results.map((r) =>
				env.DB.prepare(
					`INSERT INTO link_checks (url, ok, status, note, checked_at) VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
					 ON CONFLICT(url) DO UPDATE SET ok = excluded.ok, status = excluded.status, note = excluded.note, checked_at = excluded.checked_at`
				).bind(r.url, r.ok, r.status, r.note)
			)
		);
	}
	return results;
}
