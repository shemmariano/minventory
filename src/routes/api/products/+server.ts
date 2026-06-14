import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { products } from '$lib/server/db/schema';
import { error, json } from '@sveltejs/kit';
import { CreateProductSchema } from '$lib/schemas/product';
import { z } from 'zod';

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

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return error(401, 'Unauthorized');
	}

	const body = await request.json().catch(() => null);
	const parsed = CreateProductSchema.safeParse(body);

	if (!parsed.success) {
		return json(
			{ message: 'Invalid request body', issues: z.treeifyError(parsed.error) },
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
			notes: parsed.data.notes
		})
		.returning()
		.then((rows) => rows[0]);

	return json(product, { status: 201 });
};
