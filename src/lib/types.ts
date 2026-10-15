// Shapes of the public catalogue data sent to the browser.
// Admin-only fields (research, editor_notes, submitter emails) are never part of these.

export type EntryType = 'tool' | 'dataset';
export type ProjectKind = 'research' | 'corpus_building' | 'evaluation';
export type Status = 'needs_review' | 'approved' | 'returned';

export interface Fact {
	k: string;
	v: string;
}

export interface Note {
	q: string;
	a: string;
}

export interface Subdrawer {
	id: string;
	label: string;
	blurb: string | null;
}

export interface Drawer {
	id: string;
	number: string;
	label: string;
	blurb: string;
	subdrawers: Subdrawer[];
}

export interface Entry {
	id: string;
	type: EntryType;
	catalogueNumber: string;
	name: string;
	ai: boolean;
	website: string | null;
	releaseYear: number | null;
	description: string;
	facts: Fact[];
	notes: Note[];
	drawers: string[];
	subdrawers: string[];
	costBand: 'free' | 'freemium' | 'paid' | null;
	skillLevel: 'no_code' | 'some_code' | 'programming' | null;
	runsLocally: boolean | null;
	status: Status;
	lastUpdated: string; // YYYY-MM-DD
	/** Public name of the person who suggested the card, if any (never their email). */
	submittedBy: string | null;
}

export interface Project {
	id: string;
	title: string;
	shortTitle: string | null;
	year: string | null; // as written, e.g. 'c. 2011'
	yearSort: number | null; // last 4-digit year; null when undated
	who: string | null;
	kind: ProjectKind;
	howUsed: string | null;
	url: string | null;
	flags: string[];
	entries: string[];
	status: Status;
}

export interface Guide {
	entryId: string;
	title: string;
	url: string;
}

export interface Catalogue {
	drawers: Drawer[];
	entries: Entry[];
	projects: Project[];
	guides: Guide[];
	/** entry id -> calendar year -> number of "I'm using this now" check-ins */
	checkins: Record<string, Record<number, number>>;
	/** Year used for trending windows, taken from the server's clock. */
	currentYear: number;
	/** Today's date (YYYY-MM-DD) on the server, for "Due for review". */
	today: string;
}
