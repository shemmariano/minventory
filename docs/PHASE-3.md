# Phase 3 — Authentication with Lucia

Phase 3 adds user authentication to protect your admin routes. By the end, you'll have
login/logout working and protected API routes that only authenticated users can access.

---

## The Mental Model for Auth

Authentication in SvelteKit has three layers:

```
1. Database layer    — users table (credentials) + sessions table (active logins)
2. Server layer      — Lucia validates cookies against sessions table
3. Route layer       — hooks check for valid session before allowing access
```

When someone logs in:

- Their password is verified against the hashed password in `users`
- A new row is created in `sessions` with a random ID
- That ID is sent to the browser as a cookie
- On every request, Lucia checks the cookie against the `sessions` table

When someone logs out:

- The session row is deleted from the database
- The cookie is cleared from the browser

---

## Step 1 — Install dependencies

```bash
npm install lucia @node-rs/argon2 @oslojs/encoding
```

**What each package does:**

- `lucia` — the auth library. Handles sessions, cookies, and validation
- `@node-rs/argon2` — Argon2id password hashing via native bindings. Fast, secure, and recommended by Lucia v3 for Node.js
- `@oslojs/encoding` — utilities for encoding/decoding session data

---

## Step 2 — Create Lucia initialization file

Create `src/lib/server/auth.ts`:

```ts
import { Lucia } from 'lucia';
import { dev } from '$app/environment';
import { db } from './db';
import { sessions, users } from './db/schema';
import { DrizzlePostgreSQLAdapter } from '@lucia-auth/adapter-drizzle';

// Create the Drizzle adapter — connects Lucia to your database
const adapter = new DrizzlePostgreSQLAdapter(db, sessions, users);

// Initialize Lucia with your adapter and configuration
export const lucia = new Lucia(adapter, {
	sessionCookie: {
		attributes: {
			// secure: true in production, false in dev (no HTTPS locally)
			secure: !dev
		}
	},
	getUserAttributes: (attributes) => {
		// Expose these fields from the user table to the session
		return {
			username: attributes.username
		};
	}
});

// Type declarations for Lucia
// This tells TypeScript what your auth types look like
declare module 'lucia' {
	interface Register {
		Lucia: typeof lucia;
		DatabaseUserAttributes: {
			username: string;
		};
	}
}
```

**Why do we need `getUserAttributes`?**
Lucia only stores the user ID in the session by default. If you want to access
the username (or any other user field) without an extra DB query, you declare
it here. Then you can use `session.user.username` directly.

---

## Step 3 — Create auth helper functions

Add to `src/lib/server/auth.ts`:

```ts
import { error, redirect, type RequestEvent } from '@sveltejs/kit';
import { hash, verify } from '@node-rs/argon2';
import { generateIdFromEntropySize } from 'lucia';
import { db } from './db';
import { users } from './db/schema';
import { eq } from 'drizzle-orm';

/**
 * Create a new user with a hashed password.
 * Returns the user ID on success.
 */
export async function createUser(username: string, password: string): Promise<string> {
	// Check if username already exists
	const existing = await db
		.select()
		.from(users)
		.where(eq(users.username, username))
		.then((rows) => rows[0]);
	if (existing) {
		throw new Error('Username already taken');
	}

	// Hash the password with Argon2id
	const passwordHash = await hash(password, {
		memoryCost: 19456,
		timeCost: 2,
		outputLen: 32,
		parallelism: 1
	});

	// Generate a random user ID (Lucia recommends 15+ bytes)
	const userId = generateIdFromEntropySize(15);

	// Insert the new user
	await db.insert(users).values({
		id: userId,
		username,
		passwordHash
	});

	return userId;
}

/**
 * Validate username/password and return the user ID if valid.
 * Returns null if invalid.
 */
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

/**
 * Create a session and set the session cookie.
 * Call this after successful login.
 */
export async function createSession(event: RequestEvent, userId: string): Promise<void> {
	const session = await lucia.createSession(userId, {});
	const sessionCookie = lucia.createSessionCookie(session.id);

	event.cookies.set(sessionCookie.name, sessionCookie.value, {
		path: '.',
		...sessionCookie.attributes
	});
}

/**
 * Invalidate the session and clear the cookie.
 * Call this on logout.
 */
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

/**
 * Require authentication for a route.
 * Use in server routes that should be protected.
 */
export function requireAuth(event: RequestEvent): void {
	if (!event.locals.user) {
		throw error(401, 'Unauthorized');
	}
}
```

---

## Step 4 — Create the auth hooks

Hooks run on every request and are the entry point for session validation.

Create `src/hooks.server.ts`:

```ts
import type { Handle } from '@sveltejs/kit';
import { lucia } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
	// 1. Get the session ID from the cookie
	const sessionId = event.cookies.get(lucia.sessionCookieName);

	// 2. If no session cookie, set null and continue
	if (!sessionId) {
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	// 3. Validate the session with Lucia
	const { session, user } = await lucia.validateSession(sessionId);

	// 4. If session is valid but was rotated, update the cookie
	if (session && session.fresh) {
		const sessionCookie = lucia.createSessionCookie(session.id);
		event.cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '.',
			...sessionCookie.attributes
		});
	}

	// 5. If session is invalid, clear the cookie
	if (!session) {
		const blankCookie = lucia.createBlankSessionCookie();
		event.cookies.set(blankCookie.name, blankCookie.value, {
			path: '.',
			...blankCookie.attributes
		});
	}

	// 6. Attach to locals so routes can access them
	event.locals.user = user;
	event.locals.session = session;

	return resolve(event);
};
```

**What is `event.locals`?**
It's a SvelteKit object that holds data for the duration of a request.
Anything you put here is available in all server routes, form actions, and
load functions during that request.

**Why check `session.fresh`?**
Lucia periodically rotates session IDs to prevent session fixation attacks.
When this happens, you need to send the new session ID back to the browser.

---

## Step 5 — Add types for locals

Update `src/app.d.ts` to include the user and session types:

```ts
// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			user: { id: string; username: string } | null;
			session: { id: string; userId: string; expiresAt: Date } | null;
		}
	}
}

export {};
```

---

## Step 6 — Create API routes for auth

### 6a — POST /api/auth/login

Create `src/routes/api/auth/login/+server.ts`:

```ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateCredentials, createSession } from '$lib/server/auth';
import { z } from 'zod';

const LoginSchema = z.object({
	username: z.string().min(1, 'Username is required'),
	password: z.string().min(1, 'Password is required')
});

export const POST: RequestHandler = async (event) => {
	const body = await event.request.json().catch(() => null);
	const parsed = LoginSchema.safeParse(body);

	if (!parsed.success) {
		return json(
			{ message: 'Invalid request body', issues: z.treeifyError(parsed.error) },
			{ status: 400 }
		);
	}

	const { username, password } = parsed.data;

	// Validate credentials
	const userId = await validateCredentials(username, password);
	if (!userId) {
		return json({ message: 'Invalid username or password' }, { status: 401 });
	}

	// Create session and set cookie via auth helper
	await createSession(event, userId);

	return json({ success: true, username });
};
```

### 6b — POST /api/auth/logout

Create `src/routes/api/auth/logout/+server.ts`:

```ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { invalidateSession } from '$lib/server/auth';

export const POST: RequestHandler = async (event) => {
	await invalidateSession(event);
	return json({ success: true });
};
```

### 6c — POST /api/auth/register (for initial setup)

Create `src/routes/api/auth/register/+server.ts`:

```ts
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
			{ message: 'Invalid request body', issues: parsed.error.flatten() },
			{ status: 400 }
		);
	}

	try {
		const userId = await createUser(parsed.data.username, parsed.data.password);
		return json({ success: true, userId }, { status: 201 });
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Unknown error';
		return json({ message }, { status: 400 });
	}
};
```

**Important:** The register endpoint is for initial setup only. In production,
you might want to disable it after creating your admin account or protect it
with an invite code.

---

## Step 7 — Create the login page

### 7a — Create login route

Create `src/routes/login/+page.svelte`:

```svelte
<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	let username = '';
	let password = '';
	let error = '';
	let loading = false;

	async function handleSubmit() {
		error = '';
		loading = true;

		try {
			const res = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password })
			});

			const data = await res.json();

			if (!res.ok) {
				error = data.message || 'Login failed';
				return;
			}

			// Redirect to admin dashboard on success
			goto('/admin');
		} catch (e) {
			error = 'Network error. Please try again.';
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex min-h-screen items-center justify-center">
	<div class="w-full max-w-md space-y-6 rounded-lg border bg-card p-8 shadow-lg">
		<div class="text-center">
			<h1 class="text-2xl font-bold">Admin Login</h1>
			<p class="mt-2 text-muted-foreground">Sign in to manage inventory</p>
		</div>

		<form on:submit|preventDefault={handleSubmit} class="space-y-4">
			<div class="space-y-2">
				<Label for="username">Username</Label>
				<Input
					id="username"
					type="text"
					bind:value={username}
					placeholder="Enter your username"
					required
				/>
			</div>

			<div class="space-y-2">
				<Label for="password">Password</Label>
				<Input
					id="password"
					type="password"
					bind:value={password}
					placeholder="Enter your password"
					required
				/>
			</div>

			{#if error}
				<div class="rounded bg-destructive/10 p-3 text-sm text-destructive">
					{error}
				</div>
			{/if}

			<Button type="submit" class="w-full" disabled={loading}>
				{loading ? 'Signing in...' : 'Sign In'}
			</Button>
		</form>
	</div>
</div>
```

### 7b — Create admin layout with auth check

Create `src/routes/admin/+layout.server.ts`:

```ts
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	// If not logged in, redirect to login page
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	return {
		user: locals.user
	};
};
```

Create `src/routes/admin/+layout.svelte`:

```svelte
<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';

	export let data;

	async function logout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		goto('/login');
	}
</script>

<div class="min-h-screen">
	<header class="border-b bg-card">
		<div class="container mx-auto flex h-16 items-center justify-between px-4">
			<div class="text-lg font-bold">Inventory Admin</div>
			<div class="flex items-center gap-4">
				<span class="text-sm text-muted-foreground">
					Logged in as {data.user.username}
				</span>
				<Button variant="outline" size="sm" on:click={logout}>Logout</Button>
			</div>
		</div>
	</header>

	<main class="container mx-auto px-4 py-8">
		<slot />
	</main>
</div>
```

Create `src/routes/admin/+page.svelte`:

```svelte
<script lang="ts">
	// Admin dashboard placeholder
</script>

<div class="space-y-6">
	<h1 class="text-3xl font-bold">Dashboard</h1>
	<p class="text-muted-foreground">Welcome to the admin dashboard. Protected routes are working!</p>

	<div class="grid gap-4 md:grid-cols-3">
		<a
			href="/admin/products"
			class="block rounded-lg border bg-card p-6 transition-colors hover:border-primary"
		>
			<h2 class="mb-2 font-semibold">Products</h2>
			<p class="text-sm text-muted-foreground">Manage your inventory</p>
		</a>
	</div>
</div>
```

---

## Step 8 — Protect your product API routes

Update `src/routes/api/products/+server.ts` to require authentication:

```ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { products } from '$lib/server/db/schema';
import { CreateProductSchema } from '$lib/schemas/product';
import { eq } from 'drizzle-orm';

// GET remains public (or make it private if you prefer)
export const GET: RequestHandler = async () => {
	const allProducts = await db.select().from(products);
	return json(allProducts);
};

// POST requires authentication
export const POST: RequestHandler = async ({ request, locals }) => {
	// Check authentication
	if (!locals.user) {
		return error(401, 'Unauthorized');
	}

	const body = await request.json().catch(() => null);
	const parsed = CreateProductSchema.safeParse(body);

	if (!parsed.success) {
		return json(
			{ message: 'Invalid request body', issues: parsed.error.flatten() },
			{ status: 400 }
		);
	}

	const product = await db
		.insert(products)
		.values({
			name: parsed.data.name,
			brand: parsed.data.brand,
			price: String(parsed.data.price),
			status: parsed.data.status ?? 'available',
			imageUrl: parsed.data.imageUrl,
			notes: parsed.data.notes
		})
		.returning()
		.then((rows) => rows[0]);

	return json(product, { status: 201 });
};
```

Do the same for `src/routes/api/products/[id]/+server.ts` — add the auth check
to PUT, PATCH, and DELETE handlers. GET can remain public or be protected based
on your needs.

---

## Step 9 — Create an admin user

With your dev server running, use curl or a REST client to create your first admin:

```bash
curl -X POST http://localhost:5173/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "your-secure-password"}'
```

You should get:

```json
{ "success": true, "userId": "some-random-id" }
```

---

## Step 10 — Test the flow

1. Visit `http://localhost:5173/admin` while logged out
   - You should be redirected to `/login`

2. Log in with your credentials
   - You should be redirected to `/admin`
   - You should see your username in the header

3. Try creating a product via the API without authentication

   ```bash
   curl -X POST http://localhost:5173/api/products \
     -H "Content-Type: application/json" \
     -d '{"name": "Test", "brand": "Test", "price": 100}'
   ```

   - You should get a 401 Unauthorized

4. Check Drizzle Studio to see your session:

   ```bash
   npm run db:studio
   ```

   - You should see a row in the `sessions` table

5. Log out and verify the session is deleted from the database

---

## Complete File Structure After Phase 3

```
src/
├── app.d.ts                    ← Updated with Locals types
├── hooks.server.ts             ← Session validation on every request
├── lib/
│   ├── server/
│   │   ├── auth.ts             ← Lucia setup + helper functions
│   │   └── db/
│   │       ├── schema.ts       ✅ Phase 1 (users & sessions defined)
│   │       ├── index.ts        ✅ Phase 1
│   │       └── seed.ts         ✅ Phase 1
│   └── schemas/
│       └── product.ts          ✅ Phase 2
│
├── routes/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   │   └── +server.ts  ← POST login
│   │   │   ├── logout/
│   │   │   │   └── +server.ts  ← POST logout
│   │   │   └── register/
│   │   │       └── +server.ts  ← POST register
│   │   └── products/           ← Now protected
│   │       └── ...
│   │
│   ├── admin/                  ← Protected routes
│   │   ├── +layout.server.ts   ← Auth check
│   │   ├── +layout.svelte      ← Admin shell with logout
│   │   └── +page.svelte        ← Dashboard
│   │
│   └── login/
│       └── +page.svelte        ← Login form
│
└── ...
```

---

## Phase 3 Summary

| Component         | Purpose                                                    |
| ----------------- | ---------------------------------------------------------- |
| `lucia`           | Session management and cookie handling                     |
| `@node-rs/argon2` | Secure Argon2id password hashing (native Node.js bindings) |
| `hooks.server.ts` | Validates session on every request                         |
| `locals.user`     | Access current user in any server route                    |
| `locals.session`  | Access current session for logout                          |

---

## You're ready for Phase 4

Phase 4 is the admin product management UI — a SvelteKit frontend that uses
the protected API routes you just created to list, create, edit, and delete products.

By now you understand:

- How sessions work (cookie ↔ database ↔ validation)
- How to protect routes (hooks + locals check)
- How to hash passwords securely
- How to create and destroy sessions on login/logout
