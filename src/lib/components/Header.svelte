<script lang="ts">
	import { page } from '$app/state';
	import Logo from './Logo.svelte';
	import { NAV, SITE_NAME } from '#lib/site.js';

	const isCurrent = (href: string) =>
		href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href);
</script>

<header class="site-header">
	<div class="container bar">
		<a class="brand" href="/">
			<Logo />
			<span>{SITE_NAME}</span>
		</a>
		<nav aria-label="Main">
			{#each NAV as item (item.href)}
				<a
					class="nav-link"
					href={item.href}
					aria-current={isCurrent(item.href) ? 'page' : undefined}>{item.label}</a
				>
			{/each}
			<a
				class="btn btn-primary submit"
				href="/submit"
				aria-current={isCurrent('/submit') ? 'page' : undefined}>Submit an entry</a
			>
		</nav>
	</div>
</header>

<style>
	.site-header {
		border-bottom: 1px solid var(--border);
	}
	.bar {
		padding-top: 18px;
		padding-bottom: 18px;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px 24px;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 12px;
		min-height: var(--tap);
		color: var(--text);
		text-decoration: none;
		font-family: var(--font-serif);
		font-weight: 700;
		font-size: 20px;
		line-height: 1.2;
	}
	.brand:hover {
		color: var(--text);
	}
	nav {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		margin-left: auto;
		align-items: center;
	}
	.nav-link {
		display: inline-flex;
		align-items: center;
		min-height: var(--tap);
		padding: 0 14px;
		color: var(--text-3);
		text-decoration: none;
		font-size: 15px;
		border-bottom: 2px solid transparent;
	}
	.nav-link:hover {
		color: var(--text);
	}
	.nav-link[aria-current='page'] {
		color: var(--text);
		font-weight: 600;
		border-bottom-color: var(--accent);
	}
	.submit {
		margin-left: 8px;
	}
	.submit[aria-current='page'] {
		outline: 2px solid var(--accent-hover);
		outline-offset: 2px;
	}

	@media (max-width: 720px) {
		.brand {
			font-size: 18px;
		}
		nav {
			margin-left: 0;
			width: 100%;
		}
		.nav-link {
			padding: 0 10px;
		}
		.nav-link:first-child {
			padding-left: 0;
		}
		.submit {
			margin-left: 0;
		}
	}
</style>
