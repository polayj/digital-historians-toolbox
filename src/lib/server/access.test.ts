import { beforeEach, describe, expect, it } from 'vitest';
import { clearKeyCache, teamOrigin, verifyAccessToken } from './access';

const b64url = (bytes: Uint8Array) =>
	btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const enc = (obj: unknown) => b64url(new TextEncoder().encode(JSON.stringify(obj)));

async function setup() {
	const pair = (await crypto.subtle.generateKey(
		{ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
		true,
		['sign', 'verify']
	)) as CryptoKeyPair;
	const pub = { ...(await crypto.subtle.exportKey('jwk', pair.publicKey)), kid: 'k1' };
	const fetcher = (async () => new Response(JSON.stringify({ keys: [pub] }))) as unknown as typeof fetch;
	const sign = async (payload: object, header: object = { alg: 'RS256', kid: 'k1' }) => {
		const unsigned = `${enc(header)}.${enc(payload)}`;
		const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', pair.privateKey, new TextEncoder().encode(unsigned));
		return `${unsigned}.${b64url(new Uint8Array(sig))}`;
	};
	return { fetcher, sign };
}

const config = { teamDomain: 'toolbox', audience: 'aud-123' };
const now = Date.UTC(2026, 9, 14);
const good = {
	aud: ['aud-123'],
	iss: 'https://toolbox.cloudflareaccess.com',
	exp: now / 1000 + 3600,
	email: 'Editor@Example.org'
};

describe('Cloudflare Access token check', () => {
	beforeEach(() => clearKeyCache());

	it('accepts a valid token and returns the email', async () => {
		const { fetcher, sign } = await setup();
		await expect(verifyAccessToken(await sign(good), config, { fetcher, now })).resolves.toBe('editor@example.org');
	});
	it('rejects a token for another application', async () => {
		const { fetcher, sign } = await setup();
		await expect(verifyAccessToken(await sign({ ...good, aud: ['other'] }), config, { fetcher, now })).rejects.toThrow(/different application/);
	});
	it('rejects a token from another team', async () => {
		const { fetcher, sign } = await setup();
		await expect(verifyAccessToken(await sign({ ...good, iss: 'https://evil.cloudflareaccess.com' }), config, { fetcher, now })).rejects.toThrow(/different team/);
	});
	it('rejects an expired token', async () => {
		const { fetcher, sign } = await setup();
		await expect(verifyAccessToken(await sign({ ...good, exp: now / 1000 - 3600 }), config, { fetcher, now })).rejects.toThrow(/expired/);
	});
	it('rejects a tampered token', async () => {
		const { fetcher, sign } = await setup();
		const [h, , s] = (await sign(good)).split('.');
		const forged = `${h}.${enc({ ...good, email: 'intruder@example.org' })}.${s}`;
		await expect(verifyAccessToken(forged, config, { fetcher, now })).rejects.toThrow(/signature/);
	});
	it('rejects other signing methods', async () => {
		const { fetcher, sign } = await setup();
		await expect(verifyAccessToken(await sign(good, { alg: 'none', kid: 'k1' }), config, { fetcher, now })).rejects.toThrow(/signing method/);
	});
	it('understands short and full team domains', () => {
		expect(teamOrigin('toolbox')).toBe('https://toolbox.cloudflareaccess.com');
		expect(teamOrigin('https://toolbox.cloudflareaccess.com/')).toBe('https://toolbox.cloudflareaccess.com');
	});
});
