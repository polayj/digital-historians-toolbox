// Site-wide settings. Anything in [BRACKETS] is a placeholder for the editors to fill in.

export const SITE_NAME = 'The Digital Historian’s Toolbox';

/** Shown in the footer and on the About page. */
export const RUN_BY = '[YOUR NAME / HGSA]';

/** Public GitHub repository for the code and data. Empty until the repository exists. */
export const GITHUB_URL = 'https://github.com/polayj/digital-historians-toolbox';

/**
 * Zenodo's "concept DOI" for the archive: the one DOI that always covers every release
 * (e.g. '10.5281/zenodo.1234567'). Empty until the first release is archived (docs/RELEASES.md).
 * The About page uses it to look up the latest release and its own DOI.
 */
export const ZENODO_CONCEPT_DOI = '';

/** Link to the Zenodo archive, once it exists. */
export const ZENODO_URL = ZENODO_CONCEPT_DOI ? `https://doi.org/${ZENODO_CONCEPT_DOI}` : '';

/** Shown on the About page. */
export const EDITORS = '[EDITOR NAMES]';
export const AFFILIATION = '[Affiliation, e.g. History Graduate Students’ Association, University of Saskatchewan]';
export const CONTACT_EMAIL = '[contact email]';

export const NAV = [
	{ href: '/', label: 'Catalogue' },
	{ href: '/search', label: 'Search' },
	{ href: '/network', label: 'Network' },
	{ href: '/about', label: 'About' }
] as const;
