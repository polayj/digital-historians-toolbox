<!-- Shown for "not found", "not allowed" and unexpected errors, in the site's own style. -->
<script lang="ts">
	import { page } from '$app/state';
	import Logo from '#lib/components/Logo.svelte';

	const status = $derived(page.status);
	const heading = $derived(
		status === 404 ? 'Nothing filed here' : status === 403 ? 'This door is locked' : 'Something went wrong'
	);
	const explanation = $derived(
		status === 404
			? 'There’s no page at this address. It may have moved, or the link may have a typo.'
			: (page.error?.message ?? 'Please try again in a moment.')
	);
</script>

<svelte:head><title>{heading} · The Digital Historian’s Toolbox</title></svelte:head>

<a class="skip-link" href="#main">Skip to content</a>
<header class="bar-wrap">
	<div class="container bar">
		<a class="brand" href="/"><Logo /><span>The Digital Historian’s Toolbox</span></a>
	</div>
</header>
<main id="main" tabindex="-1" class="container page">
	<p class="kicker">Error {status}</p>
	<h1>{heading}</h1>
	<p class="lede">{explanation}</p>
	<p class="links">
		<a class="btn btn-primary" href="/">Back to the catalogue</a>
		<a class="btn" href="/search">Search</a>
	</p>
</main>

<style>
	.bar-wrap {
		border-bottom: 1px solid var(--border);
	}
	.bar {
		padding-top: 18px;
		padding-bottom: 18px;
	}
	.brand {
		display: inline-flex;
		align-items: center;
		gap: 12px;
		min-height: var(--tap);
		color: var(--text);
		text-decoration: none;
		font-family: var(--font-serif);
		font-weight: 700;
		font-size: 20px;
	}
	.page {
		padding-top: 72px;
		padding-bottom: 96px;
		display: flex;
		flex-direction: column;
		gap: 16px;
		max-width: 760px;
	}
	h1 {
		font-size: clamp(32px, 5vw, 44px);
	}
	.lede {
		font-size: 18px;
		line-height: 1.6;
		color: var(--text-3);
	}
	.links {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 8px;
	}
	#main:focus {
		outline: none;
	}
</style>
