/**
 * schema.ts — Your database blueprint.
 *
 * Think of this file as the single source of truth for your data.
 * Every table, every column, every relationship is defined here.
 * Drizzle reads this file to generate SQL migrations.
 *
 * Rule of thumb: change your data shape here first, THEN migrate.
 * Never manually edit the database directly.
 */

import { pgTable, pgEnum, text, numeric, timestamp, uuid, jsonb } from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// ENUMS
// Enums are a fixed set of allowed values for a column.
// The DB will reject any value not in this list — built-in validation.
// ---------------------------------------------------------------------------

// Ask later: what is pgEnum?

/**
 * Product status — where is this item in the sales pipeline?
 * 'available' → listed and ready to buy
 * 'reserved'  → customer is interested, holding it
 * 'sold'      → transaction complete
 */
export const productStatusEnum = pgEnum('product_status', ['available', 'reserved', 'sold']);

/**
 * Log action — what happened to a product?
 * Used in the audit log to track every change.
 */
export const logActionEnum = pgEnum('log_action', [
	'created',
	'updated',
	'deleted',
	'status_changed'
]);

// ---------------------------------------------------------------------------
// PRODUCTS TABLE
// The core of the app. One row = one item in the inventory.
// ---------------------------------------------------------------------------

// Ask later: What is pgTable?

/**
 * uuid: universally unique identifier.
 * Better than auto-increment integers because:
 * - IDs are unpredictable (harder to enumerate via URL guessing)
 * - Safe to generate on the client side if needed later
 * defaultRandom() means Postgres generates it automatically on INSERT.
 */
/**
 * numeric for money — NEVER use float/real for currency.
 * Floats have rounding errors (0.1 + 0.2 = 0.30000000000000004).
 * numeric is exact. precision(10,2) means up to 10 digits, 2 decimal places.
 * e.g. 99999999.99 max value.
 */
/**
 * The enum column — Postgres enforces only valid status values.
 * defaulting to 'available' makes sense: new items are ready to sell.
 */
/**
 * imageUrl stores the URL string returned by Uploadthing.
 * We don't store the image itself in the DB — just a reference to it.
 * nullable because you might add an item before uploading a photo.
 */
/**
 * Free-form notes for minventory — size info, condition, source, anything.
 * nullable because it's optional.
 */
/**
 * Timestamps — always track these. You'll want them for sorting,
 * filtering, and debugging. $defaultFn runs at INSERT time.
 */
/**
 * updatedAt: you must manually call .set({ updatedAt: new Date() })
 * when updating. Drizzle doesn't auto-update this like some ORMs.
 * We'll handle this in the API route.
 */
export const products = pgTable('products', {
	id: uuid('id').defaultRandom().primaryKey(),
	name: text('name').notNull(),
	brand: text('brand').notNull(),
	price: numeric('price', { precision: 10, scale: 2 }).notNull(),
	status: productStatusEnum('status').notNull().default('available'),
	imageUrl: text('image_url'),
	notes: text('notes'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

/**
 * Lucia requires the user id to be a text column, not uuid.
 * We'll use nanoid or crypto.randomUUID() to generate it manually.
 */
/**
 * NEVER store plain text passwords. Ever.
 * This stores the result of Argon2 hashing via the `oslo` library.
 * e.g. "$argon2id$v=19$m=19456,t=2,p=1$..."
 */
export const users = pgTable('users', {
	id: text('id').primaryKey(),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	createdAt: timestamp('created_at').notNull().defaultNow()
});

/**
 * Lucia generates this ID — a long random string used as the cookie value.
 */
/**
 * Which user does this session belong to?
 * .references() creates a foreign key — Postgres will reject a session
 * that points to a non-existent user.
 */
/**
 * When does this session expire?
 * Lucia automatically extends this on activity and cleans up expired rows.
 */
export const sessions = pgTable('sessions', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id),
	expiresAt: timestamp('expires_at', {
		withTimezone: true,
		mode: 'date'
	}).notNull()
});

// ---------------------------------------------------------------------------
// LOGS TABLE
// Audit trail — every change to a product is recorded here.
// Answers: "who did what, to which product, and when?"
// ----
/**
 * Which product was affected?
 * nullable because if a product is deleted, its log entries should
 * remain for history — we don't want cascade delete wiping the trail.
 */
/**
 * jsonb: flexible JSON storage in Postgres.
 * We'll store a snapshot of what changed, e.g.:
 * { before: { status: 'available' }, after: { status: 'reserved' } }
 * This gives you a full history without a rigid schema.
 */
export const logs = pgTable('logs', {
	id: uuid('id').defaultRandom().primaryKey(),
	action: logActionEnum('action').notNull(),
	productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
	metadata: jsonb('metadata'),
	createdAt: timestamp('created_at').notNull().defaultNow()
});

// ---------------------------------------------------------------------------
// TYPE EXPORTS
// Drizzle can infer TypeScript types directly from your schema.
// Use these types throughout your app instead of defining them manually.
// ---------------------------------------------------------------------------

/**
 * Product — the full row type (what comes back from SELECT)
 * ProductInsert — the insert type (what you pass to INSERT)
 */
export type Product = typeof products.$inferSelect;
export type ProductInsert = typeof products.$inferInsert;

export type User = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;

export type Session = typeof sessions.$inferSelect;

export type Log = typeof logs.$inferSelect;
export type LogInsert = typeof logs.$inferInsert;
