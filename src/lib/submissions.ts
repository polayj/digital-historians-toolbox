// What the public submission form collects for each kind of entry, and how it's checked.
// Used by the form (to show the right fields) and by the server (to validate before saving).

export type SubmissionType = 'tool' | 'dataset' | 'project' | 'correction';

export const SUBMISSION_TYPES: { id: SubmissionType; label: string; hint: string }[] = [
	{ id: 'tool', label: 'A tool', hint: 'Software, model or platform' },
	{ id: 'dataset', label: 'A dataset', hint: 'A public corpus or collection' },
	{ id: 'project', label: 'A project', hint: 'Research that used tools or data' },
	{ id: 'correction', label: 'A correction', hint: 'Something on a card is wrong or out of date' }
];

/** Where an AI tool sends uploaded sources. Becomes the card's first historian's note. */
export const DATA_HANDLING = [
	{ id: 'local', label: 'Stays on your machine', note: 'Stays on your own computer.' },
	{ id: 'cloud_no_training', label: 'Vendor cloud, not used for training', note: 'Sent to the vendor’s servers; the vendor says it is not used for training.' },
	{ id: 'cloud_training', label: 'Vendor cloud, may be used for training', note: 'Sent to the vendor’s servers, and may be used to train its models.' },
	{ id: 'unsure', label: 'Not sure', note: '' }
] as const;

export interface ToolPayload {
	name: string;
	url: string;
	description: string;
	drawers: string[];
	ai: boolean;
	dataHandling: string;
	evaluationUrl: string;
	knownProblems: string;
	projectsUsed: string;
}
export interface DatasetPayload {
	name: string;
	url: string;
	description: string;
	holder: string;
	howMade: string;
	gaps: string;
	terms: string;
	projectsUsed: string;
}
export interface ProjectPayload {
	title: string;
	url: string;
	year: string;
	who: string;
	kind: 'research' | 'corpus_building' | 'evaluation' | '';
	entries: string[];
	howUsed: string;
	otherTools: string;
}
export interface CorrectionPayload {
	entryId: string;
	problem: string;
	source: string;
}
export type Payload = ToolPayload | DatasetPayload | ProjectPayload | CorrectionPayload;

export interface ValidSubmission {
	type: SubmissionType;
	payload: Payload;
	submitterName: string;
	submitterEmail: string;
	targetEntryId: string | null;
}

export type Errors = Record<string, string>;

const LIMITS = { short: 200, medium: 1000, long: 3000 };

/** Accepts a web address or a bare DOI; returns a full https address, or null if it isn't one. */
export function normaliseUrl(input: string): string | null {
	const s = input.trim();
	if (!s) return null;
	if (/^10\.\d{4,9}\/\S+$/.test(s)) return `https://doi.org/${s}`;
	if (/^doi:\s*10\./i.test(s)) return `https://doi.org/${s.replace(/^doi:\s*/i, '')}`;
	const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`;
	try {
		const u = new URL(withScheme);
		if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
		if (!u.hostname.includes('.')) return null;
		// Keep the address as written (only adding https:// if it was missing), so saving a card
		// never records a change the editor didn't make.
		return withScheme;
	} catch {
		return null;
	}
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Form = { get(name: string): FormDataEntryValue | null; getAll(name: string): FormDataEntryValue[] };

/**
 * Checks a submitted form. Returns either the cleaned submission or, per field, what needs fixing.
 * `known` lists the catalogue's real entry and drawer ids, so nothing else can be linked.
 */
export function validateSubmission(
	form: Form,
	known: { entryIds: Set<string>; drawerIds: Set<string> }
): { ok: true; submission: ValidSubmission } | { ok: false; errors: Errors } {
	const errors: Errors = {};
	const text = (name: string, limit = LIMITS.medium) => {
		const v = String(form.get(name) ?? '').trim();
		if (v.length > limit) errors[name] = `Please keep this under ${limit} characters.`;
		return v;
	};
	const required = (name: string, label: string, limit = LIMITS.medium) => {
		const v = text(name, limit);
		if (!v) errors[name] = `Please add ${label}.`;
		return v;
	};
	const url = (name: string, { needed = false, label = 'a link' } = {}) => {
		const raw = text(name, LIMITS.medium);
		if (!raw) {
			if (needed) errors[name] = `Please add ${label}.`;
			return '';
		}
		const u = normaliseUrl(raw);
		if (!u) errors[name] = 'This doesn’t look like a web address or DOI.';
		return u ?? raw;
	};

	const type = String(form.get('type') ?? '') as SubmissionType;
	if (!SUBMISSION_TYPES.some((t) => t.id === type)) {
		return { ok: false, errors: { type: 'Please choose what you are adding.' } };
	}

	const submitterName = text('submitter_name', LIMITS.short);
	const submitterEmail = required('submitter_email', 'your email', LIMITS.short);
	if (submitterEmail && !EMAIL.test(submitterEmail)) errors.submitter_email = 'This doesn’t look like an email address.';

	let payload: Payload;
	let targetEntryId: string | null = null;

	if (type === 'tool') {
		const drawers = form.getAll('drawers').map(String).filter((d) => known.drawerIds.has(d));
		const ai = form.get('ai') === 'on' || form.get('ai') === 'true';
		const dataHandling = ai ? String(form.get('data_handling') ?? '') : '';
		if (ai && dataHandling && !DATA_HANDLING.some((d) => d.id === dataHandling)) errors.data_handling = 'Please choose an option.';
		payload = {
			name: required('name', 'the tool’s name', LIMITS.short),
			url: url('url', { needed: true, label: 'its website or repository' }),
			description: required('description', 'a sentence or two on what it does'),
			drawers,
			ai,
			dataHandling,
			evaluationUrl: ai ? url('evaluation_url') : '',
			knownProblems: ai ? text('known_problems', LIMITS.long) : '',
			projectsUsed: text('projects_used', LIMITS.long)
		};
	} else if (type === 'dataset') {
		payload = {
			name: required('name', 'the dataset’s name', LIMITS.short),
			url: url('url', { needed: true, label: 'its website' }),
			description: required('description', 'a sentence or two on what it holds'),
			holder: text('holder', LIMITS.short),
			howMade: text('how_made', LIMITS.long),
			gaps: text('gaps', LIMITS.long),
			terms: text('terms', LIMITS.long),
			projectsUsed: text('projects_used', LIMITS.long)
		};
	} else if (type === 'project') {
		const kind = String(form.get('kind') ?? '') as ProjectPayload['kind'];
		if (!['research', 'corpus_building', 'evaluation'].includes(kind)) errors.kind = 'Please choose what kind of project it is.';
		const entries = [...new Set(form.getAll('entries').map(String))].filter((id) => known.entryIds.has(id));
		const otherTools = text('other_tools', LIMITS.medium);
		if (!entries.length && !otherTools) errors.entries = 'Please tick at least one tool or dataset it used, or name it below.';
		payload = {
			title: required('name', 'the project’s title', LIMITS.short),
			url: url('url', { needed: true, label: 'a link or DOI' }),
			year: text('year', 40),
			who: text('who', LIMITS.short),
			kind,
			entries,
			howUsed: required('how_used', 'a sentence on how it used them'),
			otherTools
		};
		targetEntryId = entries.length === 1 ? entries[0] : null;
	} else {
		const entryId = String(form.get('entry_id') ?? '');
		if (!known.entryIds.has(entryId)) errors.entry_id = 'Please choose the card that needs correcting.';
		payload = {
			entryId,
			problem: required('problem', 'what needs correcting', LIMITS.long),
			source: url('source')
		};
		targetEntryId = entryId || null;
	}

	if (Object.keys(errors).length) return { ok: false, errors };
	return { ok: true, submission: { type, payload, submitterName, submitterEmail, targetEntryId } };
}
