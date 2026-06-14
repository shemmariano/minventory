import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { products } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const allProducts = await db.select().from(products).orderBy(desc(products.createdAt));

	return { products: allProducts };
};
