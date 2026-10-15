// "Sign in with ORCID". The visitor signs in on orcid.org (the site never sees their password);
// ORCID sends them back with a one-time code, which the site swaps for their confirmed ORCID iD
// and name. Only the /authenticate permission is requested: the site can't read or change
// anything in their ORCID record.

export interface OrcidConfig {
	/** https://orcid.org for real use, https://sandbox.orcid.org for testing. */
	base: string;
	clientId: string;
	clientSecret: string;
}

export function authorizeUrl(config: OrcidConfig, redirectUri: string, state: string): string {
	const url = new URL('/oauth/authorize', config.base);
	url.searchParams.set('client_id', config.clientId);
	url.searchParams.set('response_type', 'code');
	url.searchParams.set('scope', '/authenticate');
	url.searchParams.set('redirect_uri', redirectUri);
	url.searchParams.set('state', state);
	return url.toString();
}

const ORCID_ID = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;

/** Swaps the one-time code for the visitor's ORCID iD and name. */
export async function exchangeCode(
	config: OrcidConfig,
	code: string,
	redirectUri: string,
	fetcher: typeof fetch = fetch
): Promise<{ orcid: string; name: string | null }> {
	const res = await fetcher(new URL('/oauth/token', config.base), {
		method: 'POST',
		headers: { accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			client_id: config.clientId,
			client_secret: config.clientSecret,
			grant_type: 'authorization_code',
			code,
			redirect_uri: redirectUri
		})
	});
	if (!res.ok) throw new Error(`ORCID refused the sign-in (${res.status})`);
	const data = (await res.json()) as { orcid?: string; name?: string };
	if (!data.orcid || !ORCID_ID.test(data.orcid)) throw new Error('ORCID did not return a valid iD');
	return { orcid: data.orcid, name: data.name?.trim() || null };
}

/** Only allow returning to a page on this site after sign-in (never to another website). */
export function safeReturnPath(raw: string | null | undefined): string {
	if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return '/';
	return raw;
}
