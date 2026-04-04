<script lang="ts">
	import { type ComponentProps } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { ArrowUpDown } from '@lucide/svelte';

	let { variant = 'ghost', ...restProps }: ComponentProps<typeof Button> = $props();
</script>

<Button {variant} {...restProps}>
	Price (Php)
	<ArrowUpDown class="ms-2" />
</Button>
