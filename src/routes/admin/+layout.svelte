<!--
  The editor's desk. In production Cloudflare Access sits in front of /admin,
  so only editors on the allowed list ever reach these pages.
-->
<script lang="ts">
	import Logo from '#lib/components/Logo.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head><meta name="robots" content="noindex" /></svelte:head>

<a class="skip-link" href="#main">Skip to content</a>
<header>
	<div class="container bar">
		<Logo size={30} />
		<span class="title">Toolbox · Editor’s desk</span>
		<a class="public" href="/">View public site</a>
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
		padding-top: 18px;
		padding-bottom: 18px;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 16px;
	}
	.title {
		font-family: var(--font-serif);
		font-weight: 700;
		font-size: 19px;
	}
	.public {
		margin-left: auto;
		display: inline-flex;
		align-items: center;
		min-height: var(--tap);
	}
	#main:focus {
		outline: none;
	}
</style>
