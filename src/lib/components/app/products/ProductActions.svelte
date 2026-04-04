<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuGroup,
		DropdownMenuItem,
		DropdownMenuRadioItem,
		DropdownMenuSub,
		DropdownMenuSubContent,
		DropdownMenuSubTrigger,
		DropdownMenuTrigger
	} from '$lib/components/ui/dropdown-menu';
	import DropdownMenuRadioGroup from '$lib/components/ui/dropdown-menu/dropdown-menu-radio-group.svelte';
	import { Ellipsis, Pen } from '@lucide/svelte';
	import type { FormBody, Products, ProductStatus } from './columns';
	import { invalidateAll } from '$app/navigation';
	import { Spinner } from '$lib/components/ui/spinner';
	import { toast } from 'svelte-sonner';
	import ProductDrawer from './ProductDrawer.svelte';
	import { Dialog, DialogFooter } from '$lib/components/ui/dialog';
	import DialogContent from '$lib/components/ui/dialog/dialog-content.svelte';

	interface Props {
		row: Products;
	}

	let { row }: Props = $props();
	let isUpdating = $state<boolean>(false);
	let currentStatus = $derived<ProductStatus>(row.status);

	let openEditProductDrawer = $state<boolean>(false);
	let openConfirmDeleteDialog = $state<boolean>(false);
	async function changeProductStatus() {
		isUpdating = true;

		const res = await fetch(`/api/products/${row.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				status: currentStatus
			})
		});

		if (!res.ok) {
			isUpdating = false;
			toast.error('Failed to update status.');
			return;
		}

		// const data = await res.json();
		// console.log(data);
		await invalidateAll();
		toast.success('Status updated successfully.');
		isUpdating = false;
	}

	async function handleUpdateProduct(id: string, body: FormBody, row: Products) {
		openEditProductDrawer = false;
		toast.info('Updating product...');

		const updated = (Object.keys(body) as (keyof FormBody)[]).reduce((acc, key) => {
			if (body[key] !== row[key]) {
				acc[key] = body[key] as never;
			}
			return acc;
		}, {} as Partial<FormBody>);

		if (Object.keys(updated).length === 0) {
			toast.info('No changes detected.');
			return;
		}

		const res = await fetch(`/api/products/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(updated)
		});

		if (!res.ok) {
			toast.error('Something went wrong while updating this product.');
			return;
		}

		await invalidateAll();
		toast.success('Product updated successfully!');
		return;
	}

	async function handleDeleteProduct(id: string) {
		openConfirmDeleteDialog = false;
		toast.info('Deleting product...');

		const res = await fetch(`/api/products/${id}`, {
			method: 'DELETE'
		});

		if (!res.ok) {
			toast.error('Something went wrong while deleting this product.');
			return;
		}

		await invalidateAll();
		toast.success('Product successfully deleted!');
		return;
	}
</script>

<div class="flex gap-2">
	<Button variant="ghost" size="icon" onclick={() => (openEditProductDrawer = true)}><Pen /></Button
	>
	{#if isUpdating}
		<Button disabled variant="ghost" size="icon">
			<Spinner />
		</Button>
	{:else}
		<DropdownMenu>
			<DropdownMenuTrigger>
				{#snippet child({ props })}
					<Button {...props} variant="ghost" size="icon"><Ellipsis /></Button>
				{/snippet}
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuGroup>
					<DropdownMenuSub>
						<DropdownMenuSubTrigger>Status</DropdownMenuSubTrigger>
						<DropdownMenuSubContent>
							<DropdownMenuRadioGroup
								bind:value={currentStatus}
								onValueChange={changeProductStatus}
							>
								<DropdownMenuRadioItem value="available">Available</DropdownMenuRadioItem>
								<DropdownMenuRadioItem value="reserved">Reserved</DropdownMenuRadioItem>
								<DropdownMenuRadioItem value="sold">Sold</DropdownMenuRadioItem>
							</DropdownMenuRadioGroup>
						</DropdownMenuSubContent>
					</DropdownMenuSub>
					<DropdownMenuItem variant="destructive" onclick={() => (openConfirmDeleteDialog = true)}
						>Delete</DropdownMenuItem
					>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	{/if}
</div>

<ProductDrawer
	bind:open={openEditProductDrawer}
	body={row}
	mode="update"
	onsave={(body) => handleUpdateProduct(row.id, body, row)}
/>

<Dialog bind:open={openConfirmDeleteDialog}>
	<DialogContent>
		<span>Are you sure you want to delete this product item?</span>
		<DialogFooter>
			<Button variant="ghost">Cancel</Button>
			<Button variant="destructive" onclick={() => handleDeleteProduct(row.id)}>Delete Item</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
