// Checks the pass that Cloudflare Access gives a signed-in editor.
//
// Cloudflare Access sits in front of /admin and only lets listed editors through. As a second
// lock, the site also checks the signed token Access attaches to every request it lets through
// (the `Cf-Access-Jwt-Assertion` header). If Access were ever switched off or misconfigured,
// /admin would refuse everyone rather than open up.

export interface AccessConfig {
	/** The team domain from Cloudflare Zero Trust, e.g. 'toolbox' or 'toolbox.cloudflareaccess.com'. */
	teamDomain: string;
	/** The "Application Audience (AUD) tag" of the /admin Access application. */
	audience: string;
}

interface Jwk extends JsonWebKey {
	kid: string;
}

const textDecoder = new TextDecoder();

function base64UrlToBytes(s: string): Uint8Array<ArrayBuffer> {
	const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
	const bin = atob(b64);
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
	return out;
}

const decodePart = (s: string) => JSON.parse(textDecoder.decode(base64UrlToBytes(s)));

export function teamOrigin(teamDomain: string): string {
	const host = teamDomain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
	return `https://${host.includes('.') ? host : `${host}.cloudflareaccess.com`}`;
}

// Access signing keys, kept for an hour per running copy of the site.
let keyCache: { origin: string; keys: Jwk[]; fetched: number } | null = null;

async function signingKeys(origin: string, fetcher: typeof fetch): Promise<Jwk[]> {
	if (keyCache && keyCache.origin === origin && Date.now() - keyCache.fetched < 3_600_000) return keyCache.keys;
	const res = await fetcher(`${origin}/cdn-cgi/access/certs`);
	if (!res.ok) throw new Error(`Could not fetch Access keys (${res.status})`);
	const { keys } = (await res.json()) as { keys: Jwk[] };
	keyCache = { origin, keys, fetched: Date.now() };
	return keys;
}

/** Test hook: forget cached keys. */
export function clearKeyCache() {
	keyCache = null;
}

/**
 * Returns the editor's email if the token is a valid Access token for this application.
 * Throws with a reason otherwise.
 */
export async function verifyAccessToken(
	token: string,
	config: AccessConfig,
	{ fetcher = fetch, now = Date.now() }: { fetcher?: typeof fetch; now?: number } = {}
): Promise<string> {
	const parts = token.split('.');
	if (parts.length !== 3) throw new Error('Malformed token');
	const [h, p, s] = parts;
	const header = decodePart(h) as { alg?: string; kid?: string };
	const payload = decodePart(p) as { aud?: string | string[]; iss?: string; exp?: number; nbf?: number; email?: string };

	if (header.alg !== 'RS256') throw new Error('Unexpected signing method');
	const origin = teamOrigin(config.teamDomain);
	const keys = await signingKeys(origin, fetcher);
	const jwk = keys.find((k) => k.kid === header.kid);
	if (!jwk) throw new Error('Unknown signing key');

	const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
	const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, base64UrlToBytes(s), new TextEncoder().encode(`${h}.${p}`));
	if (!valid) throw new Error('Bad signature');

	const seconds = Math.floor(now / 1000);
	const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
	if (!audiences.includes(config.audience)) throw new Error('Token is for a different application');
	if (payload.iss !== origin) throw new Error('Token is from a different team');
	if (!payload.exp || payload.exp < seconds - 60) throw new Error('Token has expired');
	if (payload.nbf && payload.nbf > seconds + 60) throw new Error('Token is not valid yet');
	if (!payload.email) throw new Error('Token has no email');
	return payload.email.toLowerCase();
}
