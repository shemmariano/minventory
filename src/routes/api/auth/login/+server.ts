import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateCredentials, createSession } from '$lib/server/auth';
import { z } from 'zod';

const LoginSchema = z.object({
	username: z.string().min(1, 'Username is required'),
	password: z.string().min(1, 'Password is required')
});

export const POST: RequestHandler = async (event) => {
	// get request body and parse
	const body = await event.request.json().catch(() => null);
	const parsed = LoginSchema.safeParse(body);

	if (!parsed.success) {
		return json(
			{ message: 'Invalid request body', issues: z.treeifyError(parsed.error) },
			{ status: 400 }
		);
	}

	// validate credentials
	const { username, password } = parsed.data;
	const userId = await validateCredentials(username, password);

	if (!userId) {
		return json({ message: 'Invalid username or password' }, { status: 401 });
	}

	// create session
	await createSession(event, userId);

	return json({ success: true, username });
};
