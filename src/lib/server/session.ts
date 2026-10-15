// Signed-in historians (via ORCID). The browser keeps a random token in a cookie; the database
// keeps only a fingerprint (SHA-256) of it, so a copy of the database can't be used to sign in.
import type { Cookies } from '@sveltejs/kit';
import { env } from 'cloudflare:workers';

export const SESSION_COOKIE = 'toolbox_session';
const SESSION_DAYS = 180;

export interface SignedInUser {
	id: number;
	orcid: string;
	name: string | null;
}

const toHex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

export async function fingerprint(token: string): Promise<string> {
	return toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)));
}

export function randomToken(bytes = 32): string {
	const b = crypto.getRandomValues(new Uint8Array(bytes));
	return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Finds or creates the user for an ORCID iD and starts a session; sets the cookie. */
export async function signIn(cookies: Cookies, orcid: string, name: string | null, secure: boolean): Promise<SignedInUser> {
	const user = await env.DB.prepare(
		`INSERT INTO users (orcid, name) VALUES (?, ?)
		 ON CONFLICT(orcid) DO UPDATE SET name = COALESCE(excluded.name, users.name)
		 RETURNING id, orcid, name`
	)
		.bind(orcid, name)
		.first<SignedInUser>();
	if (!user) throw new Error('Could not save the user');

	const token = randomToken();
	const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
	await env.DB.batch([
		env.DB.prepare(`DELETE FROM sessions WHERE expires_at < strftime('%Y-%m-%dT%H:%M:%SZ', 'now')`),
		env.DB.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').bind(
			await fingerprint(token),
			user.id,
			expires.toISOString().replace(/\.\d{3}Z$/, 'Z')
		)
	]);
	cookies.set(SESSION_COOKIE, token, { path: '/', httpOnly: true, sameSite: 'lax', secure, expires });
	return user;
}

export async function currentUser(cookies: Cookies): Promise<SignedInUser | null> {
	const token = cookies.get(SESSION_COOKIE);
	if (!token) return null;
	const user = await env.DB.prepare(
		`SELECT u.id, u.orcid, u.name FROM sessions s JOIN users u ON u.id = s.user_id
		 WHERE s.id = ? AND s.expires_at > strftime('%Y-%m-%dT%H:%M:%SZ', 'now')`
	)
		.bind(await fingerprint(token))
		.first<SignedInUser>();
	return user ?? null;
}

export async function signOut(cookies: Cookies) {
	const token = cookies.get(SESSION_COOKIE);
	if (token) await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(await fingerprint(token)).run();
	cookies.delete(SESSION_COOKIE, { path: '/' });
}
