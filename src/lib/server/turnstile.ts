// Asks Cloudflare whether the Turnstile ("are you human?") check on a form was passed.
import { env } from 'cloudflare:workers';

export async function passedTurnstile(token: string | null, ip: string | null): Promise<boolean> {
	const secret = env.TURNSTILE_SECRET_KEY;
	if (!secret || !token) return false; // fail closed: no secret configured means no submissions
	const body = new FormData();
	body.append('secret', secret);
	body.append('response', token);
	if (ip) body.append('remoteip', ip);
	try {
		const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
		const data = (await res.json()) as { success?: boolean };
		return data.success === true;
	} catch {
		return false;
	}
}
