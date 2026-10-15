import { allEntries, allProjects } from '#lib/server/admin.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [entries, projects] = await Promise.all([allEntries(), allProjects()]);
	return {
		entries: entries.map((e) => ({ id: e.id, name: e.name, type: e.type, no: e.catalogueNumber, status: e.status, lastUpdated: e.lastUpdated })),
		projects: projects.map((p) => ({ id: p.id, name: p.shortTitle ?? p.title, kind: p.kind, year: p.year, status: p.status, lastUpdated: p.lastUpdated }))
	};
};
