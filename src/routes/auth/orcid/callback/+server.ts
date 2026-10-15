// ORCID sends the visitor back here after they sign in (or cancel).
import { redirect } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';
import { recordCheckin } from '#lib/server/checkins.js';
import { exchangeCode, safeReturnPath } from '#lib/server/orcid.js';
import { signIn } from '#lib/server/session.js';
import type { RequestHandler } from './$types';

const STATE_COOKIE = 'toolbox_orcid_state';

export const GET: RequestHandler = async ({ url, cookies }) => {
	let saved: { state?: string; back?: string; checkin?: string | null } = {};
	try {
		saved = JSON.parse(cookies.get(STATE_COOKIE) ?? '{}');
	} catch {
		saved = {};
	}
	cookies.delete(STATE_COOKIE, { path: '/auth/orcid' });
	const back = safeReturnPath(saved.back);
	const fail = (reason: string) => {
		const to = new URL(back, url.origin);
		to.searchParams.set('signin', reason);
		redirect(303, to.pathname + to.search);
	};

	if (url.searchParams.get('error')) fail('cancelled');
	// The state must match the one we set, so nobody can trick a visitor into signing in as someone else.
	if (!saved.state || url.searchParams.get('state') !== saved.state) fail('expired');
	const code = url.searchParams.get('code');
	if (!code || !env.ORCID_CLIENT_ID || !env.ORCID_CLIENT_SECRET) fail('failed');

	let person: { orcid: string; name: string | null };
	try {
		person = await exchangeCode(
			{ base: env.ORCID_BASE || 'https://orcid.org', clientId: env.ORCID_CLIENT_ID, clientSecret: env.ORCID_CLIENT_SECRET },
			code!,
			`${url.origin}/auth/orcid/callback`
		);
	} catch {
		fail('failed');
	}
	const user = await signIn(cookies, person!.orcid, person!.name, url.protocol === 'https:');
	if (saved.checkin) await recordCheckin(user.id, saved.checkin);
	redirect(303, back);
};
