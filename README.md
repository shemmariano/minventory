# Minventory

A lightweight, internal inventory management system modeled from a small clothing resale operations. Track items, manage product status, and keep everything organized behind a simple login.

## Core Modules

### Inventory Management
Full CRUD operations for the product catalog. Add new items, edit details, and remove listings when needed.

### Product Status Tracking
Each item carries a status tag to reflect where it is in the sales pipeline. Supported statuses: `available`, `reserved`, and `sold`. Tracks price, brand, and notes per item.

### Dashboard
Quick-glance overview and statistics of the inventory.

## Tech Stack
- **Language**: Typescript
- **Framework**: SvelteKit (fullstack meta framework)
- **Styling**: TailwindCSS, shadcn-svelte
- **Database**: PostgreSQL (Neon) via Drizzle ORM

## Roadmap
- [x] Admin authentication
- [x] CRUD operations
- [ ] Dashboard statistics
- [ ] Data export (CSV/XLS)