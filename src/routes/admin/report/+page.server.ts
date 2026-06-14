import type { PageServerLoad } from "./$types";
import { db } from "$lib/server/db";
import { products } from "$lib/server/db/schema";
import { count, sum, eq } from "drizzle-orm";

export const load: PageServerLoad = async () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [counts, revenue] = await Promise.all([
        
        // count
        db.select({status: products.status, count: count()}).from(products).groupBy(products.status),

        // revenue from sold items
        db.select({total: sum(products.price)}).from(products).where(eq(products.status, "sold"))

    ])

    // console.log(counts);

    return {counts, revenue};
}