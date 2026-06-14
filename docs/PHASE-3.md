# Phase 3 — Authentication

Phase 3 adds user authentication to protect your admin routes. By the end, you'll have
login/logout working and protected API routes that only authenticated users can access.

---

## The Mental Model for Auth

Authentication in SvelteKit has three layers:

```
1. Database layer    — users table (credentials + hashed password)
2. Server layer      — HMAC-signed cookie validates the user on each request
3. Route layer       — hooks check for valid user before allowing access
```

When someone logs in:

- Their password is verified against the hashed password in `users`
- An HMAC-signed token is created containing the user ID
- That token is sent to the browser as an HTTP-only cookie
- On every request, the server verifies the cookie signature and looks up the user

When someone logs out:

- The cookie is cleared from the browser
- No server state to clean up — cookie-based, no sessions table

---

## Step 1 — Install dependencies

The only auth dependency you need is already installed:

```bash
# Already present in the project:
npm install @node-rs/argon2
```

**What it does:**

- `@node-rs/argon2` — Argon2id password hashing via native bindings. Fast and secure.

**What we DON'T need (removed from the original plan):**

- `lucia` — not needed; we manage cookies directly with SvelteKit's built-in `cookies` API
- `@oslojs/encoding` — not needed; our approach uses simple HMAC + hex
- `@lucia-auth/adapter-drizzle` — not needed; no sessions table

We also **remove the `sessions` table** from the database. Every login creates a
cookie; no server-side session storage is required.

---

## Step 2 — Create the auth module

Create `src/lib/server/auth.ts`:

```ts
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

/**
 * Create a new user with a hashed password.
 * Returns the user ID on success.
 */
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

	const userId = crypto.randomUUID();

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
 * Create a session token and set it as a cookie.
 * Call this after successful login.
 */
export async function createSession(event: RequestEvent, userId: string): Promise<void> {
	const token = signToken(userId);
	event.cookies.set(COOKIE_NAME, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !event.url.protocol.includes('http:') && event.url.hostname !== 'localhost',
		maxAge: 60 * 60 * 24 * 7 // 7 days
	});
}

/**
 * Invalidate the session by clearing the cookie.
 * Call this on logout.
 */
export async function invalidateSession(event: RequestEvent): Promise<void> {
	event.cookies.delete(COOKIE_NAME, { path: '/' });
}

/**
 * Resolve the current user from the cookie, or null if not authenticated.
 */
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

**Why HMAC instead of sessions table?**

Traditional auth stores session rows in the database — every request hits the DB
to check if the session is valid. HMAC-signed cookies eliminate the DB lookup
for session validation. The server signs the user ID with a secret key; if the
signature matches, the token is authentic. This is simpler and faster for a
single-admin tool.

**Why is there still a DB query in `getUserFromSession`?**

We still query the `users` table to get the username. This is a single-row
lookup by primary key — it's fast and the data fits in Postgres's cache. We
could embed the username in the token, but that would prevent us from revoking
access if the user is deleted.

---

## Step 3 — Create the auth hooks

Hooks run on every request and resolve the current user from the cookie.

Create `src/hooks.server.ts`:

```ts
import type { Handle } from '@sveltejs/kit';
import { getUserFromSession } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = await getUserFromSession(event);
	return resolve(event);
};
```

**What is `event.locals`?**

It's a SvelteKit object that holds data for the duration of a request.
Anything you put here is available in all server routes, form actions, and
load functions during that request.

Compare this to the Lucia version: no session rotation, no blank cookies, no
Lucia adapter. Just one function call.

---

## Step 4 — Add types for locals

Update `src/app.d.ts` to include the user type:

```ts
// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			user: { id: string; username: string } | null;
		}
	}
}

export {};
```

Note: we removed the `session` field from Locals since we no longer track
sessions server-side.

---

## Step 5 — Update the database schema

Remove the `sessions` table from `src/lib/server/db/schema.ts`. The `users`
table stays but `id` can now use Postgres-native `uuid`:

```ts
export const users = pgTable('users', {
	id: uuid('id').defaultRandom().primaryKey(),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	createdAt: timestamp('created_at').notNull().defaultNow()
});
```

Run a migration to drop the sessions table:

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
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

	const userId = await validateCredentials(username, password);
	if (!userId) {
		return json({ message: 'Invalid username or password' }, { status: 401 });
	}

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

---

## Step 7 — Create the login page

### 7a — Login form action (handles both form POST and API login)

Create `src/routes/login/+page.server.ts`:

```ts
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
```

### 7b — Create login page

Create `src/routes/login/+page.svelte`:

```svelte
<script lang="ts">
	import { enhance } from '$app/forms';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Spinner } from '$lib/components/ui/spinner';
	import LogoBrand from '$lib/components/app/LogoBrand.svelte';
	let { form } = $props();

	let loading = $state<boolean>(false);
</script>

<div class="flex h-screen w-full flex-col items-center justify-center gap-8">
	<LogoBrand width="48" height="48" textColor="text-primary dark:text-primary" />
	<form
		method="POST"
		action=""
		use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				await update();
				loading = false;
			};
		}}
		class="flex h-fit w-80 flex-col gap-8 p-4 *:w-full"
	>
		<div class="flex flex-col gap-4">
			<span>
				<Label for="username" class="pb-2"
					>Username <span class="text-destructive dark:text-destructive">*</span></Label
				>
				<Input id="username" type="text" name="username" placeholder="Enter username" required />
			</span>
			<span>
				<Label for="password" class="pb-2"
					>Password <span class="text-destructive dark:text-destructive">*</span></Label
				>
				<Input
					id="password"
					type="password"
					name="password"
					placeholder="Enter password"
					required
				/>
			</span>
		</div>

		<div class="flex flex-col gap-3">
			{#if form?.message}
				<span class="text-center text-destructive dark:text-destructive">{form.message}</span>
			{/if}
			<Button disabled={loading} type="submit">
				{#if loading}
					<Spinner />
					Logging in
				{:else}
					Login
				{/if}
			</Button>
		</div>
	</form>
</div>
```

### 7c — Create admin layout with auth check

Create `src/routes/admin/+layout.server.ts`:

```ts
import { redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
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
	import { SidebarInset, SidebarProvider, SidebarTrigger } from '$lib/components/ui/sidebar';
	import AppSidebar from '$lib/components/app/AppSidebar.svelte';
	import DarkMode from '$lib/components/app/DarkMode.svelte';
	import { Toaster } from '$lib/components/ui/sonner';

	let { children } = $props();
</script>

<Toaster position="top-center" />
<SidebarProvider>
	<AppSidebar />
	<SidebarInset>
		<header class="flex h-12 w-full border-b">
			<div class="flex aspect-square h-full items-center justify-center border-r">
				<SidebarTrigger class="h-full w-full rounded-none" />
			</div>
			<div class="justify-centers ms-auto flex aspect-square h-full items-center">
				<DarkMode />
			</div>
		</header>
		<main class="p-4">
			{@render children?.()}
		</main>
	</SidebarInset>
</SidebarProvider>
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
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { products } from '$lib/server/db/schema';
import { error, json } from '@sveltejs/kit';
import { CreateProductSchema } from '$lib/schemas/product';
import { z } from 'zod';

// GET remains public (or make it private if you prefer)
export const GET: RequestHandler = async ({ url }) => {
	const status = url.searchParams.get('status');

	const allProducts = status
		? await db
				.select()
				.from(products)
				.where(eq(products.status, status as 'available' | 'reserved' | 'sold'))
		: await db.select().from(products);

	return json(allProducts);
};

// POST requires authentication
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return error(401, 'Unauthorized');
	}

	const body = await request.json().catch(() => null);
	const parsed = CreateProductSchema.safeParse(body);

	if (!parsed.success) {
		return json(
			{ message: 'Invalid request body', issues: z.treeifyError(parsed.error) },
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

For initial setup, you can create a user via the register page or Drizzle Studio.
A register page is provided for convenience during development.

Add `AUTH_SECRET` to your `.env` file:

```bash
AUTH_SECRET=your-random-secret-here
```

This secret is used to sign the auth cookies. Generate a strong one:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Step 10 — Test the flow

1. Visit `http://localhost:5173/admin` while logged out
   - You should be redirected to `/login`

2. Register a new user at `/register`
   - You should be redirected to `/login`

3. Log in with your credentials
   - You should be redirected to `/admin`
   - The auth cookie is set

4. Try creating a product via the API without authentication

   ```bash
   curl -X POST http://localhost:5173/api/products \
     -H "Content-Type: application/json" \
     -d '{"name": "Test", "brand": "Test", "price": 100}'
   ```

   - You should get a 401 Unauthorized

5. Try creating a product via the API with authentication

   ```bash
   # Get the cookie from your browser dev tools and pass it:
   curl -X POST http://localhost:5173/api/products \
     -H "Content-Type: application/json" \
     -H "Cookie: auth_token=<your-token>" \
     -d '{"name": "Test", "brand": "Test", "price": 100}'
   ```

   - You should get a 201 Created

6. Log out via the admin UI and verify the cookie is cleared

---

## Complete File Structure After Phase 3

```
src/
├── app.d.ts                    ← Updated with Locals types (no session)
├── hooks.server.ts             ← Resolves user from cookie
├── lib/
│   ├── server/
│   │   ├── auth.ts             ← HMAC-signed cookie auth + helpers
│   │   └── db/
│   │       ├── schema.ts       ✅ Phase 1 (users table only; sessions removed)
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
│   │   │   └── logout/
│   │   │       └── +server.ts  ← POST logout
│   │   └── products/           ← Now protected
│   │       └── ...
│   │
│   ├── admin/                  ← Protected routes
│   │   ├── +layout.server.ts   ← Auth check
│   │   ├── +layout.svelte      ← Admin shell
│   │   └── +page.svelte        ← Dashboard
│   │
│   └── login/
│       └── +page.svelte        ← Login form
│
└── ...
```

---

## Phase 3 Summary

| Component               | Purpose                                                    |
| ----------------------- | ---------------------------------------------------------- |
| `@node-rs/argon2`       | Secure Argon2id password hashing (native Node.js bindings) |
| `hooks.server.ts`       | Resolves current user from cookie on every request         |
| `AUTH_SECRET` env var   | Signing key for auth tokens                                |
| `locals.user`           | Access current user in any server route                    |

---

## You're ready for Phase 4

Phase 4 is the admin product management UI — a SvelteKit frontend that uses
the protected API routes you just created to list, create, edit, and delete products.

By now you understand:

- How HMAC-signed cookies work (sign → cookie → verify → user)
- How to protect routes (hooks + locals check)
- How to hash passwords securely
- How cookie-based auth eliminates the need for a sessions table