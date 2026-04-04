<script lang="ts">
	import { SidebarInset, SidebarProvider, SidebarTrigger } from '$lib/components/ui/sidebar';
	import AppSidebar from '$lib/components/app/AppSidebar.svelte';
	import DarkMode from '$lib/components/app/DarkMode.svelte';
	import { Toaster } from '$lib/components/ui/sonner';

	let { children } = $props();
</script>

<Toaster position="top-center" />
<SidebarProvider>
	<AppSidebar />
	<SidebarInset>
		<header class="flex h-12 w-full border-b">
			<div class="flex aspect-square h-full items-center justify-center border-r">
				<SidebarTrigger class="h-full w-full rounded-none" />
			</div>
			<div class="justify-centers ms-auto flex aspect-square h-full items-center">
				<DarkMode />
			</div>
		</header>
		<main class="p-4">
			{@render children?.()}
		</main>
	</SidebarInset>
</SidebarProvider>
