<!-- The toolbox mark from the approved mockup: box, handle, brass stripe across the middle. -->
<script lang="ts">
	let { size = 34 }: { size?: number } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 34 34" aria-hidden="true" focusable="false">
	<rect x="3" y="9" width="28" height="20" rx="2" fill="none" stroke="var(--text)" stroke-width="2" />
	<path d="M12 9V5h10v4" fill="none" stroke="var(--text)" stroke-width="2" />
	<path d="M3 17h28" stroke="var(--accent)" stroke-width="2" />
</svg>
