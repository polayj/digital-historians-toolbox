// Starts "Sign in with ORCID". ?return=<page>&checkin=<card id> brings the visitor back to the
// card afterwards and records their check-in.
import { redirect } from '@sveltejs/kit';
import { dev } from '$app/env';
import { env } from 'cloudflare:workers';
import { recordCheckin } from '#lib/server/checkins.js';
import { authorizeUrl, safeReturnPath } from '#lib/server/orcid.js';
import { randomToken, signIn } from '#lib/server/session.js';
import type { RequestHandler } from './$types';

const STATE_COOKIE = 'toolbox_orcid_state';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const back = safeReturnPath(url.searchParams.get('return'));
	const checkin = url.searchParams.get('checkin');

	// On your own computer only: sign in as ORCID's fictional test researcher, without contacting ORCID.
	if (dev && env.DEV_ORCID_ID) {
		const user = await signIn(cookies, env.DEV_ORCID_ID, env.DEV_ORCID_NAME || null, false);
		if (checkin) await recordCheckin(user.id, checkin);
		redirect(303, back);
	}

	if (!env.ORCID_CLIENT_ID || !env.ORCID_CLIENT_SECRET) {
		const to = new URL(back, url.origin);
		to.searchParams.set('signin', 'unavailable');
		redirect(303, to.pathname + to.search);
	}

	const state = randomToken(16);
	cookies.set(STATE_COOKIE, JSON.stringify({ state, back, checkin }), {
		path: '/auth/orcid',
		httpOnly: true,
		sameSite: 'lax',
		secure: url.protocol === 'https:',
		maxAge: 600
	});
	const config = { base: env.ORCID_BASE || 'https://orcid.org', clientId: env.ORCID_CLIENT_ID, clientSecret: env.ORCID_CLIENT_SECRET };
	redirect(303, authorizeUrl(config, `${url.origin}/auth/orcid/callback`, state));
};
