import type { Handle } from '@sveltejs/kit';
import { lucia } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
	const sessionId = event.cookies.get(lucia.sessionCookieName);

	if (!sessionId) {
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	// validate session
	const { session, user } = await lucia.validateSession(sessionId);

	// update cookie if session is valid
	if (session && session.fresh) {
		const sessionCookie = lucia.createSessionCookie(session.id);
		event.cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '.',
			...sessionCookie.attributes
		});
	}

	// clear cookie for invalid session
	if (!session) {
		const blankCookie = lucia.createBlankSessionCookie();
		event.cookies.set(blankCookie.name, blankCookie.value, {
			path: '.',
			...blankCookie.attributes
		});
	}

	// assign to locals
	event.locals.session = session;
	event.locals.user = user;

	return resolve(event);
};
