<script lang="ts">
	import './layout.css';
	import { ModeWatcher } from 'mode-watcher';

	let { children } = $props();
</script>

<svelte:head><link rel="ico" href="../minventory-logo.svg" /></svelte:head>
<ModeWatcher />

{@render children()}
