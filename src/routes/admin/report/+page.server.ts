import type { PageServerLoad } from "./$types";
import { db } from "$lib/server/db";
import { products } from "$lib/server/db/schema";
import { count, sum, eq, sql, desc } from "drizzle-orm";

export const load: PageServerLoad = async () => {
	const [counts, revenue, recentProducts, brandStats] = await Promise.all([
		db
			.select({ status: products.status, count: count() })
			.from(products)
			.groupBy(products.status),

		db
			.select({ total: sum(products.price) })
			.from(products)
			.where(eq(products.status, "sold")),

		db
			.select()
			.from(products)
			.orderBy(desc(products.createdAt))
			.limit(10),

		db
			.select({
				brand: products.brand,
				count: count(),
				totalValue: sql<string>`coalesce(sum(${products.price}), 0)`
			})
			.from(products)
			.groupBy(products.brand)
			.orderBy(desc(count()))
			.limit(10)
	]);

	const totalItems = counts.reduce((acc, c) => acc + c.count, 0);
	const availableCount = counts.find((c) => c.status === "available")?.count ?? 0;
	const reservedCount = counts.find((c) => c.status === "reserved")?.count ?? 0;
	const soldCount = counts.find((c) => c.status === "sold")?.count ?? 0;
	const totalRevenue = revenue[0]?.total ?? "0";

	return {
		totalItems,
		availableCount,
		reservedCount,
		soldCount,
		totalRevenue,
		recentProducts,
		brandStats
	};
};
