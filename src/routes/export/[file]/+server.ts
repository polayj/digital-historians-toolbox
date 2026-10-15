// The public data files: approved records only, in the same shape as the seed files and without
// editor-only fields. The nightly GitHub Action copies these into data/ in the public repository.
import { error } from '@sveltejs/kit';
import { EXPORT_FILES, entriesFile, guidesFile, linksFile, projectsFile, taxonomyFile, type ExportFile } from '#lib/exportFormat.js';
import { loadCatalogue } from '#lib/server/catalogue.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const file = params.file as ExportFile;
	if (!EXPORT_FILES.includes(file)) error(404, 'Not found');

	const cat = await loadCatalogue({ approvedOnly: true });
	const body =
		file === 'entries.json'
			? entriesFile(cat.entries)
			: file === 'projects.json'
				? projectsFile(cat.projects)
				: file === 'links.csv'
					? linksFile(cat.projects)
					: file === 'guides.json'
						? guidesFile(cat.guides)
						: taxonomyFile(cat.drawers);

	return new Response(body, {
		headers: {
			'content-type': file.endsWith('.csv') ? 'text/csv; charset=utf-8' : 'application/json; charset=utf-8',
			'cache-control': 'public, max-age=300',
			'x-robots-tag': 'noindex'
		}
	});
};
