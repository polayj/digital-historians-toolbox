// Small display helpers shared by the catalogue, search and network pages.
import type { ProjectKind } from './types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const parts = (iso: string) => {
	const [y, m, d] = iso.split('-').map(Number);
	return { y, m, d };
};

/** '2026-10-14' -> '14 Oct 2026' */
export function formatDate(iso: string): string {
	const { y, m, d } = parts(iso);
	return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** '2026-10-14' -> 'Oct 2026' */
export function formatMonth(iso: string): string {
	const { y, m } = parts(iso);
	return `${MONTHS[m - 1]} ${y}`;
}

/** A card is due for review once 12 months have passed since it was last updated. */
export function isDueForReview(lastUpdated: string, today: string): boolean {
	const a = parts(lastUpdated);
	const b = parts(today);
	const months = (b.y - a.y) * 12 + (b.m - a.m) - (b.d < a.d ? 1 : 0);
	return months >= 12;
}

export const KINDS: Record<ProjectKind, { label: string; short: string; heading: string; colour: string; empty: string }> = {
	research: {
		label: 'Research',
		short: 'research',
		heading: 'Used in research',
		colour: 'var(--kind-research)',
		empty: 'No published research uses found yet. Using it in a project? Tell us.'
	},
	corpus_building: {
		label: 'Corpus building',
		short: 'corpus',
		heading: 'Used to build corpora',
		colour: 'var(--kind-corpus)',
		empty: 'None recorded yet.'
	},
	evaluation: {
		label: 'Evaluation',
		short: 'tested',
		heading: 'Tested in',
		colour: 'var(--kind-evaluation)',
		empty: 'No published evaluations found yet.'
	}
};

/** Public labels for project flags. Unknown flags are not shown. */
export const FLAG_LABELS: Record<string, string> = {
	editor_conflict_of_interest: 'editor’s own paper',
	tried_and_rejected: 'tried and rejected',
	public_history: 'public history',
	student_project: 'student project'
};

export const flagLabels = (flags: string[]) => flags.map((f) => FLAG_LABELS[f]).filter(Boolean);
