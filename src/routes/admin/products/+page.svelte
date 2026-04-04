<script lang="ts">
	import DataTable from '$lib/components/app/DataTable.svelte';
	import { columns, type FormBody, type Products } from '$lib/components/app/products/columns';
	import { Input } from '$lib/components/ui/input';
	import { type ProductStatus } from '$lib/components/app/products/columns';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Settings2, X } from '@lucide/svelte';
	import type { Table } from '@tanstack/table-core';
	import {
		DropdownMenu,
		DropdownMenuCheckboxGroup,
		DropdownMenuCheckboxItem,
		DropdownMenuContent,
		DropdownMenuLabel,
		DropdownMenuSeparator,
		DropdownMenuTrigger
	} from '$lib/components/ui/dropdown-menu';
	import { Separator } from '$lib/components/ui/separator';
	import ProductDrawer from '$lib/components/app/products/ProductDrawer.svelte';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();

	let openNewProductDrawer = $state<boolean>(false);

	let nameFilterValue = $state<string>('');
	let statusFilterValue = $state<ProductStatus[]>([]);
	let statusFilterCount = $derived(statusFilterValue.length);

	const isFiltered = $derived.by<boolean>(() => {
		return Boolean(nameFilterValue) || Boolean(statusFilterValue.length);
	});

	function resetFilter(table: Table<Products>) {
		table.getColumn('name')?.setFilterValue('');
		table.getColumn('status')?.setFilterValue([]);
		nameFilterValue = '';
		statusFilterValue = [];
	}

	async function addProduct(body: FormBody) {
		openNewProductDrawer = false;

		toast.info('Adding product...');

		const res = await fetch(`/api/products`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});

		if (!res.ok) {
			toast.error('Something went wrong while adding this product.');
			return;
		}

		toast.success('Product successfully added!');
		invalidateAll();
		return;
	}
</script>

<DataTable data={data.products} {columns}>
	{#snippet filters(table)}
		<Input
			placeholder="Filter name..."
			class="max-w-sm"
			bind:value={nameFilterValue}
			onchange={(e) => table.getColumn('name')?.setFilterValue(e.currentTarget.value)}
			oninput={(e) => table.getColumn('name')?.setFilterValue(e.currentTarget.value)}
		/>
		<DropdownMenu>
			<DropdownMenuTrigger>
				{#snippet child({ props })}
					<Button {...props} variant="outline">
						<Settings2 />
						Status
						{#if statusFilterCount}
							<Separator orientation="vertical" class="mx-2" />
						{/if}
						{#if statusFilterCount <= 2}
							{#each statusFilterValue as status (status)}
								<Badge variant="secondary">{status}</Badge>
							{/each}
						{:else}
							<Badge variant="secondary">{statusFilterCount}</Badge>
						{/if}
					</Button>
				{/snippet}
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuLabel>Filter status</DropdownMenuLabel>
				<DropdownMenuCheckboxGroup
					bind:value={statusFilterValue}
					onValueChange={(arr) => table.getColumn('status')?.setFilterValue(arr)}
				>
					<DropdownMenuCheckboxItem value="available">Available</DropdownMenuCheckboxItem>
					<DropdownMenuCheckboxItem value="reserved">Reserved</DropdownMenuCheckboxItem>
					<DropdownMenuCheckboxItem value="sold">Sold</DropdownMenuCheckboxItem>
				</DropdownMenuCheckboxGroup>
				<DropdownMenuSeparator />
				<Button
					class="w-full"
					variant="ghost"
					onclick={() => {
						statusFilterValue = [];
						table.getColumn('status')?.setFilterValue([]);
					}}>Clear filters</Button
				>
			</DropdownMenuContent>
		</DropdownMenu>
		{#if isFiltered}
			<Button variant="ghost" onclick={() => resetFilter(table)}>Reset <X /></Button>
		{/if}
		<Button class="ms-auto" onclick={() => (openNewProductDrawer = true)}>Add Product</Button>
	{/snippet}
</DataTable>

<ProductDrawer
	bind:open={openNewProductDrawer}
	body={{ name: '', brand: '', price: '', status: 'available', notes: null, imageUrl: null }}
	mode="add"
	onsave={(body) => addProduct(body)}
/>
