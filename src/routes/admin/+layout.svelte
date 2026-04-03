<script>
	import { SidebarProvider, SidebarTrigger } from '$lib/components/ui/sidebar';
	import AppSidebar from '$lib/components/app/AppSidebar.svelte';

	let { children } = $props();
</script>

<SidebarProvider>
	<AppSidebar />
	<header class="h-12 w-full border-b">
		<div class="flex aspect-square h-full items-center justify-center border-r">
			<SidebarTrigger class="h-full w-full rounded-none" />
		</div>
	</header>
	<main>
		{@render children?.()}
	</main>
</SidebarProvider>
