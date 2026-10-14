# The Digital Historian’s Toolbox

A curated, community-submitted catalogue of the tools and public datasets historians use, with every entry linked to the projects that used it. Research uses are kept separate from benchmarks, and every AI tool carries “historian’s notes”.

**Status:** skeleton. The pages exist with the approved design, but the database and features are being built step by step (see [docs/DECISIONS.md](docs/DECISIONS.md)).

## What’s in this folder

| Folder / file | What it is |
|---|---|
| `src/` | The website’s code (SvelteKit). `src/routes/` holds one folder per page; `src/lib/` holds shared pieces such as the header and footer. |
| `src/app.css` | The “night archive” colours, fonts and shared styles. Every colour is defined once here. |
| `src/lib/site.ts` | Site-wide settings and placeholders such as `[YOUR NAME / HGSA]`. |
| `seed/` | The researched seed data (October 2026). Loaded once into the database, then reviewed in the admin queue. |
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

Other commands:

- `npm run check`: looks for mistakes in the code.
- `npm run build`: builds the site the way Cloudflare will.
- `npm run gen`: refreshes the Cloudflare type definitions after `wrangler.jsonc` changes.

## Licences

To be added in step 7: code licence, and CC BY 4.0 for the catalogue’s own text. Linked third-party resources keep their own terms.
