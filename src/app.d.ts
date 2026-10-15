// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces.
// Cloudflare settings and the database are read with `import { env } from 'cloudflare:workers'`;
// their types are generated into worker-configuration.d.ts by `npm run gen`.
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			/** Email of the signed-in editor (set on /admin pages only). */
			editor?: string;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
