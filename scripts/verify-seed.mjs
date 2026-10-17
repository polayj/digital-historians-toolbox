// Checks the database against the seed files: counts, statuses, and that the admin-only
// material (research notes, editor_notes, flags, "UNVERIFIED" markers) came through unchanged.
//
//   npm run db:verify:local
//   npm run db:verify:remote
import { isDeepStrictEqual } from 'node:util';
import { query, targetFromArgs } from './lib/d1.mjs';
import { SEED_ID, loadSeed } from './lib/seed-data.mjs';

const target = targetFromArgs();
const seed = loadSeed();
const failures = [];
const passes = [];

function check(label, actual, expected) {
	if (isDeepStrictEqual(actual, expected)) passes.push(`${label}: ${JSON.stringify(actual)}`);
	else failures.push(`${label}: expected ${JSON.stringify(expected)}, found ${JSON.stringify(actual)}`);
}

const one = (sql) => Object.values(query(sql, target)[0] ?? {})[0];

// Counts
check('entries', one('SELECT COUNT(*) FROM entries'), seed.entries.length);
check('tools', one("SELECT COUNT(*) FROM entries WHERE type = 'tool'"), seed.entries.filter((e) => e.type === 'tool').length);
check('datasets', one("SELECT COUNT(*) FROM entries WHERE type = 'dataset'"), seed.entries.filter((e) => e.type === 'dataset').length);
check('projects', one('SELECT COUNT(*) FROM projects'), seed.projects.length);
check('links', one('SELECT COUNT(*) FROM project_entries'), seed.links.length);
check('guides', one('SELECT COUNT(*) FROM guides'), seed.guides.length);
check('drawers', one('SELECT COUNT(*) FROM drawers'), seed.taxonomy.drawers.length);
check('sub-drawer tabs', one('SELECT COUNT(*) FROM subdrawers'), seed.taxonomy.drawers.reduce((n, d) => n + d.subdrawers.length, 0));
check('entry–drawer links', one('SELECT COUNT(*) FROM entry_drawers'), seed.entries.reduce((n, e) => n + e.drawers.length, 0));
check('seed logged', one(`SELECT COUNT(*) FROM seed_log WHERE seed_id = '${SEED_ID}'`), 1);
check('history records', one("SELECT COUNT(*) FROM edit_history WHERE action = 'seeded'"), seed.entries.length + seed.projects.length);

// Everything waits for review
check('entries not needs_review', one("SELECT COUNT(*) FROM entries WHERE status <> 'needs_review'"), 0);
check('projects not needs_review', one("SELECT COUNT(*) FROM projects WHERE status <> 'needs_review'"), 0);
check('guides not needs_review', one("SELECT COUNT(*) FROM guides WHERE status <> 'needs_review'"), 0);

// Entries: card text and admin-only research, field by field
const dbEntries = new Map(query('SELECT * FROM entries', target).map((r) => [r.id, r]));
let entryMismatches = 0;
for (const e of seed.entries) {
	const r = dbEntries.get(e.id);
	const same =
		r &&
		r.name === e.name &&
		r.type === e.type &&
		r.catalogue_number === e.catalogue_number &&
		r.ai === (e.ai ? 1 : 0) &&
		r.description === e.card.description &&
		r.last_updated === e.last_updated &&
		isDeepStrictEqual(JSON.parse(r.facts), e.card.facts) &&
		isDeepStrictEqual(JSON.parse(r.notes), e.card.notes) &&
		isDeepStrictEqual(JSON.parse(r.research), e.research);
	if (!same) {
		entryMismatches++;
		failures.push(`entry ${e.id} differs from the seed file`);
	}
}
check('entries identical to seed', entryMismatches, 0);

// Projects: editor_notes and flags exactly as given
const dbProjects = new Map(query('SELECT * FROM projects', target).map((r) => [r.id, r]));
let projectMismatches = 0;
for (const p of seed.projects) {
	const r = dbProjects.get(p.id);
	const same =
		r &&
		r.title === p.title &&
		r.year === p.year &&
		r.kind === p.kind &&
		r.url === p.url &&
		r.editor_notes === (p.editor_notes ?? '') &&
		isDeepStrictEqual(JSON.parse(r.flags), p.flags ?? []);
	if (!same) {
		projectMismatches++;
		failures.push(`project ${p.id} differs from the seed file`);
	}
}
check('projects identical to seed', projectMismatches, 0);

// The specific things that must never be lost
const countUnverified = (text) => (text.match(/UNVERIFIED/gi) ?? []).length;
const seedUnverified = countUnverified(JSON.stringify(seed.entries) + JSON.stringify(seed.projects));
const dbUnverified = countUnverified(
	[...dbEntries.values()].map((r) => r.research + r.facts + r.notes + r.description).join('') +
		[...dbProjects.values()].map((r) => r.editor_notes + r.how_used + r.title).join('')
);
check('"UNVERIFIED" markers', dbUnverified, seedUnverified);
check(
	'projects with editor_notes',
	[...dbProjects.values()].filter((r) => r.editor_notes).length,
	seed.projects.filter((p) => p.editor_notes).length
);
check(
	'flagged projects',
	[...dbProjects.values()].filter((r) => JSON.parse(r.flags).length).map((r) => r.id).sort(),
	seed.projects.filter((p) => (p.flags ?? []).length).map((p) => p.id).sort()
);

// Guides: the same titles (including any updated by a later batch)
const dbGuides = new Map(query('SELECT entry_id, url, title FROM guides', target).map((g) => [`${g.entry_id}|${g.url}`, g.title]));
check('guides identical to seed', seed.guides.filter((g) => dbGuides.get(`${g.entry_id}|${g.url}`) !== g.title).length, 0);

// Links: the exact same set of edges
const dbLinks = query('SELECT project_id, entry_id FROM project_entries', target).map((r) => `${r.project_id}|${r.entry_id}`).sort();
check('link set identical', isDeepStrictEqual(dbLinks, seed.links.map((l) => `${l.project_id}|${l.entry_id}`).sort()), true);

console.log(passes.map((p) => '  ok  ' + p).join('\n'));
if (failures.length) {
	console.error('\n' + failures.map((f) => '  FAIL ' + f).join('\n'));
	process.exit(1);
}
console.log(`\nAll ${passes.length} checks passed.`);
