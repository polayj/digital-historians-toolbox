# Decisions log

Short record of what was decided, and why, so future editors don’t have to guess.

## October 2026: plan and skeleton

- **Framework: SvelteKit 3** on Cloudflare Pages. Nearly every page is interactive (drawers, sorting, network graph, filters, admin queue), and SvelteKit handles pages, form handling and admin in one codebase. Alternatives considered: Astro (better for mostly static sites, but the interactive parts would need a second framework), Next.js (largest community, but heavier and less at home on Cloudflare), a static generator plus separate Workers, and no framework.
- **Database: Cloudflare D1.** Cloudflare settings and the database are reached in code with `import { env } from 'cloudflare:workers'`.
- **Seed data goes through the review queue.** All 25 entries and 75 projects load as `needs_review` and appear in the admin queue marked “From seed data”, with the same File it / Edit, then file / Return with a note buttons as public submissions. Re-running the seed adds only missing records; it never overwrites edits, approvals, `editor_notes`, flags or “UNVERIFIED” markers.
- **Preview shows unreviewed records.** While `SHOW_UNREVIEWED` is `"true"` (in `wrangler.jsonc`), the site shows `needs_review` records under a “Preview: not yet reviewed” banner. The live site will set it to `"false"` and show approved records only.
- **Sign-in for “I’m using this now”: ORCID.** Historians already have it, and it needs no email-sending service.
- **No submitter emails for now.** The mockup’s “You’ll get an email when it’s filed” line is dropped until an email provider is chosen. Submitter emails are still collected (never shown) so editors can follow up.
- **Seed files moved** from `data/` to `seed/`. `data/` is reserved for the nightly export of approved records, in the same shape as the seed files.
- **Nightly export via a GitHub Action**, which uses GitHub’s own permission to commit to the repository, so no keys need storing.
- **Network graph: d3-force**, keeping the mockup’s shapes and colours, with zoom, pan, keyboard access and a text list alternative.
- **Departures from the mockups:**
  - real `last_updated` dates are used (the mockup faked one stale card)
  - the Submit form uses the 8 drawers from `taxonomy.json`
  - search filters for cost, skill and “runs locally” are derived from the facts text at seed time and can be corrected in admin
  - “has published evaluation” is computed from linked evaluation projects
- **Accessibility detail:** muted text `#8F8472` is under 4.5:1 contrast on the two lightest surfaces (`#231F1B`, `#2B2621`), so text on those surfaces uses `#998E7C` instead (classes `raised-2`, `raised-3`).
