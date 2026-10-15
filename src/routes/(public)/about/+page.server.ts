import { env } from 'cloudflare:workers';
import { visibleStatuses } from '#lib/server/catalogue.js';
import { latestRelease } from '#lib/server/zenodo.js';
import { ZENODO_CONCEPT_DOI } from '#lib/site.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const statuses = visibleStatuses();
	const inStatuses = `(${statuses.map(() => '?').join(', ')})`;
	const [counts, release] = await Promise.all([
		env.DB.prepare(
			`SELECT
			   (SELECT COUNT(*) FROM entries WHERE type = 'tool' AND status IN ${inStatuses}) AS tools,
			   (SELECT COUNT(*) FROM entries WHERE type = 'dataset' AND status IN ${inStatuses}) AS datasets,
			   (SELECT COUNT(*) FROM projects WHERE status IN ${inStatuses}) AS projects`
		)
			.bind(...statuses, ...statuses, ...statuses)
			.first<{ tools: number; datasets: number; projects: number }>(),
		ZENODO_CONCEPT_DOI ? latestRelease(ZENODO_CONCEPT_DOI) : Promise.resolve(null)
	]);
	return { counts: counts ?? { tools: 0, datasets: 0, projects: 0 }, release };
};
