import { describe, expect, it } from 'vitest';
import { latestRelease, recordIdFromDoi, releaseFromRecord } from './zenodo';

describe('Zenodo releases', () => {
	it('reads the record id from a concept DOI', () => {
		expect(recordIdFromDoi('10.5281/zenodo.1234567')).toBe('1234567');
		expect(recordIdFromDoi('[XXXXXXX]')).toBeNull();
	});
	it('reads the version, DOI, date and page from a record', () => {
		expect(
			releaseFromRecord({
				doi: '10.5281/zenodo.7654321',
				metadata: { version: '2026.10', publication_date: '2026-10-31' },
				links: { self_html: 'https://zenodo.org/records/7654321' }
			})
		).toEqual({ version: '2026.10', doi: '10.5281/zenodo.7654321', date: '2026-10-31', url: 'https://zenodo.org/records/7654321' });
		expect(releaseFromRecord({})).toBeNull();
	});
	it('falls back quietly if Zenodo can’t be reached', async () => {
		const down = (async () => {
			throw new Error('offline');
		}) as unknown as typeof fetch;
		await expect(latestRelease('10.5281/zenodo.1', down)).resolves.toBeNull();
		await expect(latestRelease('not a doi', down)).resolves.toBeNull();
	});
});
