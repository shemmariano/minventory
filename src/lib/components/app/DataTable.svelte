<script lang="ts" generics="TData, TValue">
	import {
		type ColumnDef,
		type ColumnFiltersState,
		getCoreRowModel,
		getFilteredRowModel,
		getPaginationRowModel,
		getSortedRowModel,
		type PaginationState,
		type SortingState,
		type Table
	} from '@tanstack/table-core';
	import { FlexRender, createSvelteTable } from '../ui/data-table';
	import {
		Root as TableRoot,
		TableHeader,
		TableBody,
		TableRow,
		TableHead,
		TableCell
	} from '../ui/table';
	import { Button } from '../ui/button';
	import { ChevronLeft, ChevronRight } from '@lucide/svelte';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '../ui/select';
	import type { Snippet } from 'svelte';

	type DataTableProps<TData, TValue> = {
		columns: ColumnDef<TData, TValue>[];
		data: TData[];
		filters?: Snippet<[Table<TData>]>;
	};

	let { data, columns, filters }: DataTableProps<TData, TValue> = $props();

	let pagination = $state<PaginationState>({ pageIndex: 0, pageSize: 10 });
	let sorting = $state<SortingState>([]);
	let columnFilters = $state<ColumnFiltersState>([]);

	const table = createSvelteTable({
		get data() {
			return data;
		},
		columns,
		state: {
			get pagination() {
				return pagination;
			},
			get sorting() {
				return sorting;
			},
			get columnFilters() {
				return columnFilters;
			}
		},
		onPaginationChange: (updater) => {
			if (typeof updater === 'function') {
				pagination = updater(pagination);
			} else {
				pagination = updater;
			}
		},
		onSortingChange: (updater) => {
			if (typeof updater === 'function') {
				sorting = updater(sorting);
			} else {
				sorting = updater;
			}
		},
		onColumnFiltersChange: (updater) => {
			if (typeof updater === 'function') {
				columnFilters = updater(columnFilters);
			} else {
				columnFilters = updater;
			}
		},
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel()
	});
</script>

<div>
	<!-- <Input
		placeholder="Filter name..."
		class="max-w-sm"
		value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
		onchange={(e) => table.getColumn('name')?.setFilterValue(e.currentTarget.value)}
		oninput={(e) => table.getColumn('name')?.setFilterValue(e.currentTarget.value)}
	/> -->
	{#if filters}
		<div class="flex items-center gap-2 py-4">
			{@render filters?.(table)}
		</div>
	{/if}
	<div class="rounded-md border">
		<TableRoot>
			<TableHeader>
				{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
					<TableRow class="bg-muted/50 dark:bg-muted/50">
						{#each headerGroup.headers as header (header.id)}
							<TableHead colspan={header.colSpan}>
								{#if !header.isPlaceholder}
									<FlexRender
										content={header.column.columnDef.header}
										context={header.getContext()}
									/>
								{/if}
							</TableHead>
						{/each}
					</TableRow>
				{/each}
			</TableHeader>
			<TableBody>
				{#each table.getRowModel().rows as row (row.id)}
					<TableRow data-state={row.getIsSelected() && 'selected'}>
						{#each row.getVisibleCells() as cell (cell.id)}
							<TableCell>
								<FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
							</TableCell>
						{/each}
					</TableRow>
				{:else}
					<TableRow>
						<TableCell colspan={columns.length} class="text-center h-24"
							>No results found.</TableCell
						>
					</TableRow>
				{/each}
			</TableBody>
		</TableRoot>
	</div>
	<div class="flex items-center justify-end gap-6 py-4">
		<div class="flex items-center gap-2">
			<span class="prose text-sm dark:prose-invert">Rows per page</span>
			<Select
				type="single"
				bind:value={
					() => `${table.getState().pagination.pageSize}`, (v) => table.setPageSize(Number(v))
				}
			>
				<SelectTrigger>{table.getState().pagination.pageSize}</SelectTrigger>
				<SelectContent side="top">
					{#each [10, 20, 30, 40, 50] as pageSize (pageSize)}
						<SelectItem value={pageSize.toString()}>{pageSize}</SelectItem>
					{/each}
				</SelectContent>
			</Select>
		</div>
		<span class="prose text-sm dark:prose-invert"
			>Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}</span
		>
		<div class="flex items-center gap-2">
			<Button
				variant="outline"
				onclick={() => table.previousPage()}
				disabled={!table.getCanPreviousPage()}
			>
				<ChevronLeft />
				Previous
			</Button>
			<Button variant="outline" onclick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
				Next
				<ChevronRight />
			</Button>
		</div>
	</div>
</div>
