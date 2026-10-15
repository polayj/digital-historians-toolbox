// Turns a public submission into a draft card or project for the editors to check and file.
import { DATASET_QUESTIONS, TOOL_QUESTIONS } from './checks';
import { normalise } from './search';
import { DATA_HANDLING, type DatasetPayload, type ProjectPayload, type ToolPayload } from './submissions';
import type { Fact, Note, ProjectKind } from './types';

export interface EntryDraft {
	id: string;
	type: 'tool' | 'dataset';
	catalogueNumber: string;
	name: string;
	ai: boolean;
	website: string | null;
	releaseYear: number | null;
	description: string;
	facts: Fact[];
	notes: Note[];
	research: Record<string, string>;
	drawers: string[];
	subdrawers: string[];
	costBand: string | null;
	skillLevel: string | null;
	runsLocally: boolean | null;
	submittedBy: string | null;
}

export interface ProjectDraft {
	id: string;
	title: string;
	shortTitle: string | null;
	year: string | null;
	who: string | null;
	kind: ProjectKind;
	howUsed: string | null;
	url: string | null;
	flags: string[];
	editorNotes: string;
	verified: string | null;
	entries: string[];
	submittedBy: string | null;
}

/** "World Historical Gazetteer" -> "world-historical-gazetteer", made unique against existing ids. */
export function slugFor(name: string, taken: Set<string>): string {
	const base =
		normalise(name)
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 40)
			.replace(/-+$/, '') || 'entry';
	let id = base;
	for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
	return id;
}

/** Next free catalogue number: tools below 100, datasets from 101, as in the seed data. */
export function nextCatalogueNumber(type: 'tool' | 'dataset', taken: string[]): string {
	const nums = taken.map(Number).filter((n) => Number.isFinite(n));
	const inRange = nums.filter((n) => (type === 'dataset' ? n >= 100 : n < 100));
	let next = (inRange.length ? Math.max(...inRange) : type === 'dataset' ? 100 : 0) + 1;
	while (nums.includes(next)) next++;
	return String(next).padStart(3, '0');
}

/** Next project id after the highest pNNN. */
export function nextProjectId(taken: string[]): string {
	const max = Math.max(0, ...taken.map((id) => Number(/^p(\d+)$/.exec(id)?.[1] ?? 0)));
	return `p${String(max + 1).padStart(3, '0')}`;
}

export function entryDraftFromSubmission(
	type: 'tool' | 'dataset',
	payload: ToolPayload | DatasetPayload,
	submittedBy: string | null,
	existing: { ids: Set<string>; catalogueNumbers: string[] }
): EntryDraft {
	const base = {
		id: slugFor(payload.name, existing.ids),
		type,
		catalogueNumber: nextCatalogueNumber(type, existing.catalogueNumbers),
		name: payload.name,
		website: payload.url || null,
		releaseYear: null,
		description: payload.description,
		subdrawers: [],
		costBand: null,
		skillLevel: null,
		runsLocally: null,
		submittedBy
	};
	if (type === 'tool') {
		const p = payload as ToolPayload;
		const where = DATA_HANDLING.find((d) => d.id === p.dataHandling)?.note ?? '';
		const research: Record<string, string> = {};
		if (p.evaluationUrl) research.evaluations = p.evaluationUrl;
		if (p.projectsUsed) research.projects_suggested = p.projectsUsed;
		return {
			...base,
			ai: p.ai,
			facts: [],
			notes: [
				{ q: TOOL_QUESTIONS[0], a: where },
				{ q: TOOL_QUESTIONS[1], a: p.evaluationUrl ? `See the evaluation submitted with this card: ${p.evaluationUrl}` : '' },
				{ q: TOOL_QUESTIONS[2], a: p.knownProblems }
			],
			research,
			drawers: p.drawers
		};
	}
	const d = payload as DatasetPayload;
	return {
		...base,
		ai: false,
		facts: d.holder ? [{ k: 'Holder', v: d.holder }] : [],
		notes: [
			{ q: DATASET_QUESTIONS[0], a: d.howMade },
			{ q: DATASET_QUESTIONS[1], a: d.gaps },
			{ q: DATASET_QUESTIONS[2], a: d.terms }
		],
		research: d.projectsUsed ? { projects_suggested: d.projectsUsed } : {},
		drawers: ['data']
	};
}

export function projectDraftFromSubmission(payload: ProjectPayload, submittedBy: string | null, existingIds: string[]): ProjectDraft {
	return {
		id: nextProjectId(existingIds),
		title: payload.title,
		shortTitle: null,
		year: payload.year || null,
		who: payload.who || null,
		kind: (payload.kind || 'research') as ProjectKind,
		howUsed: payload.howUsed || null,
		url: payload.url || null,
		flags: [],
		editorNotes: payload.otherTools ? `Submitter also named tools not in the catalogue: ${payload.otherTools}` : '',
		verified: null,
		entries: payload.entries,
		submittedBy
	};
}

/** Field-by-field changes between two versions of a record, for the version history. */
export function diffFields(before: Record<string, unknown>, after: Record<string, unknown>): Record<string, { from: unknown; to: unknown }> {
	const changes: Record<string, { from: unknown; to: unknown }> = {};
	for (const key of Object.keys(after)) {
		if (JSON.stringify(before[key] ?? null) !== JSON.stringify(after[key] ?? null)) {
			changes[key] = { from: before[key] ?? null, to: after[key] ?? null };
		}
	}
	return changes;
}
