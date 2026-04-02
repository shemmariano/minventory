import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createUser } from '$lib/server/auth';
import { z } from 'zod';

const RegisterSchema = z.object({
	username: z.string().min(3, 'Username must be at least 3 characters').max(50),
	password: z.string().min(8, 'Password must be at least 8 characters')
});

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	const parsed = RegisterSchema.safeParse(body);

	if (!parsed.success) {
		return json(
			{ message: 'Invalid request body', issues: z.treeifyError(parsed.error) },
			{ status: 400 }
		);
	}
	try {
		const userId = await createUser(parsed.data.username, parsed.data.password);
		return json({ success: true, userId }, { status: 201 });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		return json({ message }, { status: 400 });
	}
};
