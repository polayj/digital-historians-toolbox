import { fail } from '@sveltejs/kit';
import { checkLinks, linkResults } from '#lib/server/admin.js';
import { fileItem, reopenItem, returnItem } from '#lib/server/filing.js';
import { buildQueue } from '#lib/server/queue.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return { items: await buildQueue() };
};

const LINK_BATCH = 40; // Cloudflare allows about 50 outgoing requests per visit

export const actions: Actions = {
	file: async ({ request, locals }) => {
		const key = String((await request.formData()).get('key') ?? '');
		try {
			await fileItem(key, locals.editor!);
		} catch (e) {
			return fail(400, { key, message: e instanceof Error ? e.message : 'Could not file it.' });
		}
		return { key, message: 'Filed. It’s now on the public site.' };
	},

	return: async ({ request, locals }) => {
		const form = await request.formData();
		const key = String(form.get('key') ?? '');
		const note = String(form.get('note') ?? '').trim();
		if (!note) return fail(400, { key, message: 'Please write a note saying what needs to change.' });
		await returnItem(key, note.slice(0, 2000), locals.editor!);
		return { key, message: 'Returned with your note.' };
	},

	reopen: async ({ request, locals }) => {
		const key = String((await request.formData()).get('key') ?? '');
		await reopenItem(key, locals.editor!);
		return { key, message: 'Moved back to Pending.' };
	},

	checkLinks: async ({ request }) => {
		const form = await request.formData();
		const only = form.getAll('url').map(String);
		let urls = only;
		if (!urls.length) {
			// Pending items' links: never-checked first, then the oldest checks.
			const [items, known] = await Promise.all([buildQueue(), linkResults()]);
			const pending = [...new Set(items.filter((i) => i.status === 'pending').flatMap((i) => i.links.map((l) => l.url)))];
			urls = pending.sort((a, b) => (known.get(a)?.checked_at ?? '').localeCompare(known.get(b)?.checked_at ?? ''));
		}
		const batch = urls.slice(0, LINK_BATCH);
		const results = await checkLinks(batch);
		const broken = results.filter((r) => !r.ok).length;
		return {
			key: only.length ? 'links' : 'all-links',
			message: `Checked ${results.length} ${results.length === 1 ? 'link' : 'links'}${broken ? `; ${broken} need a look` : ''}.${
				urls.length > batch.length ? ` ${urls.length - batch.length} more to check: press the button again.` : ''
			}`
		};
	}
};
