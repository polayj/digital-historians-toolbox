// Reads the seed files in seed/ and checks they hang together before anything is loaded.
import fs from 'node:fs';
import path from 'node:path';

// SEED_DIR can point elsewhere, e.g. at a copy of the last committed seed while research is in progress.
export const SEED_DIR = process.env.SEED_DIR ? path.resolve(process.env.SEED_DIR) : path.resolve(import.meta.dirname, '..', '..', 'seed');

/** Identifies this batch of seed data. Changing it lets a new batch load once. */
export const SEED_ID = '2026-10-14';

const readJson = (name) => JSON.parse(fs.readFileSync(path.join(SEED_DIR, name), 'utf8'));

/** Minimal CSV reader for links.csv (no quoted commas in this file). */
function readCsv(name) {
	const [header, ...lines] = fs
		.readFileSync(path.join(SEED_DIR, name), 'utf8')
		.replace(/^﻿/, '')
		.split(/\r?\n/)
		.filter((l) => l.trim() !== '');
	const cols = header.split(',');
	return lines.map((line) => {
		const cells = line.split(',');
		return Object.fromEntries(cols.map((c, i) => [c.trim(), (cells[i] ?? '').trim()]));
	});
}

export function loadSeed() {
	const entries = readJson('entries.json');
	const projects = readJson('projects.json');
	const guides = readJson('guides.json');
	const taxonomy = readJson('taxonomy.json');
	const { _source, ...subdrawerBlurbs } = readJson('subdrawer_blurbs.json');
	const links = readCsv('links.csv');
	return { entries, projects, guides, taxonomy, subdrawerBlurbs, links };
}

/** Returns a list of problems; empty means the seed is consistent. */
export function validateSeed({ entries, projects, guides, taxonomy, links }) {
	const problems = [];
	const entryIds = new Set(entries.map((e) => e.id));
	const projectKinds = new Map(projects.map((p) => [p.id, p.kind]));
	const drawerIds = new Set(taxonomy.drawers.map((d) => d.id));
	const subIds = new Set(taxonomy.drawers.flatMap((d) => d.subdrawers.map((s) => s.id)));

	const dupes = (list) => list.filter((x, i) => list.indexOf(x) !== i);
	for (const d of dupes(entries.map((e) => e.id))) problems.push(`duplicate entry id ${d}`);
	for (const d of dupes(entries.map((e) => e.catalogue_number))) problems.push(`duplicate catalogue number ${d}`);
	for (const d of dupes(projects.map((p) => p.id))) problems.push(`duplicate project id ${d}`);

	for (const e of entries) {
		if (!['tool', 'dataset'].includes(e.type)) problems.push(`${e.id}: unknown type ${e.type}`);
		for (const d of e.drawers) if (!drawerIds.has(d)) problems.push(`${e.id}: unknown drawer ${d}`);
		for (const s of e.subdrawers) if (!subIds.has(s)) problems.push(`${e.id}: unknown sub-drawer ${s}`);
	}
	for (const p of projects) {
		if (!['research', 'corpus_building', 'evaluation'].includes(p.kind)) problems.push(`${p.id}: unknown kind ${p.kind}`);
	}

	const linkKeys = links.map((l) => `${l.project_id}|${l.entry_id}`);
	for (const d of dupes(linkKeys)) problems.push(`duplicate link ${d}`);
	for (const l of links) {
		if (!entryIds.has(l.entry_id)) problems.push(`link to unknown entry ${l.entry_id}`);
		if (!projectKinds.has(l.project_id)) problems.push(`link from unknown project ${l.project_id}`);
		else if (l.kind && projectKinds.get(l.project_id) !== l.kind) {
			problems.push(`link ${l.project_id}|${l.entry_id}: kind ${l.kind} differs from project kind`);
		}
	}
	// links.csv and projects[].entries must describe the same edges.
	const fromProjects = new Set(projects.flatMap((p) => p.entries.map((e) => `${p.id}|${e}`)));
	for (const k of linkKeys) if (!fromProjects.has(k)) problems.push(`link ${k} is in links.csv but not projects.json`);
	for (const k of fromProjects) if (!linkKeys.includes(k)) problems.push(`link ${k} is in projects.json but not links.csv`);

	for (const g of guides) if (!entryIds.has(g.entry_id)) problems.push(`guide for unknown entry ${g.entry_id}`);
	return problems;
}

// ---------------------------------------------------------------------------
// Derived values
// ---------------------------------------------------------------------------

/** Last 4-digit year in a string like '2000–', 'c. 2011', '2018–2019'. NULL for 'n.d.'. */
export function yearSort(year) {
	const all = String(year ?? '').match(/\d{4}/g);
	return all ? Number(all[all.length - 1]) : null;
}

const fact = (entry, key) => entry.card.facts.find((f) => f.k === key)?.v ?? '';

/**
 * Filter categories worked out from the card's facts. These are a first guess for the
 * search filters; editors can correct any of them in admin.
 */
export function deriveFilters(entry) {
	const cost = fact(entry, 'Cost');
	const startsFree = /^\s*free\b/i.test(cost);
	const mentionsPaid = /[$€£]|\bpaid\b|\/yr\b/i.test(cost);
	const cost_band = startsFree && mentionsPaid ? 'freemium' : mentionsPaid ? 'paid' : startsFree ? 'free' : null;

	if (entry.type !== 'tool') return { cost_band, skill_level: null, runs_locally: null };

	const skill = fact(entry, 'Skill');
	const skill_level = /^no code/i.test(skill)
		? 'no_code'
		: /^some code/i.test(skill)
			? 'some_code'
			: /^programming/i.test(skill)
				? 'programming'
				: null;

	// "Runs locally" = you can run it on your own computer or your own server.
	const runs = fact(entry, 'Runs');
	const runs_locally = /own machine|own GPU|desktop|local|self-host/i.test(runs) ? 1 : 0;

	return { cost_band, skill_level, runs_locally };
}
