import { redirect } from '@sveltejs/kit';
import { safeReturnPath } from '#lib/server/orcid.js';
import { requireSameOrigin } from '#lib/server/origin.js';
import { signOut } from '#lib/server/session.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies, url }) => {
	requireSameOrigin(request, url);
	const form = await request.formData();
	await signOut(cookies);
	redirect(303, safeReturnPath(String(form.get('return') ?? '/')));
};
