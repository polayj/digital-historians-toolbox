// "I'm using this now". Signed-in visitors are counted once per card per calendar year;
// everyone else is sent to sign in with ORCID first, then brought back.
import { json, redirect } from '@sveltejs/kit';
import { recordCheckin } from '#lib/server/checkins.js';
import { requireSameOrigin } from '#lib/server/origin.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals, url }) => {
	requireSameOrigin(request, url);
	const form = await request.formData();
	const entry = String(form.get('entry') ?? '');
	const back = `/?card=${encodeURIComponent(entry)}`;
	const wantsJson = (request.headers.get('accept') ?? '').includes('application/json');

	if (!locals.user) {
		const signin = `/auth/orcid?return=${encodeURIComponent(back)}&checkin=${encodeURIComponent(entry)}`;
		if (wantsJson) return json({ ok: false, signin }, { status: 401 });
		redirect(303, signin);
	}

	const result = await recordCheckin(locals.user.id, entry);
	if (wantsJson) return json(result, { status: result.ok ? 200 : 404 });
	redirect(303, back);
};
