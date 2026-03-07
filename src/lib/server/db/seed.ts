/**
 * seed.ts — Test data for development.
 *
 * Run this once after your first migration to populate the DB
 * with realistic sample products.
 *
 * Usage: npx tsx src/lib/server/db/seed.ts
 *
 * Safe to run multiple times — it clears existing products first.
 * DO NOT run against production.
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { products } from './schema';

config({ path: '.env' });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

const sampleProducts = [
	{
		name: 'Floral Summer Dress',
		brand: 'Zara',
		price: '450.00',
		status: 'available' as const,
		notes: 'Size M. Good condition. White with pink flowers.'
	},
	{
		name: 'High-Waist Jeans',
		brand: "Levi's",
		price: '850.00',
		status: 'available' as const,
		notes: 'Size 28. Barely used. Light wash.'
	},
	{
		name: 'Oversized Blazer',
		brand: 'H&M',
		price: '650.00',
		status: 'reserved' as const,
		notes: 'Size L. Black. Reserved for Ate Joy.'
	},
	{
		name: 'Knit Cardigan',
		brand: 'Uniqlo',
		price: '380.00',
		status: 'available' as const,
		notes: 'Size S. Beige. Very soft.'
	},
	{
		name: 'Pleated Midi Skirt',
		brand: 'Mango',
		price: '520.00',
		status: 'sold' as const,
		notes: 'Size M. Navy blue. Already released.'
	},
	{
		name: 'Plain Relaxed Fit T-shirt',
		brand: 'Penshoppe',
		price: '499.00',
		status: 'available' as const,
		notes: 'Size M. Made from polyester.'
	}
];

async function seed() {
	console.log('Seeding db...');

	await db.delete(products);
	console.log('Cleared existing products.');

	const inserted = await db.insert(products).values(sampleProducts).returning();
	console.log('Inserted products.');

	for (const product of inserted) {
		console.log(`   • [${product.status}] ${product.brand} — ${product.name} @ ₱${product.price}`);
	}

	console.log('\n Seed complete. Run `npx drizzle-kit studio` to view your data.');

	process.exit(0);
}

seed().catch((error) => {
	console.error('Seed failed', error);
	process.exit(1);
});
