import { Lucia } from 'lucia';
import { dev } from '$app/environment';
import { db } from './db';
import { sessions, users } from './db/schema';
import { DrizzlePostgreSQLAdapter } from '@lucia-auth/adapter-drizzle';

import { error, type RequestEvent } from '@sveltejs/kit';
import { hash, verify } from '@node-rs/argon2';
import { generateIdFromEntropySize } from 'lucia';
import { eq } from 'drizzle-orm';

const adapter = new DrizzlePostgreSQLAdapter(db, sessions, users);

export const lucia = new Lucia(adapter, {
	sessionCookie: {
		attributes: {
			secure: !dev
		}
	},
	getUserAttributes: (attributes) => {
		return {
			username: attributes.username
		};
	}
});

declare module 'lucia' {
	interface Register {
		Lucia: typeof lucia;
		DatabaseUserAttributes: {
			username: string;
		};
	}
}

// Create new user with hashed password. Returns user ID on success
export async function createUser(username: string, password: string): Promise<string> {
	const existing = await db
		.select()
		.from(users)
		.where(eq(users.username, username))
		.then((rows) => rows[0]);

	if (existing) {
		throw new Error('Username already taken.');
	}

	// Hash password using Argon2id
	const passwordHash = await hash(password, {
		memoryCost: 19456, // 19MB memory
		timeCost: 2, // 2 iterations
		outputLen: 32,
		parallelism: 1
	});

	// Generate random user ID
	const userId = generateIdFromEntropySize(15);

	// Insert new user to db
	await db.insert(users).values({
		id: userId,
		username,
		passwordHash
	});

	return userId;
}

// returns user ID if valid, null if invalid
export async function validateCredentials(
	username: string,
	password: string
): Promise<string | null> {
	const user = await db
		.select()
		.from(users)
		.where(eq(users.username, username))
		.then((rows) => rows[0]);

	if (!user) return null;

	const isValid = await verify(user.passwordHash, password, {
		memoryCost: 19456,
		timeCost: 2,
		outputLen: 32,
		parallelism: 1
	});

	if (!isValid) return null;

	return user.id;
}

// creates session and set session cookie, after successful login
export async function createSession(event: RequestEvent, userId: string): Promise<void> {
	const session = await lucia.createSession(userId, {});
	const sessionCookie = lucia.createSessionCookie(session.id);

	event.cookies.set(sessionCookie.name, sessionCookie.value, {
		path: '.',
		...sessionCookie.attributes
	});
}

// invalidate session and clear cookie, on logout
export async function invalidateSession(event: RequestEvent): Promise<void> {
	const sessionId = event.locals.session?.id;
	if (sessionId) {
		await lucia.invalidateSession(sessionId);
	}

	const blankCookie = lucia.createBlankSessionCookie();
	event.cookies.set(blankCookie.name, blankCookie.value, {
		path: '.',
		...blankCookie.attributes
	});
}

// protected routes
export function requireAuth(event: RequestEvent): void {
	if (!event.locals.user) {
		throw error(401, 'Unauthorized');
	}
}
