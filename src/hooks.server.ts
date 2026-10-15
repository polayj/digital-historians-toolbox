import { error } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { dev } from '$app/env';
import { env } from 'cloudflare:workers';
import { verifyAccessToken } from '#lib/server/access.js';

/**
 * Every /admin request must carry a valid Cloudflare Access pass. Fails closed: if Access
 * isn't configured, nobody gets in. On your own computer (`npm run dev`) only, DEV_ADMIN_EMAIL
 * in .dev.vars stands in for the Access sign-in.
 */
export const handle: Handle = async ({ event, resolve }) => {
	if (event.url.pathname === '/admin' || event.url.pathname.startsWith('/admin/')) {
		event.locals.editor = await identifyEditor(event.request);
	}
	return resolve(event);
};

async function identifyEditor(request: Request): Promise<string> {
	if (dev && env.DEV_ADMIN_EMAIL) return env.DEV_ADMIN_EMAIL;

	const team = env.ACCESS_TEAM_DOMAIN;
	const audience = env.ACCESS_AUD;
	if (!team || !audience) error(403, 'The editor’s desk is not set up yet: Cloudflare Access has not been configured.');

	const token = request.headers.get('cf-access-jwt-assertion');
	if (!token) error(403, 'Please sign in through Cloudflare Access to use the editor’s desk.');
	try {
		return await verifyAccessToken(token, { teamDomain: team, audience });
	} catch {
		error(403, 'Your Cloudflare Access sign-in could not be confirmed. Please sign in again.');
	}
}
