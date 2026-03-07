/**
 * drizzle.config.ts — Drizzle Kit configuration.
 *
 * Drizzle Kit is the CLI tool that:
 *   1. Reads your schema.ts
 *   2. Compares it to the current DB state
 *   3. Generates SQL migration files to sync them
 *
 * Commands you'll use:
 *   npx drizzle-kit generate   → generate a new migration file from schema changes
 *   npx drizzle-kit migrate    → run pending migrations against your DB
 *   npx drizzle-kit studio     → open a visual DB browser in your browser
 */

import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

// Load .env so DATABASE_URL is available to this config file.
// (This runs outside SvelteKit, so $env/static/private won't work here.)
config({ path: '.env' });

export default defineConfig({
	/**
	 * Where are your schema files?
	 * The glob pattern picks up all .ts files in the db folder.
	 */
	schema: './src/lib/server/db/schema.ts',
	/**
	 * Where should generated migration SQL files be saved?
	 * Commit these to git — they're the history of your DB changes.
	 */
	out: './drizzle',
	/**
	 * Which database dialect?
	 * 'postgresql' for Neon (which is Postgres under the hood).
	 */
	dialect: 'postgresql',

	dbCredentials: {
		url: process.env.DATABASE_URL!
	},

	/**
	 * Log every SQL statement Drizzle generates — great for learning.
	 * You'll see the exact SQL behind your Drizzle queries.
	 */
	verbose: true,
	strict: true
});
