import { error } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import { visibleStatuses } from '#lib/server/catalogue.js';
import type { PageServerLoad } from './$types';

// Public version history. Shows what happened and which public fields changed, never
// admin-only values or editors' email addresses.
const ADMIN_ONLY_FIELDS = new Set(['research', 'editorNotes', 'editor_notes', 'reviewNote', 'review_note', 'submitterEmail', 'submitter_email', 'status']);

// Plain-English names for the fields editors can change.
const FIELD_LABELS: Record<string, string> = {
	name: 'name', type: 'type', catalogueNumber: 'catalogue number', ai: 'AI badge', website: 'website',
	releaseYear: 'release year', description: 'description', facts: 'facts', notes: 'historian’s notes',
	drawers: 'drawers', subdrawers: 'guide cards', costBand: 'cost', skillLevel: 'skill level', runsLocally: 'runs locally',
	title: 'title', shortTitle: 'short title', year: 'year', who: 'who', kind: 'kind', howUsed: 'how it was used',
	url: 'link', flags: 'tags', verified: 'link check date', entries: 'linked cards'
};

const TABLES = { entry: 'entries', project: 'projects' } as const;

export const load: PageServerLoad = async ({ params }) => {
	const table = TABLES[params.type as keyof typeof TABLES];
	if (!table) error(404, 'Not found');

	const statuses = visibleStatuses();
	const record = await env.DB.prepare(
		`SELECT id, ${table === 'entries' ? 'name' : 'title AS name'}, last_updated FROM ${table}
		 WHERE id = ? AND status IN (${statuses.map(() => '?').join(', ')})`
	)
		.bind(params.id, ...statuses)
		.first<{ id: string; name: string; last_updated: string }>();
	if (!record) error(404, 'Not found');

	const { results } = await env.DB.prepare(
		`SELECT action, changes, note, created_at FROM edit_history
		 WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC, id DESC`
	)
		.bind(params.type, params.id)
		.all<{ action: string; changes: string; note: string | null; created_at: string }>();

	return {
		type: params.type,
		record,
		history: results.map((h) => {
			let fields: string[] = [];
			try {
				fields = Object.keys(JSON.parse(h.changes))
					.filter((f) => !ADMIN_ONLY_FIELDS.has(f))
					.map((f) => FIELD_LABELS[f] ?? f.replace(/_/g, ' '));
			} catch {
				fields = [];
			}
			return { action: h.action, fields, note: h.action === 'seeded' ? h.note : null, date: h.created_at.slice(0, 10) };
		})
	};
};
