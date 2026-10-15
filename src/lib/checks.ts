// Automatic checks shown in the editors' review queue. They flag things to look at;
// they never block filing.
import { normalise } from './search';
import type { Note } from './types';

/** Lower-case letters and digits only: "Transkribus (READ-COOP)" -> "transkribusreadcoop". */
const squash = (s: string) => normalise(s).replace(/[^a-z0-9]/g, '');

/** Host and path without "www.", the scheme or a trailing slash, for comparing links. */
export function linkKey(url: string | null | undefined): string | null {
	if (!url) return null;
	try {
		const u = new URL(url);
		const doi = u.hostname.endsWith('doi.org') ? u.pathname.toLowerCase() : null;
		if (doi) return `doi:${doi.replace(/^\//, '')}`;
		return `${u.hostname.replace(/^www\./, '')}${u.pathname.replace(/\/+$/, '')}`.toLowerCase();
	} catch {
		return null;
	}
}

/** Names of existing records that look like the same thing (same name, one name inside the other, or same link). */
export function possibleDuplicates(
	candidate: { id?: string; name: string; url?: string | null },
	existing: { id: string; name: string; url?: string | null }[]
): string[] {
	const name = squash(candidate.name);
	const link = linkKey(candidate.url);
	const found: string[] = [];
	for (const e of existing) {
		if (e.id === candidate.id) continue;
		const other = squash(e.name);
		const sameName = !!name && (other === name || (Math.min(name.length, other.length) >= 5 && (other.includes(name) || name.includes(other))));
		const sameLink = !!link && linkKey(e.url) === link;
		if (sameName || sameLink) found.push(e.name);
	}
	return found;
}

export const TOOL_QUESTIONS = ['Where your sources go', 'How it’s been tested', 'Known problems on historical sources'];
export const DATASET_QUESTIONS = ['How the text was made', 'Known gaps and biases', 'What you can do with it'];

/** Historian's notes that an AI tool is missing (an empty answer counts as missing). */
export function missingNotes(entry: { ai: boolean; type: 'tool' | 'dataset'; notes: Note[] }): string[] {
	if (!entry.ai || entry.type !== 'tool') return [];
	const answered = entry.notes.filter((n) => n.a.trim());
	if (answered.length >= 3) return [];
	const answeredQs = new Set(answered.map((n) => n.q.trim().toLowerCase()));
	const missing = TOOL_QUESTIONS.filter((q) => !answeredQs.has(q.toLowerCase()));
	return missing.length ? missing : TOOL_QUESTIONS.slice(answered.length);
}

/** Problems with a project's links to catalogue cards. */
export function projectLinkProblems(entryIds: string[], entries: Map<string, { name: string; status: string }>) {
	if (!entryIds.length) return { noEntries: true, unfiled: [] as string[] };
	return {
		noEntries: false,
		unfiled: entryIds.filter((id) => entries.get(id)?.status !== 'approved').map((id) => entries.get(id)?.name ?? id)
	};
}

/** How a link-check result should read in the queue. */
export function describeLink(check: { ok: number; status: number | null; note: string | null } | undefined) {
	if (!check) return { level: 'unknown' as const, text: 'not checked yet' };
	if (check.ok) return { level: 'ok' as const, text: 'works' };
	if (check.status && [401, 403, 429, 999].includes(check.status)) {
		return { level: 'unsure' as const, text: `couldn’t confirm (the site blocks automatic checks, ${check.status})` };
	}
	if (check.status) return { level: 'bad' as const, text: `doesn’t resolve (${check.status})` };
	return { level: 'bad' as const, text: `couldn’t reach the site${check.note ? ` (${check.note})` : ''}` };
}
