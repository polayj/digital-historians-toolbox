import { error } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import type { PageServerLoad } from './$types';

// Full version history for editors: every change with its old and new values (including
// editor-only fields) and who made it.
export const load: PageServerLoad = async ({ params }) => {
	const table = { entry: 'entries', project: 'projects' }[params.type];
	if (!table) error(404, 'Not found');
	const record = await env.DB.prepare(`SELECT id, ${table === 'entries' ? 'name' : 'title AS name'} FROM ${table} WHERE id = ?`)
		.bind(params.id)
		.first<{ id: string; name: string }>();
	if (!record) error(404, 'Not found');

	const { results } = await env.DB.prepare(
		`SELECT id, action, changes, editor, note, created_at FROM edit_history
		 WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC, id DESC`
	)
		.bind(params.type, params.id)
		.all<{ id: number; action: string; changes: string; editor: string | null; note: string | null; created_at: string }>();

	const show = (v: unknown) => (v === null || v === undefined || v === '' ? '(empty)' : typeof v === 'string' ? v : JSON.stringify(v, null, 2));
	return {
		type: params.type,
		record,
		history: results.map((h) => {
			let changes: Record<string, { from: unknown; to: unknown }> = {};
			try {
				changes = JSON.parse(h.changes);
			} catch {
				changes = {};
			}
			return {
				id: h.id,
				action: h.action,
				editor: h.editor,
				note: h.note,
				at: h.created_at.replace('T', ' ').replace('Z', ' UTC'),
				changes: Object.entries(changes).map(([field, c]) => ({ field, from: show(c.from), to: show(c.to) }))
			};
		})
	};
};
