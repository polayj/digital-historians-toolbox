import { env } from 'cloudflare:workers';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = () => {
	return {
		showUnreviewed: env.SHOW_UNREVIEWED === 'true'
	};
};
