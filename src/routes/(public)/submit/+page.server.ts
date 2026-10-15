import { fail } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import { visibleStatuses } from '#lib/server/catalogue.js';
import { passedTurnstile } from '#lib/server/turnstile.js';
import { validateSubmission } from '#lib/submissions.js';
import type { Actions, PageServerLoad } from './$types';

async function options() {
	const statuses = visibleStatuses();
	const [entries, drawers] = await env.DB.batch([
		env.DB.prepare(
			`SELECT id, name, type FROM entries WHERE status IN (${statuses.map(() => '?').join(', ')}) ORDER BY name COLLATE NOCASE`
		).bind(...statuses),
		env.DB.prepare('SELECT id, label FROM drawers ORDER BY position')
	]);
	return {
		entries: (entries.results ?? []) as { id: string; name: string; type: 'tool' | 'dataset' }[],
		drawers: (drawers.results ?? []) as { id: string; label: string }[]
	};
}

export const load: PageServerLoad = async () => {
	// Submissions need Turnstile switched on (a secret key); until then the page says so.
	return { ...(await options()), siteKey: env.TURNSTILE_SITE_KEY, open: !!env.TURNSTILE_SECRET_KEY };
};

export const actions: Actions = {
	default: async ({ request }) => {
		if (!env.TURNSTILE_SECRET_KEY) {
			return fail(503, { values: {}, errors: { turnstile: 'Submissions aren’t open yet on this site. Please try again later.' } });
		}
		const form = await request.formData();
		const values = Object.fromEntries(
			[...new Set(form.keys())]
				.filter((k) => !k.startsWith('cf-turnstile'))
				.map((k) => [k, form.getAll(k).length > 1 ? form.getAll(k).map(String) : String(form.get(k))])
		);

		const passed = await passedTurnstile(String(form.get('cf-turnstile-response') ?? ''), request.headers.get('cf-connecting-ip'));
		if (!passed) {
			return fail(400, { values, errors: { turnstile: 'The “are you human?” check didn’t go through. Please try it again.' } });
		}

		const { entries, drawers } = await options();
		const result = validateSubmission(form, {
			entryIds: new Set(entries.map((e) => e.id)),
			drawerIds: new Set(drawers.map((d) => d.id))
		});
		if (!result.ok) return fail(400, { values, errors: result.errors });

		const s = result.submission;
		await env.DB.prepare(
			`INSERT INTO submissions (type, payload, submitter_name, submitter_email, target_entry_id, status)
			 VALUES (?, ?, ?, ?, ?, 'pending')`
		)
			.bind(s.type, JSON.stringify(s.payload), s.submitterName || null, s.submitterEmail, s.targetEntryId)
			.run();

		return { sent: true, type: s.type };
	}
};
