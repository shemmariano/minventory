<script>
	import { SidebarProvider, SidebarTrigger } from '$lib/components/ui/sidebar';
	import AppSidebar from '$lib/components/app/AppSidebar.svelte';

	let { children } = $props();
</script>

<SidebarProvider>
	<AppSidebar />
	<main>
		<SidebarTrigger />
		{@render children?.()}
	</main>
</SidebarProvider>
