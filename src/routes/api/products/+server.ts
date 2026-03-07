import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { products } from '$lib/server/db/schema';
import { json } from '@sveltejs/kit';
import { CreateProductSchema } from '$lib/schemas/product';

// get all or by status
export const GET: RequestHandler = async ({ url }) => {
	const status = url.searchParams.get('status');

	const allProducts = status
		? await db
				.select()
				.from(products)
				.where(eq(products.status, status as 'available' | 'reserved' | 'sold'))
		: await db.select().from(products);

	return json(allProducts);
};

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	const parsed = CreateProductSchema.safeParse(body);

	if (!parsed.success) {
		return json(
			{ message: 'Invalid request body', issues: parsed.error.flatten() },
			{ status: 400 }
		);
	}

	const product = await db
		.insert(products)
		.values({
			name: parsed.data.name,
			brand: parsed.data.brand,
			price: String(parsed.data.price),
			status: parsed.data.status ?? 'available',
			imageUrl: parsed.data.imageUrl,
			notes: parsed.data.notes
		})
		.returning()
		.then((rows) => rows[0]);

	return json(product, { status: 201 });
};
