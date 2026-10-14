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
- **Left for the editors (filters):** the derived search-filter values are a first guess. Transkribus is marked as *not* running locally, because its on-premises option is for institutions only.

## October 2026: database and seed

- **Schema** is in `migrations/0001_initial.sql`: drawers, sub-drawers, entries (with `facts`, `notes` and admin-only `research` kept as JSON in their original order), entry↔drawer and entry↔sub-drawer links, projects, project↔entry links, guides, users/sessions/check-ins (ORCID), submissions, edit history and a seed log.
- **Project years** are stored as written (`'c. 2011'`, `'2000–'`, `'n.d.'`), plus a `year_sort` column holding the last 4-digit year (empty for undated projects), which trending uses.
- **Check-ins** are limited to one per user, per entry, per *calendar* year.
- **Re-running the seed is safe.** Every insert skips rows that already exist, and a `seed_log` row written at the very end makes later runs do nothing. If a run is interrupted, running it again fills in only what's missing. Tested: an editor's approval and edited `editor_notes` survived both a normal re-run and an interrupted-run recovery.
- **Version history starts at seeding:** every seeded entry and project gets one “seeded” history line.
- **Sub-drawer blurbs** come word for word from the mockup and live in `seed/subdrawer_blurbs.json`.
- **Guides** also start as `needs_review`; the plan is to file them together with their entry.
- **The full seed is private.** `seed/` holds admin-only research notes and editor notes, so it lives in a separate private repository (`polayj/digital-historians-toolbox-seed`) cloned into `seed/`, and the public repository ignores that folder. It was removed from this repository's history before the first push. The public record of the catalogue is the nightly export of approved data in `data/`, which leaves out admin-only fields.
