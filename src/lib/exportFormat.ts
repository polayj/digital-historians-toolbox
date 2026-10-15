// Turns approved records into the public data files, in the same shape as the seed files
// (seed/entries.json, projects.json, links.csv, guides.json, taxonomy.json), minus the
// editor-only fields: entries' `research` notes and projects' `editor_notes`.
import { KIND_DEFINITIONS } from './format';
import type { Drawer, Entry, Guide, Project } from './types';

export const EXPORT_FILES = ['entries.json', 'projects.json', 'links.csv', 'guides.json', 'taxonomy.json'] as const;
export type ExportFile = (typeof EXPORT_FILES)[number];

/** Pretty JSON with a final newline, so line-by-line changes are easy to read on GitHub. */
const pretty = (value: unknown) => JSON.stringify(value, null, 2) + '\n';

export function entriesFile(entries: Entry[]): string {
	return pretty(
		entries
			.slice()
			.sort((a, b) => a.catalogueNumber.localeCompare(b.catalogueNumber))
			.map((e) => ({
				id: e.id,
				type: e.type,
				catalogue_number: e.catalogueNumber,
				name: e.name,
				ai: e.ai,
				drawers: e.drawers,
				subdrawers: e.subdrawers,
				website: e.website,
				release_year: e.releaseYear,
				card: { description: e.description, facts: e.facts, notes: e.notes },
				filters: { cost: e.costBand, skill: e.skillLevel, runs_locally: e.runsLocally },
				status: e.status,
				last_updated: e.lastUpdated,
				...(e.submittedBy ? { suggested_by: e.submittedBy } : {})
			}))
	);
}

export function projectsFile(projects: Project[]): string {
	return pretty(
		projects
			.slice()
			.sort((a, b) => a.id.localeCompare(b.id))
			.map((p) => ({
				id: p.id,
				title: p.title,
				short_title: p.shortTitle,
				year: p.year,
				who: p.who,
				kind: p.kind,
				entries: p.entries,
				how_used: p.howUsed,
				url: p.url,
				flags: p.flags,
				status: p.status
			}))
	);
}

/** A CSV cell, quoted when it contains a comma, quote or line break. */
export function csvCell(value: string): string {
	return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function linksFile(projects: Project[]): string {
	const rows = projects
		.slice()
		.sort((a, b) => a.id.localeCompare(b.id))
		.flatMap((p) => p.entries.map((e) => [p.id, e, p.kind].map(csvCell).join(',')));
	return ['project_id,entry_id,kind', ...rows].join('\n') + '\n';
}

export function guidesFile(guides: Guide[]): string {
	return pretty(guides.map((g) => ({ entry_id: g.entryId, title: g.title, url: g.url })));
}

export function taxonomyFile(drawers: Drawer[]): string {
	return pretty({
		drawers: drawers.map((d) => ({
			id: d.id,
			number: d.number,
			label: d.label,
			blurb: d.blurb,
			subdrawers: d.subdrawers.map((s) => ({ id: s.id, label: s.label, ...(s.blurb ? { blurb: s.blurb } : {}) }))
		})),
		project_kinds: KIND_DEFINITIONS
	});
}
