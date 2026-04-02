# Phase 1 — Database Setup Guide

Follow these steps exactly, in order. Each step has an explanation so you understand
*why* you're doing it, not just *what* to do.

---

## Step 1 — Install dependencies

Run this in your project root:

```bash
npm install drizzle-orm @neondatabase/serverless zod
npm install -D drizzle-kit dotenv tsx
```

**What each package does:**
- `drizzle-orm` — the ORM itself. Lets you write DB queries in TypeScript
- `@neondatabase/serverless` — Neon's driver. Handles the actual connection to your Postgres DB
- `zod` — validation library. You'll use this heavily in Phase 2
- `drizzle-kit` — CLI tool for generating and running migrations (dev only)
- `dotenv` — loads your `.env` file. Used by the seed script and drizzle.config.ts
- `tsx` — runs TypeScript files directly (used for the seed script)

---

## Step 2 — Create a Neon database

1. Go to [neon.tech](https://neon.tech) and sign up (free)
2. Click **"New Project"**
3. Name it `minventory` (or anything you like)
4. Choose the region closest to you (e.g. Singapore or Tokyo)
5. Click **"Create project"**
6. On the next screen, find **"Connection Details"**
7. Select **"Connection string"** from the dropdown
8. Copy the string — it looks like:
   ```
   postgresql://user:password@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

---

## Step 3 — Set up your .env file

In your project root, create a `.env` file:

```bash
cp .env.example .env
```

Then open `.env` and paste your Neon connection string:

```env
DATABASE_URL="postgresql://your-actual-connection-string-here"
```

> ⚠️ Make sure `.env` is in your `.gitignore`. It should already be there in a
> SvelteKit project, but double-check. Never commit real credentials.

---

## Step 4 — Generate your first migration

This command reads your `schema.ts` and generates a SQL file that creates your tables:

```bash
npx drizzle-kit generate
```

You'll see output like:
```
Reading config file 'drizzle.config.ts'
1 tables
products 8 columns ...
✓ Your SQL migration file ➜ drizzle/0000_initial_schema.sql
```

Open `drizzle/0000_initial_schema.sql` and read it. It's the actual SQL that will create
your tables. This is what Drizzle translated from your `schema.ts`. Understanding this
SQL is important — you're not hiding from SQL, you're writing it in TypeScript.

---

## Step 5 — Run the migration

This sends the SQL from Step 4 to your Neon database and creates the actual tables:

```bash
npx drizzle-kit migrate
```

You should see:
```
Running migrations...
✓ drizzle/0000_initial_schema.sql
All migrations ran successfully.
```

---

## Step 6 — Verify with Drizzle Studio

Drizzle Studio is a visual database browser. Run:

```bash
npx drizzle-kit studio
```

Open the URL it gives you (usually `https://local.drizzle.studio`).
You should see your 4 empty tables: `products`, `users`, `sessions`, `logs`.

---

## Step 7 — Seed the database

Run the seed script to populate sample products:

```bash
npx tsx src/lib/server/db/seed.ts
```

You should see:
```
🌱 Seeding database...
🗑️  Cleared existing products
✅ Inserted 5 products
   • [available] Zara — Floral Summer Dress @ ₱450.00
   • [available] Levi's — High-Waist Jeans @ ₱850.00
   • [reserved] H&M — Oversized Blazer @ ₱650.00
   • [available] Uniqlo — Knit Cardigan @ ₱380.00
   • [sold] Mango — Pleated Midi Skirt @ ₱520.00

✨ Seed complete. Run `npx drizzle-kit studio` to view your data.
```

Go back to Drizzle Studio and refresh — you should see the products in the `products` table.

---

## Step 8 — Add scripts to package.json

Add these to the `scripts` section of your `package.json` for convenience:

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

Now you can run `npm run db:migrate` instead of the full npx command.

---

## What you now have

```
Your Neon DB (cloud Postgres)
  └── products table   (5 sample rows)
  └── users table      (empty — Phase 3)
  └── sessions table   (empty — Phase 3)
  └── logs table       (empty — Phase 7)

Your codebase
  └── schema.ts        (source of truth for table shapes)
  └── index.ts         (db client — import this to run queries)
  └── schemas/product.ts (Zod validation — used in Phase 2)
  └── drizzle.config.ts  (tells Drizzle Kit where everything is)
  └── seed.ts            (dev data)
```

---

## When you change the schema

Whenever you modify `schema.ts` (add a column, rename something, etc.):

```bash
npm run db:generate   # creates a new migration file
npm run db:migrate    # applies it to the DB
```

Never modify the generated files in `/drizzle` manually.

---

## You're ready for Phase 2

In Phase 2, you'll build your first API route that reads from the `products` table
using the `db` client from `$lib/server/db`.

Your first query will look like this:

```ts
import { db } from '$lib/server/db';
import { products } from '$lib/server/db/schema';

const allProducts = await db.select().from(products);
```

That's it. One line to get everything from the products table.