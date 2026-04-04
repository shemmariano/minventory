<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { type Products } from './columns';
	import { type Row } from '@tanstack/table-core';

	type Variant = 'default' | 'secondary' | 'destructive';

	let { row }: { row: Row<Products> } = $props();

	const variantStyle: Variant = $derived.by(() => {
		return row.original.status === 'available'
			? 'default'
			: row.original.status === 'reserved'
				? 'secondary'
				: 'destructive';
	});
</script>

<Badge variant={variantStyle}>
	{row.original.status}
</Badge>
