// The catalogue's counting and sorting rules, in one place.
//
// Most used = linked research + corpus-building projects, not counting any flagged "tried and rejected".
// Trending  = the same count, only for projects dated inside the chosen window,
//             plus "I'm using this now" check-ins in that window.
//             Evaluations never count, so a burst of benchmarks can't push a tool up.
// Newest    = by release year.
import type { Catalogue, Entry, Project } from './types';

export type SortKey = 'trending' | 'used' | 'new' | 'az';

/** Trending windows offered, in years. */
export const WINDOWS = [1, 2, 5, 20] as const;
export const DEFAULT_WINDOW = 2;

export const SORTS: { id: SortKey; label: string; note: string }[] = [
	{
		id: 'trending',
		label: 'Trending',
		note: 'Counts research and corpus-building uses in the window, plus “I’m using this now” check-ins. Benchmarks don’t count.'
	},
	{ id: 'used', label: 'Most used', note: 'All research and corpus-building uses, all time. Favours older tools.' },
	{ id: 'new', label: 'Newest', note: 'Most recently released first.' },
	{ id: 'az', label: 'A–Z', note: 'Plain alphabetical order.' }
];

/** A project counts as a use if it isn't an evaluation and wasn't tried and rejected. */
export function countsAsUse(p: Project): boolean {
	return p.kind !== 'evaluation' && !p.flags.includes('tried_and_rejected');
}

/** "Past N years" = the current calendar year and the N−1 before it. Undated projects are never inside. */
export function inWindow(year: number | null, windowYears: number, currentYear: number): boolean {
	return year !== null && year > currentYear - windowYears && year <= currentYear;
}

export interface EntryStats {
	/** Linked projects by kind, newest first (as listed on the card). */
	research: Project[];
	corpus: Project[];
	tested: Project[];
	/** Most-used score. */
	uses: number;
	/** Trending score for a window, in years. */
	trend: (windowYears: number) => number;
}

export function buildStats(cat: Pick<Catalogue, 'entries' | 'projects' | 'checkins' | 'currentYear'>): Map<string, EntryStats> {
	const byEntry = new Map<string, Project[]>();
	for (const p of cat.projects) for (const id of p.entries) byEntry.set(id, [...(byEntry.get(id) ?? []), p]);

	const newestFirst = (a: Project, b: Project) => (b.yearSort ?? -Infinity) - (a.yearSort ?? -Infinity) || a.title.localeCompare(b.title);

	const stats = new Map<string, EntryStats>();
	for (const e of cat.entries) {
		const mine = (byEntry.get(e.id) ?? []).slice().sort(newestFirst);
		const counting = mine.filter(countsAsUse);
		const checkins = cat.checkins[e.id] ?? {};
		stats.set(e.id, {
			research: mine.filter((p) => p.kind === 'research'),
			corpus: mine.filter((p) => p.kind === 'corpus_building'),
			tested: mine.filter((p) => p.kind === 'evaluation'),
			uses: counting.length,
			trend: (w) =>
				counting.filter((p) => inWindow(p.yearSort, w, cat.currentYear)).length +
				Object.entries(checkins).reduce((n, [year, count]) => n + (inWindow(Number(year), w, cat.currentYear) ? count : 0), 0)
		});
	}
	return stats;
}

const byName = (a: Entry, b: Entry) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });

/** Comparator for a sort order. Ties fall back to most used, then A–Z. */
export function comparator(sort: SortKey, windowYears: number, stats: Map<string, EntryStats>) {
	const s = (e: Entry) => stats.get(e.id)!;
	switch (sort) {
		case 'az':
			return byName;
		case 'used':
			return (a: Entry, b: Entry) => s(b).uses - s(a).uses || byName(a, b);
		case 'new':
			return (a: Entry, b: Entry) => (b.releaseYear ?? -Infinity) - (a.releaseYear ?? -Infinity) || byName(a, b);
		case 'trending':
		default:
			return (a: Entry, b: Entry) =>
				s(b).trend(windowYears) - s(a).trend(windowYears) || s(b).uses - s(a).uses || byName(a, b);
	}
}

/** The Trending strip: entries with any trending score in the window, highest first. */
export function topTrending(entries: Entry[], stats: Map<string, EntryStats>, windowYears = DEFAULT_WINDOW, limit = 5) {
	return entries
		.filter((e) => stats.get(e.id)!.trend(windowYears) > 0)
		.sort(comparator('trending', windowYears, stats))
		.slice(0, limit)
		.map((e) => ({ entry: e, score: stats.get(e.id)!.trend(windowYears) }));
}
