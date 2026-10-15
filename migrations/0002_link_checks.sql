-- Results of the admin queue's "do these links work?" check.
-- Links are checked on request, in small batches, and the latest result is kept here.

CREATE TABLE link_checks (
	url        TEXT PRIMARY KEY,
	ok         INTEGER NOT NULL CHECK (ok IN (0, 1)),
	status     INTEGER,                   -- HTTP status, or NULL if the site couldn't be reached
	note       TEXT,                      -- e.g. 'timed out', 'site blocks automatic checks'
	checked_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
