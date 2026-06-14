import { db } from '$lib/server/db';
import { products } from '$lib/server/db/schema';
import { sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const stats = await db
		.select({
			total: sql<number>`count(*)`,
			available: sql<number>`count(*) filter (where status = 'available')`,
			reserved: sql<number>`count(*) filter (where status = 'reserved')`,
			sold: sql<number>`count(*) filter (where status = 'sold')`,
			totalRevenue: sql<string>`coalesce(sum(price) filter (where status = 'sold'), 0)`
		})
		.from(products)
		.then((rows) => rows[0]);

	return { stats };
};