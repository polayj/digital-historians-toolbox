# The Digital Historian’s Toolbox

A curated, community-submitted catalogue of the tools and public datasets historians use, with every entry linked to the projects that used it. Research uses are kept separate from benchmarks, and every AI tool carries “historian’s notes”.

**Status:** skeleton. The pages exist with the approved design, but the database and features are being built step by step (see [docs/DECISIONS.md](docs/DECISIONS.md)).

## What’s in this folder

| Folder / file | What it is |
|---|---|
| `src/` | The website’s code (SvelteKit). `src/routes/` holds one folder per page; `src/lib/` holds shared pieces such as the header and footer. |
| `src/app.css` | The “night archive” colours, fonts and shared styles. Every colour is defined once here. |
| `src/lib/site.ts` | Site-wide settings and placeholders such as `[YOUR NAME / HGSA]`. |
| `seed/` | **Not in this repository.** The researched seed data (October 2026) includes admin-only research notes, so it lives in a separate private repository that editors clone into `seed/` (see below). |
| `migrations/` | The database structure, as numbered SQL files applied in order. |
| `scripts/` | The seed loader (`seed.mjs`) and its checker (`verify-seed.mjs`). |
| `data/` | Empty for now. The nightly export will write the **approved** catalogue here as JSON and CSV. |
| `design-reference/` | The approved mockups. Reference only; they don’t run on their own. |
| `docs/DECISIONS.md` | Decisions made so far and why. |
| `wrangler.jsonc` | Cloudflare settings (database connection, preview flag). |
| `PROMPT.md` | The original brief. |

## Running it on your own computer

You need [Node.js](https://nodejs.org) (version 22 or later).

```bash
npm install
npm run dev
```

Then open http://localhost:5173. Cloudflare’s database and settings are simulated locally, so nothing here touches the live site.

The first time, set up the local copy of the database and load the seed data. Loading the seed needs access to the private seed repository (editors only):

```bash
git clone https://github.com/polayj/digital-historians-toolbox-seed.git seed
```

```bash
npm run db:migrate:local
npm run db:seed:local
npm run db:verify:local
```

`db:migrate` creates the tables (from `migrations/`), `db:seed` loads `seed/` with every record set to `needs_review`, and `db:verify` checks the database against the seed files: counts, statuses, and that every editor note, flag and “UNVERIFIED” marker came through unchanged. The seed is safe to run again: once it has loaded completely it does nothing, and it never overwrites a record that already exists. The same commands ending in `:remote` work on the real Cloudflare database.

Everyone else can use the public, approved catalogue in `data/` once the nightly export is running.

Other commands:

- `npm run check`: looks for mistakes in the code.
- `npm run build`: builds the site the way Cloudflare will.
- `npm run gen`: refreshes the Cloudflare type definitions after `wrangler.jsonc` changes.

## Licences

To be added in step 7: code licence, and CC BY 4.0 for the catalogue’s own text. Linked third-party resources keep their own terms.
