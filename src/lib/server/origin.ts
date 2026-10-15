// Refuses form posts that come from another website. (SvelteKit protects its own form actions;
// plain endpoints such as /checkin and /auth/signout need this check.)
import { error } from '@sveltejs/kit';

export function requireSameOrigin(request: Request, url: URL) {
	const origin = request.headers.get('origin');
	if (origin !== url.origin) error(403, 'This form can only be sent from this website.');
}
