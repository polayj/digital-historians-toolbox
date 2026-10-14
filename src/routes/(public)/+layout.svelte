<script lang="ts">
	import Header from '#lib/components/Header.svelte';
	import Footer from '#lib/components/Footer.svelte';
	import PreviewBanner from '#lib/components/PreviewBanner.svelte';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();
</script>

<a class="skip-link" href="#main">Skip to content</a>
{#if data.showUnreviewed}<PreviewBanner />{/if}
<Header />
<main id="main" tabindex="-1">
	{@render children()}
</main>
<Footer preview={data.showUnreviewed} />

<style>
	#main:focus {
		outline: none;
	}
</style>
