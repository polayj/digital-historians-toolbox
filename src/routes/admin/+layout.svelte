<!--
  The editor's desk. In production Cloudflare Access sits in front of /admin,
  so only editors on the allowed list ever reach these pages.
-->
<script lang="ts">
	import { page } from '$app/state';
	import Logo from '#lib/components/Logo.svelte';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();
	const isQueue = $derived(page.url.pathname === '/admin');
	const isCards = $derived(page.url.pathname.startsWith('/admin/cards'));
</script>

<svelte:head><meta name="robots" content="noindex" /></svelte:head>

<a class="skip-link" href="#main">Skip to content</a>
<header>
	<div class="container bar">
		<a class="brand" href="/admin"><Logo size={30} /><span>Toolbox · Editor’s desk</span></a>
		{#if data.editor}<span class="who">Signed in as {data.editor}</span>{/if}
		<nav aria-label="Editor’s desk">
			<a href="/admin" aria-current={isQueue ? 'page' : undefined}>Review queue</a>
			<a href="/admin/cards" aria-current={isCards ? 'page' : undefined}>All cards</a>
			<a href="/">View public site</a>
		</nav>
	</div>
</header>
<main id="main" tabindex="-1">
	{@render children()}
</main>

<style>
	header {
		border-bottom: 1px solid var(--border);
	}
	.bar {
		padding-top: 14px;
		padding-bottom: 14px;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px 16px;
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
		font-size: 19px;
	}
	.who {
		font-family: var(--font-mono);
		font-size: 12px;
		padding: 4px 8px;
		border-radius: 3px;
		border: 1px solid var(--dataset);
		color: var(--dataset);
		overflow-wrap: anywhere;
	}
	nav {
		margin-left: auto;
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}
	nav a {
		display: inline-flex;
		align-items: center;
		min-height: var(--tap);
		padding: 0 12px;
		color: var(--text-3);
		text-decoration: none;
		border-bottom: 2px solid transparent;
	}
	nav a:hover {
		color: var(--text);
	}
	nav a[aria-current='page'] {
		color: var(--text);
		font-weight: 600;
		border-bottom-color: var(--accent);
	}
	#main:focus {
		outline: none;
	}
</style>
