import { createUser } from '$lib/server/auth';
import { fail, isRedirect, redirect, type Actions } from '@sveltejs/kit';
import { z } from 'zod';

const RegisterSchema = z.object({
	username: z.string().min(3, 'Username must be at least 3 characters').max(50),
	password: z.string().min(8, 'Password must be at least 8 characters')
});

export const actions: Actions = {
	default: async (event) => {
		const formData = await event.request.formData();
		const parsed = RegisterSchema.safeParse({
			username: formData.get('username'),
			password: formData.get('password')
		});

		if (!parsed.success) {
			return fail(400, { message: 'Invalid input' });
		}

		try {
			const userId = await createUser(parsed.data.username, parsed.data.password);
			console.log(userId);
			throw redirect(303, '/login');
		} catch (error) {
			if (isRedirect(error)) {
				throw error;
			}
			const message = error instanceof Error ? error.message : 'Unknown error';
			return fail(400, { message });
		}
	}
};
