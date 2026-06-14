import { hash, verify } from '@node-rs/argon2';
import { createHmac } from 'node:crypto';
import { db } from './db';
import { users } from './db/schema';
import { eq } from 'drizzle-orm';
import { error, type RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const COOKIE_NAME = 'auth_token';

function getSecret(): string {
	return env.AUTH_SECRET || 'dev-secret-change-in-production';
}

function signToken(userId: string): string {
	const secret = getSecret();
	const sig = createHmac('sha256', secret).update(userId).digest('hex');
	return `${userId}.${sig}`;
}

function verifyToken(token: string): string | null {
	const [userId, sig] = token.split('.');
	if (!userId || !sig) return null;
	const secret = getSecret();
	const expected = createHmac('sha256', secret).update(userId).digest('hex');
	return sig === expected ? userId : null;
}

export async function createUser(username: string, password: string): Promise<string> {
	const existing = await db
		.select()
		.from(users)
		.where(eq(users.username, username))
		.then((rows) => rows[0]);
	if (existing) {
		throw new Error('Username already taken');
	}

	const passwordHash = await hash(password, {
		memoryCost: 19456,
		timeCost: 2,
		outputLen: 32,
		parallelism: 1
	});

	const result = await db
		.insert(users)
		.values({
			username,
			passwordHash
		})
		.returning({ id: users.id });

	return result[0].id;
}

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

export async function createSession(event: RequestEvent, userId: string): Promise<void> {
	const token = signToken(userId);
	event.cookies.set(COOKIE_NAME, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !event.url.protocol.includes('http:') && event.url.hostname !== 'localhost',
		maxAge: 60 * 60 * 24 * 7
	});
}

export async function invalidateSession(event: RequestEvent): Promise<void> {
	event.cookies.delete(COOKIE_NAME, { path: '/' });
}

export async function getUserFromSession(event: RequestEvent) {
	const token = event.cookies.get(COOKIE_NAME);
	if (!token) return null;
	const userId = verifyToken(token);
	if (!userId) return null;
	const user = await db
		.select()
		.from(users)
		.where(eq(users.id, userId))
		.then((rows) => rows[0]);
	return user ? { id: user.id, username: user.username } : null;
}

export function requireAuth(event: RequestEvent): void {
	if (!event.locals.user) {
		throw error(401, 'Unauthorized');
	}
}