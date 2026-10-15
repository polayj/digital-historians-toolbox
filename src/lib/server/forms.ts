// Reads and checks the editors' card and project forms.
import type { EntryDraft, ProjectDraft } from '#lib/drafts.js';
import { normaliseUrl } from '#lib/submissions.js';
import type { Fact, Note, ProjectKind } from '#lib/types.js';

type Errors = Record<string, string>;
type Form = FormData;

const str = (f: Form, k: string) => String(f.get(k) ?? '').trim();
const pairs = <T>(f: Form, k: string, a: string, b: string): T[] => {
	try {
		const rows = JSON.parse(String(f.get(k) ?? '[]')) as Record<string, string>[];
		return rows
			.map((r) => ({ [a]: String(r[a] ?? '').trim(), [b]: String(r[b] ?? '').trim() }) as T)
			.filter((r) => (r as Record<string, string>)[a] || (r as Record<string, string>)[b]);
	} catch {
		return [];
	}
};

function url(f: Form, k: string, errors: Errors): string | null {
	const raw = str(f, k);
	if (!raw) return null;
	const u = normaliseUrl(raw);
	if (!u) errors[k] = 'This doesn’t look like a web address or DOI.';
	return u ?? raw;
}

export function parseEntryForm(
	f: Form,
	base: { id: string; submittedBy: string | null },
	known: { drawerIds: Set<string>; subdrawerIds: Set<string>; catalogueNumbers: Map<string, string> }
): { draft: EntryDraft; errors: Errors } {
	const errors: Errors = {};
	const type = str(f, 'type') === 'dataset' ? 'dataset' : 'tool';
	const catalogueNumber = str(f, 'catalogue_number');
	const owner = known.catalogueNumbers.get(catalogueNumber);
	if (!catalogueNumber) errors.catalogue_number = 'Every card needs a catalogue number.';
	else if (owner && owner !== base.id) errors.catalogue_number = `No. ${catalogueNumber} is already used by another card.`;

	const releaseRaw = str(f, 'release_year');
	const releaseYear = releaseRaw ? Number(releaseRaw) : null;
	if (releaseRaw && (!Number.isInteger(releaseYear) || releaseYear! < 1900 || releaseYear! > 2100)) {
		errors.release_year = 'Use a four-digit year, e.g. 2015.';
	}

	const research: Record<string, string> = {};
	for (const r of pairs<{ k: string; v: string }>(f, 'research', 'k', 'v')) if (r.k) research[r.k] = r.v;

	const runs = str(f, 'runs_locally');
	const draft: EntryDraft = {
		id: base.id,
		type,
		catalogueNumber,
		name: str(f, 'name'),
		ai: f.get('ai') === 'on',
		website: url(f, 'website', errors),
		releaseYear: errors.release_year ? null : releaseYear,
		description: str(f, 'description'),
		facts: pairs<Fact>(f, 'facts', 'k', 'v'),
		notes: pairs<Note>(f, 'notes', 'q', 'a'),
		research,
		// A guide card such as 'htr' appears under several drawers, so the same value can arrive twice.
		drawers: [...new Set(f.getAll('drawers').map(String))].filter((d) => known.drawerIds.has(d)),
		subdrawers: [...new Set(f.getAll('subdrawers').map(String))].filter((s) => known.subdrawerIds.has(s)),
		costBand: ['free', 'freemium', 'paid'].includes(str(f, 'cost_band')) ? str(f, 'cost_band') : null,
		skillLevel: ['no_code', 'some_code', 'programming'].includes(str(f, 'skill_level')) ? str(f, 'skill_level') : null,
		runsLocally: runs === '1' ? true : runs === '0' ? false : null,
		submittedBy: base.submittedBy
	};
	if (!draft.name) errors.name = 'Every card needs a name.';
	if (!draft.description) errors.description = 'Every card needs a description.';
	if (!draft.drawers.length) errors.drawers = 'Put the card in at least one drawer.';
	return { draft, errors };
}

export const KNOWN_FLAGS = [
	{ id: 'editor_conflict_of_interest', label: 'Editor’s own paper (conflict of interest)' },
	{ id: 'tried_and_rejected', label: 'Tried and rejected (shown, but not counted as a use)' },
	{ id: 'public_history', label: 'Public history' },
	{ id: 'student_project', label: 'Student project' }
];

export function parseProjectForm(
	f: Form,
	base: { id: string; submittedBy: string | null; flags: string[] },
	known: { entryIds: Set<string> }
): { draft: ProjectDraft; errors: Errors } {
	const errors: Errors = {};
	const kind = str(f, 'kind') as ProjectKind;
	if (!['research', 'corpus_building', 'evaluation'].includes(kind)) errors.kind = 'Choose a kind.';
	// Keep any flags this form doesn't know about, so nothing is lost.
	const otherFlags = base.flags.filter((x) => !KNOWN_FLAGS.some((k) => k.id === x));
	const draft: ProjectDraft = {
		id: base.id,
		title: str(f, 'title'),
		shortTitle: str(f, 'short_title') || null,
		year: str(f, 'year') || null,
		who: str(f, 'who') || null,
		kind,
		howUsed: str(f, 'how_used') || null,
		url: url(f, 'url', errors),
		flags: [...f.getAll('flags').map(String).filter((x) => KNOWN_FLAGS.some((k) => k.id === x)), ...otherFlags],
		editorNotes: str(f, 'editor_notes'),
		verified: str(f, 'verified') || null,
		entries: [...new Set(f.getAll('entries').map(String))].filter((id) => known.entryIds.has(id)),
		submittedBy: base.submittedBy
	};
	if (!draft.title) errors.title = 'Every project needs a title.';
	if (draft.verified && !/^\d{4}-\d{2}-\d{2}$/.test(draft.verified)) errors.verified = 'Use the form YYYY-MM-DD.';
	return { draft, errors };
}
