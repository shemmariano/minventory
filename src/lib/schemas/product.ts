import { z } from 'zod';

export const ProductStatusSchema = z.enum(['available', 'sold', 'reserved']);

export const CreateProductSchema = z.object({
	name: z.string().min(1, 'Name is required').max(255),
	brand: z.string().min(1, 'Brand is required').max(255),
	price: z.coerce.number().positive('Price must be greater than 0'),
	status: ProductStatusSchema.optional(),
	imageUrl: z.string().url('Must be valid URL').optional().nullable(),
	notes: z.string().max(1000).optional().nullable()
});

export const UpdateProductSchema = z.object({
	name: z.string().min(1, 'Name is required').max(255),
	brand: z.string().min(1, 'Brand is required').max(255),
	price: z.coerce.number().positive('Price must be greater than 0'),
	status: ProductStatusSchema.optional(),
	imageUrl: z.string().url('Must be valid URL').optional().nullable(),
	notes: z.string().max(1000).optional().nullable()
});

export const PatchProductSchema = UpdateProductSchema.partial();

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
export type PatchProductInput = z.infer<typeof PatchProductSchema>;
