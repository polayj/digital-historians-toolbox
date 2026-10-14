# Build "The Digital Historian's Toolbox"

You are building a production website from an approved mockup and a verified seed dataset. Everything you need is in this folder:

- `data/`: seed data that has already been researched and link-checked. **Do not re-scrape or re-research it.** Read `data/README.md` first.
- `design-reference/`: the approved mockup pages (Main = catalogue, Network, Search, Submit, Review = editor queue, About). These are prototype files written in a canvas-tool format, not production code. Use them for layout, copy, colours and interactions, and rebuild them properly.

Before writing code, read both folders. Then propose a short plan and wait for my go-ahead. Explain each Cloudflare step in plain language; I'm a historian, not a web developer.

---

## 1. What it is

A curated, community-submitted catalogue of the tools and public datasets historians use, with every entry linked to the projects that used it. What sets it apart from existing directories (TAPoR, SSH Open Marketplace):

1. **It is for historians specifically.**
2. **Research uses are kept separate from benchmarks.** Every project is classified as `research`, `corpus_building` or `evaluation`. A benchmark shows how well a tool reads; it doesn't show that a historian learned anything with it.
3. **It is frank about AI tools.** Every tool card carries "historian's notes": where your sources go, how it's been tested, and how it fails on historical material.

## 2. Stack and hosting

- **Cloudflare Pages** for the public site. A static-first framework is fine (Astro or SvelteKit preferred); keep it fast and simple.
- **Cloudflare D1** database for entries, projects, links, guides, submissions, check-ins and edit history.
- **Cloudflare Workers** for the submission API, check-ins and admin actions.
- **Turnstile** on all public forms.
- **Cloudflare Access** protecting `/admin`. Don't build password handling yourself.
- A public GitHub repository for the code **and** the data exports (see section 7).

## 3. Design (permanent dark "night archive")

There is no light mode. Match the mockups.

- Colours: background `#121010`; raised surfaces `#1C1916`, `#231F1B`, `#2B2621`; borders `#3A332C` and `#5A5047`; text `#EDE4D3`, secondary `#D9CDB6` and `#B8AC97`, muted `#8F8472`.
- Accent (brass) `#D4A84B`, hover `#E8C877`. Dataset teal `#7FB8A8`. Project kinds: research `#D98F7E`, corpus building `#9DB4D9`, evaluation `#A89C88`. Warning/stale `#E3A08F`.
- Type: **Libre Caslon Text** for headings, **IBM Plex Sans** for body text, **IBM Plex Mono** for labels and catalogue numbers.
- Logo: the toolbox icon from the mockup header (box, handle, brass stripe across the middle). Keep it.
- Accessibility: real buttons and links, visible focus states, text contrast of at least 4.5:1, touch targets of at least 44px, and works at phone width. Shapes as well as colours tell node types apart in the network graph.

## 4. Pages

**Catalogue (home).** A hero with search, a "Trending" strip, then **drawers shown as cards**: a brass label plate, a handle, and a peek at the top three entries. Opening a drawer expands it across the full row and shows:
- **Guide-card tabs** (sub-drawers), e.g. OCR → Classic OCR / Handwriting (HTR) / VLM OCR. Some sub-drawers have an explanatory blurb (see the mockup).
- A **sort control**: Trending (default, with a past 1 / 2 / 5 / 20-year window), Most used, Newest, A–Z, each with its one-line explanation.
- **Entry cards** that expand in place to full width. Closed cards show type and catalogue number, an AI badge, the name, the description, counts (`n research · n corpus · n tested`) and the last-updated date. Open cards show:
  - At a glance (the facts list)
  - Historian's notes (three Q&As)
  - Three project lists: **Used in research / Used to build corpora / Tested in**. Each project shows its title, who and year, and any flag tag (e.g. "editor's own paper", "tried and rejected").
  - Buttons: Visit website, **I'm using this now**, Add a project that used it, See it on the network, Cite this card, Suggest a correction
  - "Last updated [date] · Checked by the editors · Version history". A card that hasn't been checked in 12 months shows "Due for review" in the warning colour.
- Drawers with no entries yet appear dimmed with "Not yet filled · Suggest one".

**Search.** A dense, filterable list (type, AI, runs locally, has published evaluation, cost, skill level) across entries **and** projects.

**Network.** An interactive graph: tools (brass circles) and datasets (teal squares) in the middle, projects (diamonds coloured by kind) around the edge, sized by research plus corpus uses. Clicking a node highlights its connections and fills a side panel. There is a toggle to **hide benchmarks and evaluations**, and an "Often used together" list. Use a proper force or radial layout library (e.g. d3-force or Cytoscape.js) that scales to hundreds of nodes, with zoom and pan.

**Submit.** One form for a tool, dataset or project. Choosing the type changes the fields. Ticking "This tool uses AI" reveals: where uploaded sources go, a published evaluation link, and known problems on historical sources. For projects, ask for the kind (research / corpus building / evaluation) and which entries it used. Submissions are saved as **pending**. Credit the submitter's name; never show their email.

**About.** Port the mockup's About page: why it exists, research vs. benchmark, historian's notes, how sorting works, editorial policy, sustainability (GitHub + Zenodo), related resources, who runs it, and how to cite (both the website and a versioned Zenodo DOI). Leave the editor names, affiliation and contact as placeholders for me to fill in.

**Admin (`/admin`, behind Cloudflare Access).** A review queue (Pending / Filed / Returned) with **File it**, **Edit, then file**, and **Return with a note**. It shows automatic checks: possible duplicates, links that don't resolve, AI entries missing their historian's notes, and projects with no linked entries. Editors can also edit any live card, which updates its last-updated date and adds a version-history record. Show admin-only `editor_notes` and `research` fields here.

## 5. Data model

Base it on the seed files:

- `entries`: id, type (`tool` | `dataset`), catalogue number, name, ai, website, release year, card description, facts (ordered key/value list), notes (ordered Q&A list), research fields (admin-only), status, last_updated, created_at
- `entry_drawers` / `entry_subdrawers`: many-to-many links to the drawers and sub-drawers in `taxonomy.json`
- `projects`: id, title, short_title, year (a string), who, kind, how_used, url, flags, editor_notes, status, verified date
- `project_entries`: many-to-many links (from `links.csv`)
- `guides`: entry_id, title, url (shown on cards as "Guides", separate from projects)
- `checkins`: user, entry, timestamp, for "I'm using this now". Use simple sign-in (e.g. email magic link, or ORCID if easy). One check-in per user per entry per year.
- `submissions`: the raw payload, type, submitter name and email, status, editor note, timestamps
- `edit_history`: entity, field changes, editor, timestamp

**Counting rules**
- **Most used** = number of linked `research` + `corpus_building` projects, excluding any flagged `tried_and_rejected`.
- **Trending** = the same count, restricted to projects whose year (the last 4-digit year in the string) falls inside the chosen window, **plus** check-ins in that window. **Evaluations never count**, so a burst of benchmarks can't push a tool up.
- **Newest** = by release year.

## 6. Seeding

Write an idempotent seed script that loads everything in `data/` into D1 with every record set to `needs_review`, so I can approve them in the admin queue. Don't drop or rewrite any `editor_notes`, flags or "UNVERIFIED" markers.

## 7. Sustainability (important)

The catalogue must outlive both the website and its editors.

- A scheduled Worker (or GitHub Action) exports all **approved** data nightly to `/data` in the public GitHub repo as JSON and CSV, in the same shape as the seed files.
- Set up the **Zenodo–GitHub integration** so every tagged release (e.g. `2026.10`) is archived on Zenodo with its own DOI. Walk me through switching it on. Add a `CITATION.cff` file and a data licence (suggest CC BY 4.0 for our own text, and note that linked third-party resources keep their own terms).
- Show the latest release and its DOI on the About page.

## 8. Order of work

1. Plan and repo skeleton, then wait for my go-ahead.
2. D1 schema and seed script; confirm the counts (25 entries, 75 projects, 89 links, 14 guides).
3. Catalogue page with drawers, sub-drawers, sorting and expanding cards.
4. Search, then Network.
5. Submit flow, then the admin queue with Cloudflare Access.
6. Check-ins, last-updated and edit history.
7. Nightly export, the Zenodo setup and the About page.
8. Accessibility and mobile pass. Deploy to a preview URL and send me the link.

Don't invent tools, projects, numbers or citations. Anything missing stays as a visible placeholder like `[EDITOR NAMES]`.
