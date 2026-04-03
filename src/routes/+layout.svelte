<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { ModeWatcher } from 'mode-watcher';
	import DarkMode from '$lib/components/app/DarkMode.svelte';
	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<ModeWatcher />
<div class="absolute top-4 right-4 opacity-0">
	<DarkMode />
</div>
{@render children()}
