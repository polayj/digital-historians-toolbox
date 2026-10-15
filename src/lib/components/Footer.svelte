<script lang="ts">
	import { page } from '$app/state';
	import { GITHUB_URL, RUN_BY, ZENODO_URL } from '#lib/site.js';

	let {
		preview = false,
		user = null
	}: { preview?: boolean; user?: { name: string | null; orcid: string } | null } = $props();
</script>

<footer>
	<div class="container row">
		<span>
			Community submitted, editor reviewed.{#if preview}{' '}Preview data: verify before citing.{/if}
		</span>
		<span>
			Run by {RUN_BY} ·
			{#if GITHUB_URL}<a href={GITHUB_URL}>Data on GitHub</a>{:else}Data on GitHub [link to come]{/if}
			·
			{#if ZENODO_URL}<a href={ZENODO_URL}>Archived on Zenodo</a>{:else}Archived on Zenodo [link to come]{/if}
		</span>
	</div>
	{#if user}
		<div class="container signed-in">
			<span>Signed in with ORCID as {user.name ?? user.orcid}</span>
			<form method="POST" action="/auth/signout">
				<input type="hidden" name="return" value={page.url.pathname + page.url.search} />
				<button type="submit" class="btn btn-link">Sign out</button>
			</form>
		</div>
	{/if}
</footer>

<style>
	footer {
		border-top: 1px solid var(--border);
	}
	.row {
		padding-top: 28px;
		padding-bottom: 28px;
		display: flex;
		flex-wrap: wrap;
		gap: 16px;
		justify-content: space-between;
		font-size: 14px;
		color: var(--muted);
	}
	a {
		display: inline-block;
		padding: 12px 0;
		margin: -12px 0;
	}
	.signed-in {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px 12px;
		padding-bottom: 20px;
		font-size: 14px;
		color: var(--muted);
	}
	.signed-in .btn-link {
		font-size: 14px;
	}
</style>
