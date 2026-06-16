<script lang="ts">
import type { PageData } from './$types';
import * as Card from '$lib/components/ui/card';
import * as Table from '$lib/components/ui/table';
import * as Separator from '$lib/components/ui/separator';
import { Calendar } from '$lib/components/ui/calendar';
import { Badge } from '$lib/components/ui/badge';
import { CalendarDays, Package, TrendingUp, CircleDollarSign, Activity } from '@lucide/svelte';
import { DateFormatter, getLocalTimeZone, today, type DateValue } from '@internationalized/date';

	let { data }: { data: PageData } = $props();

	const { stats, recentProducts, user } = data;

	const df = new DateFormatter('en-PH', { dateStyle: 'full' });
	const todayDate = today(getLocalTimeZone());

	let selectedDate = $state<DateValue>(todayDate);

	const todayProducts = $derived(
		recentProducts.filter((p) => {
			const pDate = new Date(p.createdAt);
			const todayStr = todayDate.toDate(getLocalTimeZone()).toDateString();
			return pDate.toDateString() === todayStr;
		})
	);

	function formatPrice(price: string) {
		return `₱${parseFloat(price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
	}

	const statusVariant: Record<string, 'secondary' | 'outline' | 'destructive' | 'default'> = {
		available: 'secondary',
		reserved: 'outline',
		sold: 'destructive'
	};

	const summaryCards = [
		{ label: 'Total Items', value: stats.total, icon: Package, color: 'text-primary' },
		{ label: 'Available', value: stats.available, icon: Activity, color: 'text-green-600' },
		{ label: 'Reserved', value: stats.reserved, icon: CalendarDays, color: 'text-yellow-600' },
		{ label: 'Sold', value: stats.sold, icon: TrendingUp, color: 'text-destructive' }
	];
</script>

<div class="flex flex-col gap-8">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">Dashboard</h1>
			<p class="text-muted-foreground mt-1 text-sm">{df.format(todayDate.toDate(getLocalTimeZone()))}</p>
		</div>
	</div>

	<div class="grid gap-4 md:grid-cols-4">
		{#each summaryCards as card (card.label)}
			<Card.Root size="sm">
				<Card.Header>
					<div class="flex items-center justify-between">
						<Card.Title>{card.label}</Card.Title>
						<card.icon class="size-4 {card.color}" />
					</div>
				</Card.Header>
				<Card.Content>
					<p class="text-2xl font-bold">{card.value}</p>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>

	<div class="grid gap-6 lg:grid-cols-2">
		<Card.Root>
			<Card.Header>
				<Card.Title>User Details</Card.Title>
				<Card.Description>Account owner and session information</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="flex flex-col gap-3">
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground text-sm">Username</span>
						<span class="font-medium">{user?.username ?? 'admin'}</span>
					</div>
					<Separator.Root />
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground text-sm">Role</span>
						<Badge variant="secondary">Administrator</Badge>
					</div>
					<Separator.Root />
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground text-sm">Account Status</span>
						<Badge variant="secondary" class="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Active</Badge>
					</div>
					<Separator.Root />
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground text-sm">Total Revenue</span>
						<span class="text-lg font-bold text-primary">{formatPrice(stats.totalRevenue)}</span>
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>
					<div class="flex items-center gap-2">
						<CalendarDays class="size-4" />
						<span>Today</span>
					</div>
				</Card.Title>
				<Card.Description>
					{todayProducts.length} product{todayProducts.length === 1 ? '' : 's'} added today
				</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-col gap-4">
				<Calendar type="single" bind:value={selectedDate} class="mx-auto" />
				{#if todayProducts.length > 0}
					<div class="flex flex-col gap-2">
						<span class="text-muted-foreground text-xs font-medium uppercase tracking-wider">Recent Activity</span>
						{#each todayProducts.slice(0, 5) as product}
							<div class="flex items-center justify-between rounded-md border px-3 py-2">
								<div class="flex flex-col">
									<span class="text-sm font-medium">{product.name}</span>
									<span class="text-muted-foreground text-xs">{product.brand}</span>
								</div>
								<div class="flex items-center gap-3">
									<span class="text-sm font-medium">{formatPrice(product.price)}</span>
									<Badge variant={statusVariant[product.status] ?? 'secondary'} class="capitalize">{product.status}</Badge>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="flex flex-col items-center gap-2 py-6 text-center">
						<CircleDollarSign class="text-muted-foreground size-8" />
						<p class="text-muted-foreground text-sm">No products added today</p>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Recent Products</Card.Title>
			<Card.Description>The 10 most recently added products in the inventory</Card.Description>
		</Card.Header>
		<Card.Content class="p-0">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Name</Table.Head>
						<Table.Head>Brand</Table.Head>
						<Table.Head class="text-right">Price</Table.Head>
						<Table.Head>Status</Table.Head>
						<Table.Head class="text-right">Added</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each recentProducts as product (product.id)}
						<Table.Row>
							<Table.Cell class="font-medium">{product.name}</Table.Cell>
							<Table.Cell class="text-muted-foreground">{product.brand}</Table.Cell>
							<Table.Cell class="text-right font-medium">{formatPrice(product.price)}</Table.Cell>
							<Table.Cell>
								<Badge variant={statusVariant[product.status] ?? 'secondary'} class="capitalize">{product.status}</Badge>
							</Table.Cell>
							<Table.Cell class="text-muted-foreground text-right text-xs">
								{new Date(product.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</Card.Content>
	</Card.Root>
</div>
