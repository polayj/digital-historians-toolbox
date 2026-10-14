-- The Digital Historian's Toolbox: initial database structure.
-- Applied with `npm run db:migrate:local` (your computer) or `npm run db:migrate:remote` (Cloudflare).
--
-- Statuses
--   entries, projects, guides: needs_review -> approved, or returned (sent back with a note)
--   submissions:               pending -> filed, or returned
-- Only approved records appear on the live site. The preview also shows needs_review ones.

-- ---------------------------------------------------------------------------
-- Taxonomy: drawers and their sub-drawers ("guide cards")
-- ---------------------------------------------------------------------------

CREATE TABLE drawers (
	id        TEXT PRIMARY KEY,           -- e.g. 'ocr'
	number    TEXT NOT NULL,              -- roman numeral shown on the label plate, e.g. 'II'
	label     TEXT NOT NULL,
	blurb     TEXT NOT NULL DEFAULT '',
	position  INTEGER NOT NULL
);

-- A sub-drawer id (e.g. 'htr') can sit in more than one drawer, with the same meaning.
CREATE TABLE subdrawers (
	drawer_id TEXT NOT NULL REFERENCES drawers(id),
	id        TEXT NOT NULL,
	label     TEXT NOT NULL,
	blurb     TEXT,                       -- optional explanation shown under the tabs
	position  INTEGER NOT NULL,
	PRIMARY KEY (drawer_id, id)
);

-- ---------------------------------------------------------------------------
-- Catalogue entries: tools and datasets
-- ---------------------------------------------------------------------------

CREATE TABLE entries (
	id               TEXT PRIMARY KEY,    -- e.g. 'tesseract'
	type             TEXT NOT NULL CHECK (type IN ('tool', 'dataset')),
	catalogue_number TEXT NOT NULL UNIQUE,
	name             TEXT NOT NULL,
	ai               INTEGER NOT NULL DEFAULT 0 CHECK (ai IN (0, 1)),
	website          TEXT,
	release_year     INTEGER,
	description      TEXT NOT NULL,       -- the card's public description
	facts            TEXT NOT NULL DEFAULT '[]',  -- JSON: ordered [{ "k": ..., "v": ... }]
	notes            TEXT NOT NULL DEFAULT '[]',  -- JSON: ordered [{ "q": ..., "a": ... }] (historian's notes)
	research         TEXT NOT NULL DEFAULT '{}',  -- JSON: fuller research notes and editor flags. ADMIN ONLY.
	researched       TEXT,                -- date the research was done

	-- Tidy values for the search filters. Worked out from the facts text when seeded;
	-- editors can correct them in admin. NULL means "doesn't apply" (e.g. datasets).
	cost_band        TEXT CHECK (cost_band IN ('free', 'freemium', 'paid')),
	skill_level      TEXT CHECK (skill_level IN ('no_code', 'some_code', 'programming')),
	runs_locally     INTEGER CHECK (runs_locally IN (0, 1)),

	status           TEXT NOT NULL DEFAULT 'needs_review'
	                 CHECK (status IN ('needs_review', 'approved', 'returned')),
	review_note      TEXT,                -- note left when returned
	source           TEXT NOT NULL DEFAULT 'submission' CHECK (source IN ('seed', 'submission')),
	submitted_by     TEXT,                -- submitter's public name (never their email)
	last_updated     TEXT NOT NULL,       -- YYYY-MM-DD, shown on the card
	created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX entries_status ON entries(status);

CREATE TABLE entry_drawers (
	entry_id  TEXT NOT NULL REFERENCES entries(id),
	drawer_id TEXT NOT NULL REFERENCES drawers(id),
	position  INTEGER NOT NULL DEFAULT 0, -- order as given in the data
	PRIMARY KEY (entry_id, drawer_id)
);

CREATE TABLE entry_subdrawers (
	entry_id      TEXT NOT NULL REFERENCES entries(id),
	subdrawer_id  TEXT NOT NULL,          -- matches subdrawers.id in whichever drawer shows it
	position      INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY (entry_id, subdrawer_id)
);

-- ---------------------------------------------------------------------------
-- Projects that used or tested entries
-- ---------------------------------------------------------------------------

CREATE TABLE projects (
	id           TEXT PRIMARY KEY,        -- e.g. 'p001'
	title        TEXT NOT NULL,
	short_title  TEXT,
	year         TEXT,                    -- as written: '2023', '2000–', 'c. 2011', 'n.d.'
	year_sort    INTEGER,                 -- last 4-digit year in `year`; NULL when undated. Used for trending.
	who          TEXT,
	kind         TEXT NOT NULL CHECK (kind IN ('research', 'corpus_building', 'evaluation')),
	how_used     TEXT,
	url          TEXT,
	flags        TEXT NOT NULL DEFAULT '[]',  -- JSON list, e.g. ["tried_and_rejected"]
	editor_notes TEXT NOT NULL DEFAULT '',    -- ADMIN ONLY
	verified     TEXT,                    -- date the link was checked
	status       TEXT NOT NULL DEFAULT 'needs_review'
	             CHECK (status IN ('needs_review', 'approved', 'returned')),
	review_note  TEXT,
	source       TEXT NOT NULL DEFAULT 'submission' CHECK (source IN ('seed', 'submission')),
	submitted_by TEXT,
	last_updated TEXT NOT NULL,
	created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX projects_status ON projects(status);

-- Which entries each project used (the edges of the network graph).
CREATE TABLE project_entries (
	project_id TEXT NOT NULL REFERENCES projects(id),
	entry_id   TEXT NOT NULL REFERENCES entries(id),
	PRIMARY KEY (project_id, entry_id)
);

CREATE INDEX project_entries_entry ON project_entries(entry_id);

-- ---------------------------------------------------------------------------
-- Guides and tutorials, shown on cards separately from projects
-- ---------------------------------------------------------------------------

CREATE TABLE guides (
	id          INTEGER PRIMARY KEY AUTOINCREMENT,
	entry_id    TEXT NOT NULL REFERENCES entries(id),
	title       TEXT NOT NULL,
	url         TEXT NOT NULL,
	status      TEXT NOT NULL DEFAULT 'needs_review'
	            CHECK (status IN ('needs_review', 'approved', 'returned')),
	source      TEXT NOT NULL DEFAULT 'submission' CHECK (source IN ('seed', 'submission')),
	created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
	UNIQUE (entry_id, url)
);

-- ---------------------------------------------------------------------------
-- "I'm using this now": signed-in users (ORCID) and their check-ins
-- ---------------------------------------------------------------------------

CREATE TABLE users (
	id         INTEGER PRIMARY KEY AUTOINCREMENT,
	orcid      TEXT NOT NULL UNIQUE,      -- e.g. '0000-0002-1825-0097'
	name       TEXT,
	created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE sessions (
	id         TEXT PRIMARY KEY,          -- SHA-256 of the cookie token, never the token itself
	user_id    INTEGER NOT NULL REFERENCES users(id),
	created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
	expires_at TEXT NOT NULL
);

-- One check-in per user, per entry, per calendar year.
CREATE TABLE checkins (
	id         INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id    INTEGER NOT NULL REFERENCES users(id),
	entry_id   TEXT NOT NULL REFERENCES entries(id),
	year       INTEGER NOT NULL,
	created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
	UNIQUE (user_id, entry_id, year)
);

CREATE INDEX checkins_entry_year ON checkins(entry_id, year);

-- ---------------------------------------------------------------------------
-- Public submissions (new tools, datasets, projects, and corrections)
-- ---------------------------------------------------------------------------

CREATE TABLE submissions (
	id              INTEGER PRIMARY KEY AUTOINCREMENT,
	type            TEXT NOT NULL CHECK (type IN ('tool', 'dataset', 'project', 'correction')),
	payload         TEXT NOT NULL,        -- JSON: the form exactly as submitted
	submitter_name  TEXT,                 -- credited publicly
	submitter_email TEXT,                 -- NEVER shown publicly
	target_entry_id TEXT REFERENCES entries(id),  -- for corrections and "add a project that used it"
	status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'filed', 'returned')),
	editor_note     TEXT,
	filed_as        TEXT,                 -- id of the entry or project created when filed
	reviewed_by     TEXT,                 -- editor's email (from Cloudflare Access)
	created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
	updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX submissions_status ON submissions(status);

-- ---------------------------------------------------------------------------
-- Version history: every change to a live record
-- ---------------------------------------------------------------------------

CREATE TABLE edit_history (
	id          INTEGER PRIMARY KEY AUTOINCREMENT,
	entity_type TEXT NOT NULL CHECK (entity_type IN ('entry', 'project', 'guide')),
	entity_id   TEXT NOT NULL,
	action      TEXT NOT NULL CHECK (action IN ('seeded', 'created', 'edited', 'filed', 'returned')),
	changes     TEXT NOT NULL DEFAULT '{}', -- JSON: { "field": { "from": ..., "to": ... } }
	editor      TEXT,                       -- editor's email, or 'seed'
	note        TEXT,
	created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX edit_history_entity ON edit_history(entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- Seed log: records that a seed file has been loaded, so loading it again does nothing
-- ---------------------------------------------------------------------------

CREATE TABLE seed_log (
	seed_id    TEXT PRIMARY KEY,          -- e.g. '2026-10-14'
	loaded_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
	counts     TEXT NOT NULL              -- JSON summary of what was loaded
);
