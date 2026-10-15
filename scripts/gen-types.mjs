// Generates worker-configuration.d.ts (the types for Cloudflare settings and the database).
//
// For a Worker, Wrangler also adds a line pointing at the *built* site, which would make the
// type checker inspect generated code after every build. The site never uses that line, so it
// is replaced with a neutral type.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const wrangler = path.join(path.dirname(require.resolve('wrangler/package.json')), 'bin', 'wrangler.js');
const result = spawnSync(process.execPath, [wrangler, 'types', '--strict-vars=false'], { stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status ?? 1);

const file = path.resolve(import.meta.dirname, '..', 'worker-configuration.d.ts');
const before = fs.readFileSync(file, 'utf8');
const after = before.replace(/mainModule: typeof import\("[^"]*_worker"\);/, 'mainModule: unknown; // see scripts/gen-types.mjs');
fs.writeFileSync(file, after);
