import { renderComponent, renderSnippet } from '$lib/components/ui/data-table';
import type { ColumnDef } from '@tanstack/table-core';
import ProductStatusBadge from './ProductStatusBadge.svelte';
import ProductActions from './ProductActions.svelte';
import PriceHeader from './PriceHeader.svelte';
import { createRawSnippet } from 'svelte';

export type FormBody = {
	name: string;
	brand: string;
	price: string;
	status: ProductStatus;
	notes: string | null;
};

export type ProductStatus = 'available' | 'reserved' | 'sold';

export type Products = {
	id: string;
	name: string;
	brand: string;
	price: string;
	status: ProductStatus;
	notes: string | null;
	createdAt: Date;
	updatedAt: Date;
};

export const columns: ColumnDef<Products>[] = [
	{
		accessorKey: 'name',
		header: 'Name'
	},
	{
		accessorKey: 'brand',
		header: 'Brand'
	},
	{
		accessorKey: 'price',
		header: ({ column }) => {
			return renderComponent(PriceHeader, {
				onclick: column.getToggleSortingHandler()
			});
		},
		cell: ({ row }) => {
			const priceSnippet = createRawSnippet(() => ({
				render: () => `<div class="ms-4">${row.original.price}</div>`
			}));

			return renderSnippet(priceSnippet);
		}
	},
	{
		accessorKey: 'status',
		header: 'Status',
		cell: ({ row }) => {
			return renderComponent(ProductStatusBadge, { row });
		},
		// filterFn: (row, columnId, filterValue: ProductStatus[]) => {
		// 	if (!filterValue || filterValue.length === 0) return true;
		// 	return filterValue.includes(row.getValue(columnId));
		// }
		filterFn: 'arrIncludesSome'
	},
	{
		accessorKey: 'notes',
		header: 'Notes'
	},
	{
		accessorKey: 'actions',
		header: '',
		cell: ({ row }) => {
			return renderComponent(ProductActions, { row: row.original });
		}
	}
];
