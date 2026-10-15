// Site-wide settings. Anything in [BRACKETS] is a placeholder for the editors to fill in.

export const SITE_NAME = 'The Digital Historian’s Toolbox';

/** Shown in the footer and on the About page. */
export const RUN_BY = '[YOUR NAME / HGSA]';

/** Public GitHub repository for the code and data. Empty until the repository exists. */
export const GITHUB_URL = 'https://github.com/polayj/digital-historians-toolbox';

/** Zenodo record for the archived data. Empty until the first release is archived. */
export const ZENODO_URL = '';

export const NAV = [
	{ href: '/', label: 'Catalogue' },
	{ href: '/search', label: 'Search' },
	{ href: '/network', label: 'Network' },
	{ href: '/about', label: 'About' }
] as const;
