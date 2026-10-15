// Downloads the approved catalogue from the live site into data/, checking it first.
// Run nightly by .github/workflows/nightly-export.yml; can also be run by hand:
//
//   SITE_URL=https://digital-historians-toolbox.polayjacob.workers.dev node scripts/fetch-export.mjs
//
// It refuses to write anything (and exits with an error) if the files look wrong: not valid,
// containing editor-only fields or unapproved records, links that don't match, or a sudden
// large drop in the number of cards (which would more likely be a fault than real deletions).
import fs from 'node:fs';
import path from 'node:path';

const FILES = ['entries.json', 'projects.json', 'links.csv', 'guides.json', 'taxonomy.json'];
const DATA_DIR = path.resolve(import.meta.dirname, '..', 'data');
const MAX_SHRINK = 0.2; // refuse if more than 20% of cards would disappear at once

const site = (process.env.SITE_URL ?? '').replace(/\/+$/, '');
if (!site) {
	console.log('SITE_URL is not set yet (GitHub: Settings → Secrets and variables → Actions → Variables). Skipping the export.');
	process.exit(0);
}

const problems = [];
const fetched = {};
for (const file of FILES) {
	const res = await fetch(`${site}/export/${file}`, { headers: { 'user-agent': 'toolbox-nightly-export' } });
	if (!res.ok) {
		problems.push(`${file}: the site answered ${res.status}`);
		continue;
	}
	fetched[file] = await res.text();
}

const parse = (file) => {
	try {
		return JSON.parse(fetched[file]);
	} catch {
		problems.push(`${file}: not valid JSON`);
		return null;
	}
};

if (!problems.length) {
	const entries = parse('entries.json');
	const projects = parse('projects.json');
	const guides = parse('guides.json');
	const taxonomy = parse('taxonomy.json');

	if (entries && projects && guides && taxonomy) {
		if (!Array.isArray(entries) || !Array.isArray(projects) || !Array.isArray(guides) || !Array.isArray(taxonomy.drawers)) {
			problems.push('A file does not have the expected shape.');
		} else {
			for (const e of entries) {
				if (e.status !== 'approved') problems.push(`entry ${e.id} is not approved`);
				if ('research' in e) problems.push(`entry ${e.id} includes editor-only research notes`);
			}
			for (const p of projects) {
				if (p.status !== 'approved') problems.push(`project ${p.id} is not approved`);
				if ('editor_notes' in p) problems.push(`project ${p.id} includes editor notes`);
			}
			const entryIds = new Set(entries.map((e) => e.id));
			const fromProjects = new Set(projects.flatMap((p) => p.entries.map((e) => `${p.id}|${e}`)));
			const csvRows = fetched['links.csv'].trim().split(/\r?\n/).slice(1).map((l) => l.split(',').slice(0, 2).join('|'));
			for (const row of csvRows) if (!fromProjects.has(row)) problems.push(`links.csv row ${row} is not in projects.json`);
			if (csvRows.length !== fromProjects.size) problems.push('links.csv and projects.json disagree');
			for (const p of projects) for (const id of p.entries) if (!entryIds.has(id)) problems.push(`project ${p.id} links to unknown card ${id}`);
			for (const g of guides) if (!entryIds.has(g.entry_id)) problems.push(`a guide points to unknown card ${g.entry_id}`);

			const previousFile = path.join(DATA_DIR, 'entries.json');
			if (fs.existsSync(previousFile)) {
				const before = JSON.parse(fs.readFileSync(previousFile, 'utf8')).length;
				if (before > 0 && entries.length < before * (1 - MAX_SHRINK) && process.env.ALLOW_SHRINK !== 'yes') {
					problems.push(
						`Cards would drop from ${before} to ${entries.length}. If that is intended, run the workflow by hand with ALLOW_SHRINK=yes.`
					);
				}
			}
			if (!problems.length) {
				console.log(`Fetched ${entries.length} cards, ${projects.length} projects, ${csvRows.length} links, ${guides.length} guides.`);
			}
		}
	}
}

if (problems.length) {
	console.error('Not writing anything, because:\n- ' + problems.slice(0, 30).join('\n- '));
	process.exit(1);
}

fs.mkdirSync(DATA_DIR, { recursive: true });
for (const file of FILES) fs.writeFileSync(path.join(DATA_DIR, file), fetched[file], 'utf8');
console.log(`Wrote ${FILES.length} files to data/.`);
