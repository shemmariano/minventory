<script lang="ts">
	import type { PageData } from './$types';
	import {
		Root as Table,
		TableHeader,
		TableBody,
		TableRow,
		TableHead,
		TableCell
	} from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';

	let { data }: { data: PageData } = $props();

	const { totalItems, availableCount, reservedCount, soldCount, totalRevenue, recentProducts, brandStats } = data;

	function formatPrice(price: string | number) {
		return `₱${Number(price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
	}

	const availableRate = $derived(totalItems > 0 ? ((availableCount / totalItems) * 100).toFixed(1) : '0.0');
	const soldRate = $derived(totalItems > 0 ? ((soldCount / totalItems) * 100).toFixed(1) : '0.0');

	function statusBadgeVariant(status: string) {
		switch (status) {
			case 'available': return 'default';
			case 'reserved': return 'secondary';
			case 'sold': return 'destructive';
			default: return 'outline';
		}
	}
</script>

<div class="space-y-6">
	<h1 class="text-3xl font-bold">Report</h1>

	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
		<div class="rounded-lg border bg-card p-6">
			<h2 class="text-sm font-medium text-muted-foreground">Total Items</h2>
			<p class="mt-2 text-3xl font-bold">{totalItems}</p>
		</div>
		<div class="rounded-lg border bg-card p-6">
			<h2 class="text-sm font-medium text-muted-foreground">Available</h2>
			<p class="mt-2 text-3xl font-bold text-green-600 dark:text-green-500">{availableCount}</p>
			<p class="text-xs text-muted-foreground">{availableRate}% of inventory</p>
		</div>
		<div class="rounded-lg border bg-card p-6">
			<h2 class="text-sm font-medium text-muted-foreground">Reserved</h2>
			<p class="mt-2 text-3xl font-bold text-yellow-600 dark:text-yellow-500">{reservedCount}</p>
			<p class="text-xs text-muted-foreground">{totalItems > 0 ? ((reservedCount / totalItems) * 100).toFixed(1) : '0.0'}% of inventory</p>
		</div>
		<div class="rounded-lg border bg-card p-6">
			<h2 class="text-sm font-medium text-muted-foreground">Sold</h2>
			<p class="mt-2 text-3xl font-bold text-destructive">{soldCount}</p>
			<p class="text-xs text-muted-foreground">{soldRate}% of inventory</p>
		</div>
	</div>

	<div class="grid gap-4 md:grid-cols-2">
		<div class="rounded-lg border bg-card p-6">
			<h2 class="text-sm font-medium text-muted-foreground">Total Revenue (Sold Items)</h2>
			<p class="mt-2 text-3xl font-bold">{formatPrice(totalRevenue)}</p>
		</div>
		<div class="rounded-lg border bg-card p-6">
			<h2 class="text-sm font-medium text-muted-foreground">Unsold Inventory Value</h2>
			<p class="mt-2 text-3xl font-bold">
				{formatPrice(recentProducts.filter(p => p.status !== 'sold').reduce((acc, p) => acc + Number(p.price), 0))}
			</p>
		</div>
	</div>

	<div class="rounded-lg border bg-card">
		<div class="p-6 pb-3">
			<h2 class="text-lg font-semibold">Top Brands</h2>
			<p class="text-sm text-muted-foreground">Most represented brands in inventory</p>
		</div>
		<Separator />
		<div class="p-6 pt-3">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Brand</TableHead>
						<TableHead class="text-right">Items</TableHead>
						<TableHead class="text-right">Total Value</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each brandStats as brand (brand.brand)}
						<TableRow>
							<TableCell class="font-medium">{brand.brand}</TableCell>
							<TableCell class="text-right">{brand.count}</TableCell>
							<TableCell class="text-right font-mono text-sm">{formatPrice(brand.totalValue)}</TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		</div>
	</div>

	<div class="rounded-lg border bg-card">
		<div class="p-6 pb-3">
			<h2 class="text-lg font-semibold">Recently Added Products</h2>
			<p class="text-sm text-muted-foreground">Last 10 items added to inventory</p>
		</div>
		<Separator />
		<div class="p-6 pt-3">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Name</TableHead>
						<TableHead>Brand</TableHead>
						<TableHead>Price</TableHead>
						<TableHead>Status</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each recentProducts as product (product.id)}
						<TableRow>
							<TableCell class="font-medium">{product.name}</TableCell>
							<TableCell class="text-muted-foreground">{product.brand}</TableCell>
							<TableCell class="font-mono text-sm">{formatPrice(product.price)}</TableCell>
							<TableCell>
								<Badge variant={statusBadgeVariant(product.status)}>
									{product.status}
								</Badge>
							</TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		</div>
	</div>
</div>
