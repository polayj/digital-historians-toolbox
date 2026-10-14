// Small helpers for talking to the D1 database through Wrangler, Cloudflare's command-line tool.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const WRANGLER = path.join(path.dirname(require.resolve('wrangler/package.json')), 'bin', 'wrangler.js');

export const DATABASE = 'toolbox';

/** Reads --local / --remote from the command line. Defaults to --local so nothing live is touched by accident. */
export function targetFromArgs(argv = process.argv) {
	if (argv.includes('--remote') && argv.includes('--local')) {
		throw new Error('Choose either --local or --remote, not both.');
	}
	return argv.includes('--remote') ? '--remote' : '--local';
}

function run(args, { json = false } = {}) {
	const result = spawnSync(process.execPath, [WRANGLER, ...args], {
		encoding: 'utf8',
		maxBuffer: 64 * 1024 * 1024,
		stdio: json ? ['ignore', 'pipe', 'pipe'] : 'inherit'
	});
	if (result.status !== 0) {
		if (json) process.stderr.write(result.stdout + result.stderr);
		throw new Error(`wrangler ${args.slice(0, 3).join(' ')} failed (exit ${result.status})`);
	}
	return result.stdout;
}

/** Runs an SQL file against the database. Returns the number of statements run. */
export function executeFile(file, target) {
	const out = run(['d1', 'execute', DATABASE, target, `--file=${file}`, '--yes', '--json'], { json: true });
	return JSON.parse(out.slice(out.indexOf('['))).length;
}

/** Runs one SQL query and returns its rows. */
export function query(sql, target) {
	const out = run(['d1', 'execute', DATABASE, target, '--json', `--command=${sql}`], { json: true });
	const parsed = JSON.parse(out.slice(out.indexOf('[')));
	return parsed.flatMap((r) => r.results ?? []);
}
