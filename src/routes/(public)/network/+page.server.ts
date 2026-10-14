import { loadCatalogue } from '#lib/server/catalogue.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return { catalogue: await loadCatalogue() };
};
