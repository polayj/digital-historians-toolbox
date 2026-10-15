import { myCheckins } from '#lib/server/checkins.js';
import { loadCatalogue } from '#lib/server/catalogue.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const [catalogue, mine] = await Promise.all([loadCatalogue(), locals.user ? myCheckins(locals.user.id) : Promise.resolve([])]);
	return { catalogue, myCheckins: mine };
};
