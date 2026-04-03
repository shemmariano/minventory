<script lang="ts">
	import DarkMode from '$lib/components/app/DarkMode.svelte';
	import { Button } from '$lib/components/ui/button';
	import { goto } from '$app/navigation';
	import { Separator } from '$lib/components/ui/separator';
	import LogoBrand from '$lib/components/app/LogoBrand.svelte';
	let { children } = $props();
</script>

<svelte:head><link rel="ico" href="../minventory-logo.svg" /></svelte:head>

<header class="flex h-16 border-b p-4">
	<div class="flex h-full items-center gap-2">
		<LogoBrand />
		<!-- <img
			src="minventory-logo.svg"
			alt="logo"
			class="aspect-square h-full bg-transparent p-px dark:bg-primary"
		/> -->
		<div class="prose dark:prose-invert">
			<h2 class="w-fit">MINVENTORY</h2>
		</div>
	</div>
	<div class="ms-auto flex items-center gap-2">
		<DarkMode />
		<Separator orientation="vertical" />
		<Button variant="ghost" class="h-full" onclick={() => goto('/login')}>Sign in</Button>
	</div>
</header>
{@render children()}
