import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { invalidateSession } from '$lib/server/auth';

export const POST: RequestHandler = async (event) => {
	await invalidateSession(event);
	return json({ success: true });
};
