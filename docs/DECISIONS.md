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

## October 2026: catalogue page

- **Counting rules live in one file**, `src/lib/ranking.ts`, with tests in `src/lib/ranking.test.ts` (`npm test`). “Past N years” means the current calendar year and the N−1 before it. Ties are broken by most used, then A–Z.
- **The Trending strip** always uses the default 2-year window, as in the mockup; the window picker changes the order inside drawers.
- **Card counts show every linked project** (“n research · n corpus · n tested”), including a tried-and-rejected one, which is listed with its tag. Only the sort scores leave it out.
- **Project titles on cards** use the seed’s `short_title` (the descriptive version the mockup shows), falling back to `title`.
- **Guides** appear on the card as their own “Guides” list, after the three project lists.
- **Every card has a link**: `/?card=<id>` opens its first drawer and the card, and the address bar tracks the open drawer, guide card, card and sort, so any view can be shared.
- **Cards awaiting review say so**: the footer reads “Not yet reviewed by the editors” instead of “Checked by the editors” until a card is filed.
- **“Cite this card”** shows a citation with an `[Editors]` placeholder until the editor names are filled in.
- **“I’m using this now”** explains that ORCID sign-in is coming (step 6) rather than pretending to record anything.
- **Version history** has a simple public page (`/history/entry/<id>`) that lists what changed and which public fields; it never shows admin-only values or editors’ emails.
- **Touch targets**: project links in card lists have 44px tap areas without changing the visible layout.

## October 2026: search and network

- **Search rules live in `src/lib/search.ts`** (tests in `search.test.ts`). Every word typed must appear (capitals and accents ignored). Each word scores for every place it appears: name most, then guide-card labels, then the description, then the rest of the card.
- **Drawer names only count in search for drawers without guide cards.** Otherwise “handwriting” matched every card in “OCR & Handwriting”, including Tesseract.
- **Filters:** options within a group widen the results (Free *or* Paid); groups narrow them (Free *and* No code). Projects match the tool filters if they used at least one matching tool or dataset. A “Project kind” filter was added (research / corpus building / evaluation), since that distinction is central to the site.
- **Search sorting:** “Best match” when words are typed, otherwise Trending. For the other sorts, tools and datasets come first, then projects (newest first, or A–Z).
- **Network layout** (`src/lib/network.ts`, tests in `network.test.ts`) uses d3-force, run to completion before drawing: no animation, and the same data always gives the same picture. Tools and datasets are grouped by drawer on an inner ring; projects sit on an outer ring near the tools they used. A 560-point test lays out in under a second.
- **The graph is laid out in the browser, not on the server.** Cloudflare’s free plan allows each server request only a few milliseconds of computing time; the server sends the page with a “Drawing the graph…” placeholder instead.
- **Tool and dataset sizes** grow with the square root of research + corpus uses (rejected projects excluded), so heavily used tools don’t swamp the picture.
- **Zoom and pan:** drag to pan; zoom with the + / − buttons, Ctrl/⌘ + scroll, or a two-finger pinch. Plain scrolling and one-finger swipes scroll the page, so the graph never traps you.
- **Accessibility:** tools and datasets can be reached with Tab and selected with Enter or Space (Escape clears). Projects are reachable through the “Find” menu and the “Show the connections as a list” section, which gives the whole graph as text.
- **“Often used together”** follows the benchmark toggle. Its note is worked out from the data (e.g. whether most pairs come from benchmarks) rather than fixed text.
- **Known dev-server quirk:** after some edits the local dev server (`npm run dev`) shows “Internal Error” until restarted. It’s a hot-reload glitch in the development tools only; the production build was checked separately in Cloudflare’s local runtime.

## October 2026: submissions and the editor's desk

- **One Submit form** for a tool, a dataset, a project or a correction. The fields change with the type. Ticking “This tool uses AI” reveals the three historian’s-notes questions; datasets get their own three (how the text was made, gaps and biases, what you may do with it). Links from a card (“Add a project that used it”, “Suggest a correction”) arrive with that card already chosen.
- **Rules live in `src/lib/submissions.ts`** (tests in `submissions.test.ts`). Bare DOIs become doi.org links; addresses are otherwise kept exactly as typed, so saving a card never records a change nobody made. Projects can only link to real catalogue cards; anything else is named in words.
- **Submitters:** the name is optional and credited on the card (“Suggested by …”); the email is required, so editors can ask questions, and is never shown publicly. It appears only in the editor’s desk.
- **Turnstile** protects the form. Without a secret key configured, submissions are refused (fails closed). Local development uses Cloudflare’s published test keys.
- **Access check in code:** every `/admin` request must carry a valid, signed Cloudflare Access pass for this application (`src/lib/server/access.ts`, tests in `access.test.ts`). Without Access configured, `/admin` refuses everyone. On `npm run dev` only, `DEV_ADMIN_EMAIL` stands in.
- **The review queue** combines seeded records and public submissions, with Pending / Filed / Returned tabs and a filter by type. Automatic checks (`src/lib/checks.ts`, tests in `checks.test.ts`):
  - possible duplicates, by name or link
  - AI cards missing historian’s notes
  - projects with no linked cards, or linked only to cards not yet filed
  - research notes marked UNVERIFIED
  - links that don’t resolve
- **Link checks run on request**, 40 at a time (Cloudflare limits outgoing requests per visit). A site that blocks automatic checks (403, 429) shows as “couldn’t confirm”, not “broken”. The first local run flagged p004’s `preview.aclanthology.org` link (404) and the IFLA PDF for p015, “Ontario newspapers on a shoestring” (no response); left for the editors.
- **File it** puts a record live and resets its “last updated” date (filing counts as a check). Filing a card also files its seeded guides. **Return with a note** requires a note. **Move back to Pending** clears the old note.
- **Edit, then file / editing live cards:** one editor for cards (facts, notes and research notes as reorderable rows; drawers and guide cards; search-filter values) and one for projects (kind, linked cards, flags, editor notes). Every save that changes something writes a version-history record listing the changed fields; saving a live card updates its date. The public history page shows which fields changed, in plain words, never editor-only fields or emails.
- **Corrections** open the card’s editor with the suggestion shown above it; “Save and mark the correction done” closes the submission.
- **Admin-only material** (research notes, editor notes, submitter emails) is shown in the desk inside dashed “Editors only” boxes.
- **Bugs found while testing and fixed:**
  - a guide card ticked under two drawers was saved twice
  - a failed save showed no message
  - a trailing slash added to links made false history entries
  - the Turnstile box’s id shadowed the Turnstile script
- **Setup steps for Turnstile and Access** are in `docs/SETUP.md`.

## October 2026: check-ins, last updated, version history

- **“I’m using this now” uses ORCID sign-in** (`src/lib/server/orcid.ts`, tests in `orcid.test.ts`). Only ORCID’s `/authenticate` permission is requested: the site learns the iD and name, nothing else. A one-time `state` value guards against forged sign-ins, and after sign-in visitors only ever return to a page on this site.
- **Sessions** last 180 days. The cookie holds a random token; the database holds only its SHA-256 fingerprint, so a copy of the database can’t be used to sign in. Signing out deletes the session.
- **Check-ins:** one per person per card per calendar year (enforced by the database). Not signed in? The button sends you to ORCID and records the check-in when you come back. Cards show how many people checked in this year, never who. Check-ins count toward Trending in the chosen window (already part of the ranking rules).
- **Same-site check:** `/checkin` and `/auth/signout` refuse posts from other websites (`src/lib/server/origin.ts`). SvelteKit protects its own form actions but not plain endpoints. Session cookies are also `SameSite=Lax`.
- **Without ORCID configured**, the button explains that sign-in isn’t switched on and records nothing. On `npm run dev`, `DEV_ORCID_ID` signs you in as ORCID’s fictional test researcher (Josiah Carberry, 0000-0002-1825-0097).
- **Last updated** is reset when an editor files or edits a card; cards not updated for 12 months show “Due for review” (on the card, and in “All cards”).
- **Version history:** public page `/history/<entry|project>/<id>` lists actions and the public fields that changed; editors’ page `/admin/history/…` shows old and new values (editor-only fields included) and who made each change.
- **Footer** shows “Signed in with ORCID as …” with a Sign out button; the “Data on GitHub” link now points to the public repository.

## October 2026: open data, releases and the About page

- **Public export:** `/export/<file>` serves `entries.json`, `projects.json`, `links.csv`, `guides.json` and `taxonomy.json`, built from **approved records only** (whatever the preview setting), in the seed files’ shape minus editor-only fields (`research`, `editor_notes`). Entries add `filters` (cost, skill, runs locally) and, where given, `suggested_by`. Tests in `src/lib/exportFormat.test.ts`.
- **Nightly GitHub Action** (`.github/workflows/nightly-export.yml`, 07:17 UTC) runs `scripts/fetch-export.mjs`. It checks the files before writing: valid, approved only, no editor-only fields, links consistent. It refuses a drop of more than 20% in cards unless run with `ALLOW_SHRINK=yes`, and commits only when something changed. It skips quietly until the `SITE_URL` repository variable is set. Tested locally: 25 cards, 75 projects, 89 links and 14 guides exported (identical to the committed seed), with no editor-only text, and the drop guard refused when 10 cards were unapproved.
- **Licences:** CC BY 4.0 for the catalogue’s data and text (`data/LICENSE.md`); linked resources keep their own terms. **The code licence is still to be chosen.**
- **`CITATION.cff`** (type: dataset) gives GitHub’s “Cite this repository” and Zenodo’s release metadata. The editors’ names are a placeholder to fill before the first release.
- **Zenodo:** releases are tagged `YYYY.MM`. After the first release, putting its concept DOI in `src/lib/site.ts` (`ZENODO_CONCEPT_DOI`) makes the About page look up the latest version and its DOI from Zenodo’s public API (cached for a day; placeholders if Zenodo is unreachable). Step-by-step guide: `docs/RELEASES.md`.
- **About page** ported from the mockup:
  - live counts, labelled “In this preview” or “In the catalogue”
  - placeholders for editors, affiliation and contact (`src/lib/site.ts`)
  - website and versioned-data citations
  - a short **“Your privacy”** section, which isn’t in the mockup, explaining what submissions and ORCID check-ins store
