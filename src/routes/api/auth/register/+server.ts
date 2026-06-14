import { z } from 'zod';
import { json, type RequestHandler } from '@sveltejs/kit';
import { createUser } from '$lib/server/auth';
import { error } from 'console';

const RegisterSchema = z.object({
	username: z.string().min(1, 'Username is required'),
	password: z.string().min(1, 'Password is required')
});

export const POST: RequestHandler = async (event) => {
	// get request body and parse
	const body = await event.request.json().catch(() => null);
	const parsed = RegisterSchema.safeParse(body);

	if (!parsed.success) {
		return json(
			{ message: 'Invalid request body', issues: z.treeifyError(parsed.error) },
			{ status: 400 }
		);
	}

	const { username, password } = parsed.data;

	try {
		const userId = await createUser(username, password);
		return json({ success: true, userId });
	} catch (error) {
		if (error instanceof Error && error.message === 'Username already taken') {
			return json({ message: error.message }, { status: 409 });
		}
		throw error;
	}
};
