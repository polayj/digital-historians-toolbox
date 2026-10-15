// "I'm using this now": one check-in per signed-in historian, per card, per calendar year.
// Only counts are ever shown publicly, never who checked in.
import { env } from 'cloudflare:workers';
import { visibleStatuses } from './catalogue';

export const thisYear = () => new Date().getUTCFullYear();

/** Records a check-in. Returns false if the card doesn't exist (or isn't shown). */
export async function recordCheckin(userId: number, entryId: string): Promise<{ ok: boolean; already: boolean }> {
	const statuses = visibleStatuses();
	const entry = await env.DB.prepare(`SELECT id FROM entries WHERE id = ? AND status IN (${statuses.map(() => '?').join(', ')})`)
		.bind(entryId, ...statuses)
		.first();
	if (!entry) return { ok: false, already: false };
	const result = await env.DB.prepare('INSERT OR IGNORE INTO checkins (user_id, entry_id, year) VALUES (?, ?, ?)')
		.bind(userId, entryId, thisYear())
		.run();
	return { ok: true, already: (result.meta.changes ?? 0) === 0 };
}

/** The cards this person has checked in to this year. */
export async function myCheckins(userId: number): Promise<string[]> {
	const { results } = await env.DB.prepare('SELECT entry_id FROM checkins WHERE user_id = ? AND year = ?')
		.bind(userId, thisYear())
		.all<{ entry_id: string }>();
	return results.map((r) => r.entry_id);
}
