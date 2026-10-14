// Search across tools, datasets and projects.
//
// Matching: every word you type must appear somewhere in the record (capitals and accents ignored).
// Ranking:  each word scores for every place it appears: most in the name, then the guide-card
//           labels, then the description, then everything else on the card. A drawer's name only
//           counts for drawers without guide cards, because combined names such as
//           "OCR & Handwriting" would otherwise match every card in the drawer.
// Filters:  options within a group widen the search (Free OR Paid); groups narrow it (Free AND No code).
//           A project matches the tool filters if it used at least one matching tool or dataset.
import type { EntryStats } from './ranking';
import type { Catalogue, Entry, Project, ProjectKind } from './types';

export const COST_OPTIONS = [
	{ id: 'free', label: 'Free' },
	{ id: 'freemium', label: 'Free tier + paid' },
	{ id: 'paid', label: 'Paid' }
] as const;

export const SKILL_OPTIONS = [
	{ id: 'no_code', label: 'No code' },
	{ id: 'some_code', label: 'Some code' },
	{ id: 'programming', label: 'Programming' }
] as const;

export type ResultType = 'tool' | 'dataset' | 'project';

export interface Filters {
	types: ResultType[]; // shown types; all three by default
	aiOnly: boolean;
	runsLocally: boolean;
	evaluated: boolean; // has a published evaluation
	cost: string[];
	skill: string[];
	kinds: ProjectKind[]; // project kinds; empty = all
}

export const DEFAULT_FILTERS: Filters = {
	types: ['tool', 'dataset', 'project'],
	aiOnly: false,
	runsLocally: false,
	evaluated: false,
	cost: [],
	skill: [],
	kinds: []
};

export type Result = { kind: 'entry'; entry: Entry; score: number } | { kind: 'project'; project: Project; score: number };

/** Lower-case, strip accents, so "Montreal" finds "Montréal". */
export function normalise(text: string): string {
	return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function terms(query: string): string[] {
	return normalise(query).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

/** Score a record given weighted text fields; 0 if any term is missing. */
function scoreFields(fields: [string, number][], words: string[]): number {
	if (!words.length) return 1;
	const norm = fields.map(([text, weight]) => [normalise(text), weight] as const);
	let total = 0;
	for (const w of words) {
		let found = 0;
		for (const [text, weight] of norm) if (text.includes(w)) found += weight;
		if (!found) return 0;
		total += found;
	}
	return total;
}

export function entryFilterActive(f: Filters): boolean {
	return f.aiOnly || f.runsLocally || f.evaluated || f.cost.length > 0 || f.skill.length > 0;
}

/** Tool/dataset filters other than type. */
export function entryPasses(e: Entry, f: Filters, stats: Map<string, EntryStats>): boolean {
	if (f.aiOnly && !e.ai) return false;
	if (f.runsLocally && e.runsLocally !== true) return false;
	if (f.evaluated && !(stats.get(e.id)?.tested.length ?? 0)) return false;
	if (f.cost.length && !(e.costBand && f.cost.includes(e.costBand))) return false;
	if (f.skill.length && !(e.skillLevel && f.skill.includes(e.skillLevel))) return false;
	return true;
}

export function search(
	cat: Pick<Catalogue, 'entries' | 'projects' | 'drawers'>,
	stats: Map<string, EntryStats>,
	query: string,
	f: Filters
): Result[] {
	const words = terms(query);
	// Drawers without guide cards (e.g. "Networks") are described by their own name.
	const plainDrawerLabel = new Map(cat.drawers.filter((d) => !d.subdrawers.length).map((d) => [d.id, d.label]));
	const subLabel = new Map(cat.drawers.flatMap((d) => d.subdrawers.map((s) => [s.id, s.label] as const)));
	const entryById = new Map(cat.entries.map((e) => [e.id, e]));

	const labelsOf = (e: Entry) =>
		[...e.drawers.map((d) => plainDrawerLabel.get(d) ?? ''), ...e.subdrawers.map((s) => subLabel.get(s) ?? '')].join(' ');

	const results: Result[] = [];

	for (const e of cat.entries) {
		if (!f.types.includes(e.type)) continue;
		if (!entryPasses(e, f, stats)) continue;
		const score = scoreFields(
			[
				[e.name, 10],
				[labelsOf(e), 4],
				[e.description, 3],
				[e.facts.map((x) => x.v).join(' ') + ' ' + e.notes.map((x) => x.a).join(' '), 1]
			],
			words
		);
		if (score) results.push({ kind: 'entry', entry: e, score });
	}

	if (f.types.includes('project')) {
		const filterByEntries = entryFilterActive(f);
		for (const p of cat.projects) {
			if (f.kinds.length && !f.kinds.includes(p.kind)) continue;
			const used = p.entries.map((id) => entryById.get(id)).filter((e): e is Entry => !!e);
			if (filterByEntries && !used.some((e) => entryPasses(e, f, stats))) continue;
			const score = scoreFields(
				[
					[`${p.title} ${p.shortTitle ?? ''}`, 8],
					[p.who ?? '', 4],
					[used.map((e) => e.name).join(' '), 2],
					[p.howUsed ?? '', 2],
					[`${p.year ?? ''} ${used.map(labelsOf).join(' ')}`, 1]
				],
				words
			);
			if (score) results.push({ kind: 'project', project: p, score });
		}
	}
	return results;
}
