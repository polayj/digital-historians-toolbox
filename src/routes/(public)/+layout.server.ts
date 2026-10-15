import { env } from 'cloudflare:workers';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
	return {
		showUnreviewed: env.SHOW_UNREVIEWED === 'true',
		// Only the name and iD of a historian signed in with ORCID; nothing else about them.
		user: locals.user ? { name: locals.user.name, orcid: locals.user.orcid } : null
	};
};
