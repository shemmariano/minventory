/**
 * db/index.ts — Your database connection.
 *
 * This file creates ONE Drizzle client instance and exports it.
 * Import `db` anywhere in your server code to run queries.
 *
 * Why one instance?
 * Creating a new DB connection on every request is expensive.
 * A single shared instance reuses the connection pool.
 * Neon's serverless driver handles the pooling automatically.
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { DATABASE_URL } from '$env/static/private';
import * as schema from './schema';

/**
 * neon() creates a SQL executor from your connection string.
 * DATABASE_URL comes from your .env file (never hardcode it).
 * Format: postgresql://user:password@host/dbname
 */

const sql = neon(DATABASE_URL);

/**
 * drizzle() wraps the Neon executor with the Drizzle query builder.
 * Passing `schema` here enables Drizzle's relational query API (optional but useful).
 *
 * Usage anywhere in +server.ts or +page.server.ts:
 *   import { db } from '$lib/server/db'
 *   const allProducts = await db.select().from(products)
 */

export const db = drizzle(sql, { schema });
