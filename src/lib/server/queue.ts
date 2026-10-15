// Builds the editors' review queue: seeded records and public submissions, each with its
// automatic checks (possible duplicates, links that don't resolve, AI cards missing their
// historian's notes, projects with no linked cards).
import { describeLink, missingNotes, possibleDuplicates, projectLinkProblems } from '#lib/checks.js';
import { entryDraftFromSubmission } from '#lib/drafts.js';
import { KINDS } from '#lib/format.js';
import { DATA_HANDLING } from '#lib/submissions.js';
import { allEntries, allProjects, allSubmissions, linkResults, type EntryRecord, type ProjectRecord, type SubmissionRow } from './admin';

export type QueueStatus = 'pending' | 'filed' | 'returned';
export type QueueKind = 'tool' | 'dataset' | 'project' | 'correction';

export interface Check {
	level: 'ok' | 'warn' | 'info';
	text: string;
}
export interface LinkLine {
	url: string;
	label: string;
	level: 'ok' | 'unsure' | 'bad' | 'unknown';
	text: string;
}
export interface QueueItem {
	key: string; // 'entry:<id>' | 'project:<id>' | 'submission:<n>'
	kind: QueueKind;
	origin: 'seed' | 'submission';
	status: QueueStatus;
	title: string;
	description: string;
	ai: boolean;
	credit: string;
	checks: Check[];
	links: LinkLine[];
	details: { label: string; text: string }[];
	adminNotes: { label: string; text: string }[];
	reviewNote: string | null;
	editHref: string;
	publicHref: string | null;
}

const STATUS: Record<string, QueueStatus> = { needs_review: 'pending', approved: 'filed', returned: 'returned' };
const UNVERIFIED = /unverified/i;

export async function buildQueue() {
	const [entries, projects, submissions, links] = await Promise.all([allEntries(), allProjects(), allSubmissions(), linkResults()]);
	const entryById = new Map(entries.map((e) => [e.id, e]));
	const entryNames = entries.map((e) => ({ id: e.id, name: e.name, url: e.website }));
	const projectNames = projects.map((p) => ({ id: p.id, name: p.shortTitle ?? p.title, url: p.url }));
	const entryStatus = new Map(entries.map((e) => [e.id, { name: e.name, status: e.status }]));

	const linkLine = (url: string | null | undefined, label: string): LinkLine[] =>
		url ? [{ url, label, ...describeLink(links.get(url)) }] : [];

	const duplicateCheck = (found: string[]): Check[] =>
		found.length ? [{ level: 'warn', text: `Possible duplicate of ${found.map((f) => `“${f}”`).join(', ')}` }] : [];

	const notesCheck = (e: Pick<EntryRecord, 'ai' | 'type' | 'notes'>): Check[] => {
		const missing = missingNotes(e);
		return missing.length ? [{ level: 'warn', text: `AI card missing historian’s notes: ${missing.join('; ')}` }] : [];
	};

	const projectChecks = (entryIds: string[]): Check[] => {
		const p = projectLinkProblems(entryIds, entryStatus);
		if (p.noEntries) return [{ level: 'warn', text: 'No linked cards: this project isn’t connected to anything in the catalogue' }];
		const checks: Check[] = [{ level: 'ok', text: `Links to ${entryIds.length} ${entryIds.length === 1 ? 'card' : 'cards'}` }];
		if (p.unfiled.length) checks.push({ level: 'info', text: `Uses cards not filed yet: ${p.unfiled.join(', ')}. File those first so the links show.` });
		return checks;
	};

	const items: QueueItem[] = [];

	// ---------- Cards (seeded, or reopened) ----------
	for (const e of entries) {
		if (e.source === 'submission' && e.status === 'approved') continue; // shown through its submission
		const flags = e.research.editor_flags;
		const unverified = Object.values(e.research).filter((v) => UNVERIFIED.test(String(v))).length;
		items.push({
			key: `entry:${e.id}`,
			kind: e.type,
			origin: e.source,
			status: STATUS[e.status],
			title: e.name,
			description: e.description,
			ai: e.ai,
			credit: e.source === 'seed' ? 'From seed data' : `Card from ${e.submittedBy ?? 'an anonymous submitter'}`,
			checks: [
				...duplicateCheck(possibleDuplicates({ id: e.id, name: e.name, url: e.website }, entryNames)),
				...notesCheck(e),
				...(unverified ? [{ level: 'warn' as const, text: `${unverified} research ${unverified === 1 ? 'note is' : 'notes are'} marked UNVERIFIED` }] : [])
			],
			links: linkLine(e.website, 'Website'),
			details: [
				{ label: 'No.', text: e.catalogueNumber },
				...e.facts.slice(0, 6).map((f) => ({ label: f.k, text: f.v }))
			],
			adminNotes: [
				...(flags ? [{ label: 'Editor flags', text: flags }] : []),
				...Object.entries(e.research)
					.filter(([k, v]) => k !== 'editor_flags' && UNVERIFIED.test(String(v)))
					.map(([k, v]) => ({ label: `Research · ${k.replace(/_/g, ' ')}`, text: String(v) }))
			],
			reviewNote: e.reviewNote,
			editHref: `/admin/entries/${e.id}`,
			publicHref: e.status === 'approved' ? `/?card=${e.id}` : null
		});
	}

	// ---------- Projects (seeded, or reopened) ----------
	for (const p of projects) {
		if (p.source === 'submission' && p.status === 'approved') continue;
		items.push({
			key: `project:${p.id}`,
			kind: 'project',
			origin: p.source,
			status: STATUS[p.status],
			title: p.shortTitle ?? p.title,
			description: [p.who, p.year].filter(Boolean).join(', ') + (p.howUsed ? `. ${p.howUsed}` : ''),
			ai: false,
			credit: p.source === 'seed' ? 'From seed data' : `Project from ${p.submittedBy ?? 'an anonymous submitter'}`,
			checks: [...duplicateCheck(possibleDuplicates({ id: p.id, name: p.shortTitle ?? p.title, url: p.url }, projectNames)), ...projectChecks(p.entries)],
			links: linkLine(p.url, 'Link'),
			details: [
				{ label: 'Kind', text: KINDS[p.kind].label },
				{ label: 'Uses', text: p.entries.map((id) => entryById.get(id)?.name ?? id).join(', ') || 'nothing yet' },
				...(p.flags.length ? [{ label: 'Flags', text: p.flags.join(', ') }] : [])
			],
			adminNotes: p.editorNotes ? [{ label: 'Editor notes', text: p.editorNotes }] : [],
			reviewNote: p.reviewNote,
			editHref: `/admin/projects/${p.id}`,
			publicHref: null
		});
	}

	// ---------- Public submissions ----------
	for (const s of submissions) items.push(submissionItem(s, { entries, projects, entryNames, projectNames, entryById, linkLine, duplicateCheck, notesCheck, projectChecks }));

	return items;
}

function submissionItem(
	s: SubmissionRow,
	ctx: {
		entries: EntryRecord[];
		projects: ProjectRecord[];
		entryNames: { id: string; name: string; url: string | null }[];
		projectNames: { id: string; name: string; url: string | null }[];
		entryById: Map<string, EntryRecord>;
		linkLine: (url: string | null | undefined, label: string) => LinkLine[];
		duplicateCheck: (found: string[]) => Check[];
		notesCheck: (e: Pick<EntryRecord, 'ai' | 'type' | 'notes'>) => Check[];
		projectChecks: (ids: string[]) => Check[];
	}
): QueueItem {
	const p = s.payload;
	const date = s.createdAt.slice(0, 10);
	const base = {
		key: `submission:${s.id}`,
		origin: 'submission' as const,
		status: s.status,
		credit: `from ${s.submitterName || 'an anonymous submitter'} · ${date}`,
		reviewNote: s.editorNote,
		editHref: `/admin/submissions/${s.id}`,
		publicHref: s.status === 'filed' && s.filedAs ? (s.type === 'project' ? `/network?focus=${s.filedAs}` : `/?card=${s.filedAs}`) : null,
		adminNotes: s.submitterEmail ? [{ label: 'Submitter’s email (never shown publicly)', text: s.submitterEmail }] : []
	};

	if (s.type === 'tool' || s.type === 'dataset') {
		const draft = entryDraftFromSubmission(s.type, p, s.submitterName, { ids: new Set(), catalogueNumbers: [] });
		return {
			...base,
			kind: s.type,
			title: p.name,
			description: p.description,
			ai: !!p.ai,
			checks: [...ctx.duplicateCheck(possibleDuplicates({ name: p.name, url: p.url }, ctx.entryNames)), ...ctx.notesCheck(draft)],
			links: [...ctx.linkLine(p.url, 'Website'), ...ctx.linkLine(p.evaluationUrl, 'Evaluation')],
			details: [
				...(p.drawers?.length ? [{ label: 'Drawers', text: p.drawers.join(', ') }] : []),
				...(s.type === 'tool' && p.ai
					? [{ label: 'Sources go', text: DATA_HANDLING.find((d) => d.id === p.dataHandling)?.label ?? 'not answered' }]
					: []),
				...draft.notes.filter((n) => n.a).map((n) => ({ label: n.q, text: n.a })),
				...(p.holder ? [{ label: 'Holder', text: p.holder }] : []),
				...(p.projectsUsed ? [{ label: 'Projects that used it', text: p.projectsUsed }] : [])
			]
		};
	}
	if (s.type === 'project') {
		return {
			...base,
			kind: 'project',
			title: p.title,
			description: [p.who, p.year].filter(Boolean).join(', ') + (p.howUsed ? `. ${p.howUsed}` : ''),
			ai: false,
			checks: [...ctx.duplicateCheck(possibleDuplicates({ name: p.title, url: p.url }, ctx.projectNames)), ...ctx.projectChecks(p.entries ?? [])],
			links: ctx.linkLine(p.url, 'Link'),
			details: [
				{ label: 'Kind', text: KINDS[p.kind as keyof typeof KINDS]?.label ?? p.kind },
				{ label: 'Uses', text: (p.entries ?? []).map((id: string) => ctx.entryById.get(id)?.name ?? id).join(', ') || 'nothing in the catalogue' },
				...(p.otherTools ? [{ label: 'Also used (not in catalogue)', text: p.otherTools }] : [])
			]
		};
	}
	// Correction
	const target = ctx.entryById.get(p.entryId);
	return {
		...base,
		kind: 'correction',
		title: `Correction to ${target?.name ?? p.entryId}`,
		description: p.problem,
		ai: false,
		checks: [],
		links: ctx.linkLine(p.source, 'Source'),
		details: [],
		editHref: `/admin/entries/${p.entryId}?correction=${s.id}`
	};
}
