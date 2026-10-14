// Reads the public catalogue from D1.
// Only public columns are selected: research notes, editor_notes and submitter details stay in the database.
import { env } from 'cloudflare:workers';
import type { Catalogue, Drawer, Entry, Guide, Project, Status } from '#lib/types.js';

/** Which statuses the public site shows. The preview also shows records still waiting for review. */
export function visibleStatuses(): Status[] {
	return env.SHOW_UNREVIEWED === 'true' ? ['approved', 'needs_review'] : ['approved'];
}

const placeholders = (n: number) => Array(n).fill('?').join(', ');

const parseJson = <T>(text: string | null, fallback: T): T => {
	try {
		return text ? (JSON.parse(text) as T) : fallback;
	} catch {
		return fallback;
	}
};

export async function loadCatalogue(): Promise<Catalogue> {
	const db = env.DB;
	const statuses = visibleStatuses();
	const inStatuses = `(${placeholders(statuses.length)})`;

	const [drawerRows, subRows, entryRows, entryDrawerRows, entrySubRows, projectRows, linkRows, guideRows, checkinRows] =
		await db.batch([
			db.prepare('SELECT id, number, label, blurb FROM drawers ORDER BY position'),
			db.prepare('SELECT drawer_id, id, label, blurb FROM subdrawers ORDER BY drawer_id, position'),
			db
				.prepare(
					`SELECT id, type, catalogue_number, name, ai, website, release_year, description, facts, notes,
					        cost_band, skill_level, runs_locally, status, last_updated
					 FROM entries WHERE status IN ${inStatuses}`
				)
				.bind(...statuses),
			db.prepare('SELECT entry_id, drawer_id FROM entry_drawers ORDER BY entry_id, position'),
			db.prepare('SELECT entry_id, subdrawer_id FROM entry_subdrawers ORDER BY entry_id, position'),
			db
				.prepare(
					`SELECT id, title, short_title, year, year_sort, who, kind, how_used, url, flags, status
					 FROM projects WHERE status IN ${inStatuses}`
				)
				.bind(...statuses),
			db.prepare('SELECT project_id, entry_id FROM project_entries'),
			db.prepare(`SELECT entry_id, title, url FROM guides WHERE status IN ${inStatuses} ORDER BY id`).bind(...statuses),
			db.prepare('SELECT entry_id, year, COUNT(*) AS n FROM checkins GROUP BY entry_id, year')
		]);

	const rows = <T>(r: D1Result) => (r.results ?? []) as T[];

	const drawers: Drawer[] = rows<{ id: string; number: string; label: string; blurb: string }>(drawerRows).map((d) => ({
		...d,
		subdrawers: rows<{ drawer_id: string; id: string; label: string; blurb: string | null }>(subRows)
			.filter((s) => s.drawer_id === d.id)
			.map(({ id, label, blurb }) => ({ id, label, blurb }))
	}));

	const groupBy = (list: { entry_id: string }[], pick: (r: any) => string) => {
		const map = new Map<string, string[]>();
		for (const r of list) map.set(r.entry_id, [...(map.get(r.entry_id) ?? []), pick(r)]);
		return map;
	};
	const entryDrawers = groupBy(rows(entryDrawerRows), (r) => r.drawer_id);
	const entrySubs = groupBy(rows(entrySubRows), (r) => r.subdrawer_id);

	const entries: Entry[] = rows<any>(entryRows).map((r) => ({
		id: r.id,
		type: r.type,
		catalogueNumber: r.catalogue_number,
		name: r.name,
		ai: r.ai === 1,
		website: r.website,
		releaseYear: r.release_year,
		description: r.description,
		facts: parseJson(r.facts, []),
		notes: parseJson(r.notes, []),
		drawers: entryDrawers.get(r.id) ?? [],
		subdrawers: entrySubs.get(r.id) ?? [],
		costBand: r.cost_band,
		skillLevel: r.skill_level,
		runsLocally: r.runs_locally === null ? null : r.runs_locally === 1,
		status: r.status,
		lastUpdated: r.last_updated
	}));
	const entryIds = new Set(entries.map((e) => e.id));

	// A project only links to entries that are themselves visible.
	const projectEntries = new Map<string, string[]>();
	for (const l of rows<{ project_id: string; entry_id: string }>(linkRows)) {
		if (!entryIds.has(l.entry_id)) continue;
		projectEntries.set(l.project_id, [...(projectEntries.get(l.project_id) ?? []), l.entry_id]);
	}

	const projects: Project[] = rows<any>(projectRows).map((r) => ({
		id: r.id,
		title: r.title,
		shortTitle: r.short_title,
		year: r.year,
		yearSort: r.year_sort,
		who: r.who,
		kind: r.kind,
		howUsed: r.how_used,
		url: r.url,
		flags: parseJson(r.flags, []),
		entries: projectEntries.get(r.id) ?? [],
		status: r.status
	}));

	const guides: Guide[] = rows<any>(guideRows)
		.filter((g) => entryIds.has(g.entry_id))
		.map((g) => ({ entryId: g.entry_id, title: g.title, url: g.url }));

	const checkins: Catalogue['checkins'] = {};
	for (const c of rows<{ entry_id: string; year: number; n: number }>(checkinRows)) {
		(checkins[c.entry_id] ??= {})[c.year] = c.n;
	}

	const now = new Date();
	return {
		drawers,
		entries,
		projects,
		guides,
		checkins,
		currentYear: now.getUTCFullYear(),
		today: now.toISOString().slice(0, 10)
	};
}
