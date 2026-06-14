<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const { stats } = data;

	function formatPrice(price: string) {
		return `₱${parseFloat(price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
	}
</script>

<div class="space-y-6">
	<h1 class="text-3xl font-bold">Dashboard</h1>

	<div class="grid gap-4 md:grid-cols-4">
		<div class="rounded-lg border bg-card p-6">
			<h2 class="text-sm font-medium text-muted-foreground">Total Items</h2>
			<p class="mt-2 text-3xl font-bold">{stats.total}</p>
		</div>
		<div class="rounded-lg border bg-card p-6">
			<h2 class="text-sm font-medium text-muted-foreground">Available</h2>
			<p class="mt-2 text-3xl font-bold text-green-600">{stats.available}</p>
		</div>
		<div class="rounded-lg border bg-card p-6">
			<h2 class="text-sm font-medium text-muted-foreground">Reserved</h2>
			<p class="mt-2 text-3xl font-bold text-yellow-600">{stats.reserved}</p>
		</div>
		<div class="rounded-lg border bg-card p-6">
			<h2 class="text-sm font-medium text-muted-foreground">Sold</h2>
			<p class="mt-2 text-3xl font-bold text-destructive">{stats.sold}</p>
		</div>
	</div>

	<div class="rounded-lg border bg-card p-6">
		<h2 class="text-sm font-medium text-muted-foreground">Total Revenue (Sold Items)</h2>
		<p class="mt-2 text-3xl font-bold">{formatPrice(stats.totalRevenue)}</p>
	</div>
</div>