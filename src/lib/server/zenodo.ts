// Finds the latest archived release on Zenodo, so the About page always shows the current
// version and its DOI without anyone editing the site. Needs the "concept DOI" (the one that
// covers all versions), set in src/lib/site.ts after the first release. Results are kept for a day.

export interface Release {
	version: string | null;
	doi: string;
	date: string | null;
	url: string;
}

/** '10.5281/zenodo.1234567' -> '1234567' */
export function recordIdFromDoi(doi: string): string | null {
	return /zenodo\.(\d+)\s*$/i.exec(doi.trim())?.[1] ?? null;
}

/** Reads a Zenodo record (as returned by its public API) into the few fields the site shows. */
export function releaseFromRecord(r: any): Release | null {
	const doi: string | undefined = r?.doi ?? r?.pids?.doi?.identifier;
	if (!doi) return null;
	return {
		version: r?.metadata?.version ?? null,
		doi,
		date: r?.metadata?.publication_date ?? null,
		url: r?.links?.self_html ?? r?.links?.html ?? `https://doi.org/${doi}`
	};
}

export async function latestRelease(conceptDoi: string, fetcher: typeof fetch = fetch): Promise<Release | null> {
	const id = recordIdFromDoi(conceptDoi);
	if (!id) return null;
	const url = `https://zenodo.org/api/records/${id}/versions/latest`;
	const cache = (globalThis as { caches?: { default?: Cache } }).caches?.default;
	try {
		const cached = await cache?.match(url);
		const res = cached ?? (await fetcher(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(5000) }));
		if (!res.ok) return null;
		if (!cached && cache) {
			const copy = new Response(res.clone().body, res);
			copy.headers.set('cache-control', 'public, max-age=86400');
			await cache.put(url, copy);
		}
		return releaseFromRecord(await res.json());
	} catch {
		return null; // Zenodo unreachable: the page falls back to its placeholders
	}
}
