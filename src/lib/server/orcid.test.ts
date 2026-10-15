import { describe, expect, it } from 'vitest';
import { authorizeUrl, exchangeCode, safeReturnPath } from './orcid';

const config = { base: 'https://sandbox.orcid.org', clientId: 'APP-TEST', clientSecret: 'shh' };

describe('ORCID sign-in', () => {
	it('asks only for the /authenticate permission', () => {
		const u = new URL(authorizeUrl(config, 'https://site.test/auth/orcid/callback', 'abc'));
		expect(u.origin).toBe('https://sandbox.orcid.org');
		expect(u.pathname).toBe('/oauth/authorize');
		expect(u.searchParams.get('scope')).toBe('/authenticate');
		expect(u.searchParams.get('state')).toBe('abc');
		expect(u.searchParams.get('client_id')).toBe('APP-TEST');
	});

	it('returns the iD and name ORCID confirms', async () => {
		let sent: URLSearchParams | undefined;
		const fetcher = (async (_url: URL, init: RequestInit) => {
			sent = init.body as URLSearchParams;
			return new Response(JSON.stringify({ orcid: '0000-0002-1825-0097', name: ' Josiah Carberry ' }));
		}) as unknown as typeof fetch;
		await expect(exchangeCode(config, 'code123', 'https://site.test/cb', fetcher)).resolves.toEqual({
			orcid: '0000-0002-1825-0097',
			name: 'Josiah Carberry'
		});
		expect(sent?.get('grant_type')).toBe('authorization_code');
		expect(sent?.get('code')).toBe('code123');
	});

	it('rejects a refused code or a malformed iD', async () => {
		const refused = (async () => new Response('{}', { status: 400 })) as unknown as typeof fetch;
		await expect(exchangeCode(config, 'x', 'y', refused)).rejects.toThrow(/refused/);
		const odd = (async () => new Response(JSON.stringify({ orcid: 'not-an-orcid' }))) as unknown as typeof fetch;
		await expect(exchangeCode(config, 'x', 'y', odd)).rejects.toThrow(/valid iD/);
	});

	it('only returns to pages on this site', () => {
		expect(safeReturnPath('/?card=kraken')).toBe('/?card=kraken');
		expect(safeReturnPath('https://evil.example')).toBe('/');
		expect(safeReturnPath('//evil.example')).toBe('/');
		expect(safeReturnPath('/\\evil.example')).toBe('/');
		expect(safeReturnPath(null)).toBe('/');
	});
});
