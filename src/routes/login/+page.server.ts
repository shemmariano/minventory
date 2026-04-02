import { createSession, validateCredentials } from '$lib/server/auth';
import { fail, redirect, type Actions } from '@sveltejs/kit';
import { z } from 'zod';

const LoginSchema = z.object({
	username: z.string().min(1, 'Username is required'),
	password: z.string().min(1, 'Password is required')
});

export const actions: Actions = {
	default: async (event) => {
		const formData = await event.request.formData();
		const parsed = LoginSchema.safeParse({
			username: formData.get('username'),
			password: formData.get('password')
		});

		if (!parsed.success) {
			return fail(400, { message: 'Invalid input' });
		}

		const { username, password } = parsed.data;
		const userId = await validateCredentials(username, password);

		if (!userId) {
			return fail(401, { message: 'Invalid username or password' });
		}

		await createSession(event, userId);

		throw redirect(303, '/admin');
	}
};
