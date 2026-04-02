# Phase 2 — API Routes

## Before You Start

Two carry-overs from Phase 1 to knock out first.

---

### Carry-over 1 — Add DB scripts to package.json

Open your `package.json` and add these to the `scripts` section:

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "db:seed": "tsx src/lib/server/db/seed.ts"
  }
}
```

Now instead of typing `npx drizzle-kit migrate` every time, you just run `npm run db:migrate`.
You'll be using these constantly from Phase 2 onward.

---

### Carry-over 2 — Create `src/lib/schemas/product.ts`

This file defines what *valid* request data looks like for product operations.
You'll import these schemas in your API routes to validate incoming request bodies.

Create the file and paste this in:

```ts
import { z } from 'zod';

export const ProductStatusSchema = z.enum(['available', 'reserved', 'sold']);

// POST /api/products — create a new product
export const CreateProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  brand: z.string().min(1, 'Brand is required').max(255),
  price: z.coerce.number().positive('Price must be greater than 0'),
  status: ProductStatusSchema.optional(),
  imageUrl: z.string().url('Must be a valid URL').optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

// PUT /api/products/[id] — full replacement
export const UpdateProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  brand: z.string().min(1, 'Brand is required').max(255),
  price: z.coerce.number().positive('Price must be greater than 0'),
  status: ProductStatusSchema,
  imageUrl: z.string().url('Must be a valid URL').optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

// PATCH /api/products/[id] — partial update (only changed fields)
export const PatchProductSchema = UpdateProductSchema.partial();

// TypeScript types inferred from schemas — use these in your functions
export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
export type PatchProductInput = z.infer<typeof PatchProductSchema>;
```

**Why Zod?**
Every request body that comes into your API could be anything — malformed JSON,
missing fields, wrong types. Zod validates the shape before you ever touch the DB.
If validation fails, you return a 400 immediately. The DB never sees bad data.

**Why is this in `$lib` and not `$lib/server`?**
Schemas have no secrets — they're just rules. Putting them in `$lib` means you can
reuse them on the client side too (e.g. form validation) without SvelteKit complaining.

---

## The Mental Model for API Routes

Before writing any code, understand this pattern. Every single API route you write
follows this exact shape:

```
1. Parse the request       — what did the client send?
2. Validate the input      — is it the right shape?
3. Check existence         — does the resource exist? (for GET one, PUT, PATCH, DELETE)
4. Do the DB operation     — read or write
5. Return the response     — with the right status code
```

If any step fails, you return early with an error. You never reach the DB with bad data.

---

## File Structure for This Phase

Create these files and folders in your project:

```
src/routes/api/
  products/
    +server.ts          ← GET all, POST create
    [id]/
      +server.ts        ← GET one, PUT, PATCH, DELETE
```

The `[id]` folder is a dynamic route — SvelteKit automatically captures whatever
is in the URL as `params.id`. So `/api/products/some-uuid` gives you `params.id = 'some-uuid'`.

---

## Step 1 — GET all products

Create `src/routes/api/products/+server.ts`:

```ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { products } from '$lib/server/db/schema';

export const GET: RequestHandler = async () => {
  const allProducts = await db.select().from(products);
  return json(allProducts);
};
```

**Test it:** With your dev server running, open your browser and go to:
```
http://localhost:5173/api/products
```
You should see the 5 products from your seed as a JSON array.

This is the simplest possible route — no params, no validation, just read and return.
Get comfortable with this before moving on.

**The Drizzle query explained:**
```ts
db.select().from(products)
// translates to:
// SELECT * FROM products
```

---

## Step 2 — GET one product

Add this to the same `+server.ts` file, OR create `src/routes/api/products/[id]/+server.ts`:

```ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { products } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params }) => {
  const product = await db
    .select()
    .from(products)
    .where(eq(products.id, params.id))
    .then(rows => rows[0]);

  if (!product) return error(404, 'Product not found');

  return json(product);
};
```

**Test it:** Grab one of the UUIDs from your GET all response, then visit:
```
http://localhost:5173/api/products/paste-uuid-here
```

**The Drizzle query explained:**
```ts
db.select().from(products).where(eq(products.id, params.id))
// translates to:
// SELECT * FROM products WHERE id = 'some-uuid'
```

`eq()` is Drizzle's equals operator. You'll use it constantly.
`.then(rows => rows[0])` grabs the first result — SELECT always returns an array,
even when you expect one row.

---

## Step 3 — POST create product

Now you need validation. This is where your Zod schema comes in.

In `src/routes/api/products/+server.ts`, add the POST handler:

```ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { products } from '$lib/server/db/schema';
import { CreateProductSchema } from '$lib/schemas/product';

export const POST: RequestHandler = async ({ request }) => {
  // 1. Parse the request body — wrap in catch in case it's not valid JSON
  const body = await request.json().catch(() => null);

  // 2. Validate against schema
  const parsed = CreateProductSchema.safeParse(body);
  if (!parsed.success) {
    return json(
      { message: 'Invalid request body', issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // 3. Insert into DB
  const product = await db
    .insert(products)
    .values({
      name: parsed.data.name,
      brand: parsed.data.brand,
      price: String(parsed.data.price), // numeric column expects a string
      status: parsed.data.status ?? 'available',
      imageUrl: parsed.data.imageUrl,
      notes: parsed.data.notes,
    })
    .returning()
    .then(rows => rows[0]);

  // 4. Return the created product with 201 status
  return json(product, { status: 201 });
};
```

**Test it with curl:**
```bash
curl -X POST http://localhost:5173/api/products \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Shirt", "brand": "Test Brand", "price": 299}'
```

Or use a REST client like Bruno, Insomnia, or the Thunder Client VS Code extension.

**Why `.safeParse()` and not `.parse()`?**
`.parse()` throws an exception on failure — you'd need a try/catch.
`.safeParse()` returns `{ success: true, data }` or `{ success: false, error }` —
cleaner to handle in an API route where you control the error response.

**Why `String(parsed.data.price)`?**
Drizzle's `numeric` column type maps to a string in TypeScript to avoid
floating point precision issues. The DB stores it as exact numeric, but
Drizzle gives it to you as a string. So you pass it as a string too.

---

## Step 4 — PUT update product

In `src/routes/api/products/[id]/+server.ts`:

```ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { products } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { UpdateProductSchema } from '$lib/schemas/product';

export const PUT: RequestHandler = async ({ params, request }) => {
  // 1. Check the product exists first
  const existing = await db
    .select()
    .from(products)
    .where(eq(products.id, params.id))
    .then(rows => rows[0]);

  if (!existing) return error(404, 'Product not found');

  // 2. Parse and validate body
  const body = await request.json().catch(() => null);
  const parsed = UpdateProductSchema.safeParse(body);
  if (!parsed.success) {
    return json(
      { message: 'Invalid request body', issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // 3. Update the DB
  const updated = await db
    .update(products)
    .set({
      name: parsed.data.name,
      brand: parsed.data.brand,
      price: String(parsed.data.price),
      status: parsed.data.status,
      imageUrl: parsed.data.imageUrl,
      notes: parsed.data.notes,
      updatedAt: new Date(), // always update this manually
    })
    .where(eq(products.id, params.id))
    .returning()
    .then(rows => rows[0]);

  return json(updated);
};
```

**Why check existence before updating?**
If you just run the UPDATE without checking, Drizzle won't throw an error when
the ID doesn't exist — it just updates 0 rows and returns an empty array.
You'd return a 200 with no data. Checking first lets you return a proper 404.

---

## Step 5 — PATCH status update

```ts
import { PatchProductSchema } from '$lib/schemas/product';

export const PATCH: RequestHandler = async ({ params, request }) => {
  const existing = await db
    .select()
    .from(products)
    .where(eq(products.id, params.id))
    .then(rows => rows[0]);

  if (!existing) return error(404, 'Product not found');

  const body = await request.json().catch(() => null);
  const parsed = PatchProductSchema.safeParse(body);
  if (!parsed.success) {
    return json(
      { message: 'Invalid request body', issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updated = await db
    .update(products)
    .set({
      ...parsed.data,
      // coerce price back to string if it was sent
      ...(parsed.data.price && { price: String(parsed.data.price) }),
      updatedAt: new Date(),
    })
    .where(eq(products.id, params.id))
    .returning()
    .then(rows => rows[0]);

  return json(updated);
};
```

**PATCH vs PUT:**
PUT replaces the entire resource — you must send all fields.
PATCH is a partial update — you only send what changed.
That's why `PatchProductSchema` is just `UpdateProductSchema.partial()` —
every field becomes optional.

---

## Step 6 — DELETE product

```ts
export const DELETE: RequestHandler = async ({ params }) => {
  const existing = await db
    .select()
    .from(products)
    .where(eq(products.id, params.id))
    .then(rows => rows[0]);

  if (!existing) return error(404, 'Product not found');

  await db.delete(products).where(eq(products.id, params.id));

  // 204 No Content — success, but no body to return
  return new Response(null, { status: 204 });
};
```

**Why `new Response(null, { status: 204 })` and not `json()`?**
`json()` always serializes a body. Even `json(null)` sends the string `"null"`.
A 204 response must have no body at all — so you use the raw `Response` constructor.

---

## Optional — Filter by status

A useful addition to your GET all route. Lets you call
`/api/products?status=available` to filter results:

```ts
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
```

---

## Complete File Structure After Phase 2

```
src/
├── lib/
│   ├── server/
│   │   └── db/
│   │       ├── schema.ts       ✅ Phase 1
│   │       ├── index.ts        ✅ Phase 1
│   │       └── seed.ts         ✅ Phase 1
│   └── schemas/
│       └── product.ts          ✅ This phase
│
└── routes/
    └── api/
        └── products/
            ├── +server.ts      ← GET all, POST
            └── [id]/
                └── +server.ts  ← GET one, PUT, PATCH, DELETE
```

---

## Phase 2 Summary

| Route | Method | What it does | Status code |
|---|---|---|---|
| `/api/products` | GET | Return all products | 200 |
| `/api/products` | POST | Create a product | 201 |
| `/api/products/[id]` | GET | Return one product | 200 |
| `/api/products/[id]` | PUT | Replace a product | 200 |
| `/api/products/[id]` | PATCH | Partially update | 200 |
| `/api/products/[id]` | DELETE | Remove a product | 204 |

---

## You're ready for Phase 3

Phase 3 is auth — Lucia setup, login/logout, and protecting your admin routes.
By this point you understand how requests and responses work, how to validate
input, and how to read and write to the database. Auth is just those same
patterns applied to users and sessions.