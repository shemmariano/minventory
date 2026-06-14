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

import { pgTable, pgEnum, text, numeric, timestamp, uuid } from 'drizzle-orm/pg-core';

export const productStatusEnum = pgEnum('product_status', ['available', 'reserved', 'sold']);

// ---------------------------------------------------------------------------
// PRODUCTS TABLE
// The core of the app. One row = one item in the inventory.
// ---------------------------------------------------------------------------

export const products = pgTable('products', {
	id: uuid('id').defaultRandom().primaryKey(),
	name: text('name').notNull(),
	brand: text('brand').notNull(),
	price: numeric('price', { precision: 10, scale: 2 }).notNull(),
	status: productStatusEnum('status').notNull().default('available'),
	notes: text('notes'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const users = pgTable('users', {
	id: uuid('id').defaultRandom().primaryKey(),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	createdAt: timestamp('created_at').notNull().defaultNow()
});

// ---------------------------------------------------------------------------
// TYPE EXPORTS
// ---------------------------------------------------------------------------

export type Product = typeof products.$inferSelect;
export type ProductInsert = typeof products.$inferInsert;

export type User = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;
