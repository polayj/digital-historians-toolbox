import { error } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import { visibleStatuses } from '#lib/server/catalogue.js';
import type { PageServerLoad } from './$types';

// Public version history. Shows what happened and which public fields changed, never
// admin-only values or editors' email addresses.
const ADMIN_ONLY_FIELDS = new Set(['research', 'editor_notes', 'review_note', 'submitter_email']);

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
				fields = Object.keys(JSON.parse(h.changes)).filter((f) => !ADMIN_ONLY_FIELDS.has(f));
			} catch {
				fields = [];
			}
			return { action: h.action, fields, note: h.action === 'seeded' ? h.note : null, date: h.created_at.slice(0, 10) };
		})
	};
};
