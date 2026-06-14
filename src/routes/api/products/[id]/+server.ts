import { db } from '$lib/server/db';
import { products } from '$lib/server/db/schema';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eq } from 'drizzle-orm';
import { UpdateProductSchema } from '$lib/schemas/product';
import { z } from 'zod';

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) {
		return error(401, 'Unauthorized');
	}

	const { id } = params;

	const existing = await db
		.select()
		.from(products)
		.where(eq(products.id, id))
		.then((rows) => rows[0]);

	if (!existing) return error(404, 'Product not found');

	const body = await request.json().catch(() => null);

	console.log(body)

	const parsed = UpdateProductSchema.safeParse(body);

	if (!parsed.success) {
		console.log(z.treeifyError(parsed.error));
		return json(
			{ message: 'Invalid request body', issues: z.treeifyError(parsed.error) },
			{ status: 400 }
		);
	}

	const updated = await db
		.update(products)
		.set({
			name: parsed.data.name,
			brand: parsed.data.brand,
			price: String(parsed.data.price),
			status: parsed.data.status,
			notes: parsed.data.notes,
			updatedAt: new Date()
		})
		.where(eq(products.id, id))
		.returning()
		.then((rows) => rows[0]);

	return json(updated);
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return error(401, 'Unauthorized');
	}

	const { id } = params;

	const existing = await db
		.select()
		.from(products)
		.where(eq(products.id, id))
		.then((rows) => rows[0]);

	if (!existing) return error(404, 'Product not found');

	await db.delete(products).where(eq(products.id, id));

	return new Response(null, { status: 204 });
};
