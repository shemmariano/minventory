# Phase 4 — Products Management UI

Phase 4 builds the Products admin page — the core of the app. By the end, you'll have
a fully functional product management interface with a sortable, filterable datatable
and complete CRUD operations (create, read, update, delete) via modal dialogs.

---

## What You're Building

```
/admin/products
  └── Products datatable (sortable, filterable by status, searchable by name/brand)
        ├── "Add Product" button → opens Create dialog
        ├── Row actions (⋯ dropdown) → Edit or Delete
        ├── Edit → opens Edit dialog (pre-filled form)
        └── Delete → opens Delete confirmation dialog
```

The API already exists from Phase 2. This phase is entirely frontend — you're wiring
the UI to the API you already built.

---

## The Mental Model for This Phase

```
1. Page load        — server load function fetches all products
2. Client state     — Svelte $state holds the product list reactively
3. Datatable        — renders the list with sort/filter/search
4. CRUD dialogs     — forms that call your existing API routes
5. Optimistic UI    — update local state immediately, sync with server
```

Every action follows this pattern:
```
User action → call API → on success, update local state → close dialog
```

---

## Prerequisites — Install shadcn-svelte Table Component

The project uses shadcn-svelte. You need to add the `table` component:

```bash
npx shadcn-svelte@latest add table
```

This generates `src/lib/components/ui/table/` with the table primitives.

You'll also need the `badge` component for status pills:

```bash
npx shadcn-svelte@latest add badge
```

And `select` for the status dropdown in forms:

```bash
npx shadcn-svelte@latest add select
```

And `textarea` for the notes field:

```bash
npx shadcn-svelte@latest add textarea
```

---

## File Structure for This Phase

```
src/
├── lib/
│   └── components/
│       └── app/
│           └── products/
│               ├── ProductsTable.svelte       ← datatable component
│               ├── ProductStatusBadge.svelte  ← status pill (available/reserved/sold)
│               ├── CreateProductDialog.svelte ← add product form
│               ├── EditProductDialog.svelte   ← edit product form
│               └── DeleteProductDialog.svelte ← delete confirmation
└── routes/
    └── admin/
        └── products/
            ├── +page.server.ts   ← load products from DB server-side
            └── +page.svelte      ← products page, wires everything together
```

---

## Step 1 — Create the server load function

Create `src/routes/admin/products/+page.server.ts`:

```ts
import { db } from '$lib/server/db';
import { products } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const allProducts = await db
    .select()
    .from(products)
    .orderBy(desc(products.createdAt));

  return { products: allProducts };
};
```

**Why server-side load and not a client fetch?**
SvelteKit's `load` function runs on the server before the page renders. The user
sees data immediately — no loading spinner on first visit. The data is also typed
end-to-end via `$types`.

**Why `desc(products.createdAt)`?**
Newest products first. You'll add client-side sorting on top of this later.

---

## Step 2 — Create the ProductStatusBadge component

Create `src/lib/components/app/products/ProductStatusBadge.svelte`:

```svelte
<script lang="ts">
  import { Badge } from '$lib/components/ui/badge';

  type Status = 'available' | 'reserved' | 'sold';

  let { status }: { status: Status } = $props();

  const variantMap: Record<Status, 'default' | 'secondary' | 'destructive'> = {
    available: 'default',
    reserved: 'secondary',
    sold: 'destructive'
  };
</script>

<Badge variant={variantMap[status]}>
  {status}
</Badge>
```

**Why a separate component?**
Status badges appear in the table, the edit dialog, and potentially elsewhere.
One component = one place to change the color mapping.

---

## Step 3 — Create the ProductsTable component

This is the main datatable. It handles:
- Rendering the product list
- Client-side search (filter by name or brand)
- Client-side filter by status
- Column sorting (name, brand, price, status, createdAt)
- Row action dropdown (edit, delete)

Create `src/lib/components/app/products/ProductsTable.svelte`:

```svelte
<script lang="ts">
  import {
    Table, TableBody, TableCell,
    TableHead, TableHeader, TableRow
  } from '$lib/components/ui/table';
  import { Input } from '$lib/components/ui/input';
  import { Button } from '$lib/components/ui/button';
  import {
    DropdownMenu, DropdownMenuContent,
    DropdownMenuItem, DropdownMenuTrigger
  } from '$lib/components/ui/dropdown-menu';
  import ProductStatusBadge from './ProductStatusBadge.svelte';
  import { MoreHorizontal, ArrowUpDown } from '@lucide/svelte';
  import type { Product } from '$lib/server/db/schema';

  let {
    products,
    onEdit,
    onDelete
  }: {
    products: Product[];
    onEdit: (product: Product) => void;
    onDelete: (product: Product) => void;
  } = $props();

  // Search and filter state
  let search = $state('');
  let statusFilter = $state<'all' | 'available' | 'reserved' | 'sold'>('all');

  // Sort state
  type SortKey = 'name' | 'brand' | 'price' | 'status' | 'createdAt';
  let sortKey = $state<SortKey>('createdAt');
  let sortDir = $state<'asc' | 'desc'>('desc');

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortKey = key;
      sortDir = 'asc';
    }
  }

  // Derived: filtered + sorted list
  let filtered = $derived(
    products
      .filter((p) => {
        const matchesSearch =
          search === '' ||
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.brand.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        const dir = sortDir === 'asc' ? 1 : -1;
        if (sortKey === 'price') {
          return (parseFloat(a.price) - parseFloat(b.price)) * dir;
        }
        if (sortKey === 'createdAt') {
          return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
        }
        return a[sortKey].localeCompare(b[sortKey]) * dir;
      })
  );

  function formatPrice(price: string) {
    return `₱${parseFloat(price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  }

  function formatDate(date: Date) {
    return new Date(date).toLocaleDateString('en-PH', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  }
</script>

<!-- Toolbar -->
<div class="flex items-center gap-3 pb-4">
  <Input
    placeholder="Search by name or brand..."
    bind:value={search}
    class="max-w-sm"
  />

  <!-- Status filter buttons -->
  <div class="flex gap-1">
    {#each ['all', 'available', 'reserved', 'sold'] as s}
      <Button
        variant={statusFilter === s ? 'default' : 'outline'}
        size="sm"
        onclick={() => (statusFilter = s as typeof statusFilter)}
      >
        {s}
      </Button>
    {/each}
  </div>

  <span class="ml-auto text-sm text-muted-foreground">
    {filtered.length} of {products.length} products
  </span>
</div>

<!-- Table -->
<div class="rounded-md border">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>
          <Button variant="ghost" size="sm" onclick={() => toggleSort('name')}>
            Name <ArrowUpDown class="ml-1 h-3 w-3" />
          </Button>
        </TableHead>
        <TableHead>
          <Button variant="ghost" size="sm" onclick={() => toggleSort('brand')}>
            Brand <ArrowUpDown class="ml-1 h-3 w-3" />
          </Button>
        </TableHead>
        <TableHead>
          <Button variant="ghost" size="sm" onclick={() => toggleSort('price')}>
            Price <ArrowUpDown class="ml-1 h-3 w-3" />
          </Button>
        </TableHead>
        <TableHead>
          <Button variant="ghost" size="sm" onclick={() => toggleSort('status')}>
            Status <ArrowUpDown class="ml-1 h-3 w-3" />
          </Button>
        </TableHead>
        <TableHead>
          <Button variant="ghost" size="sm" onclick={() => toggleSort('createdAt')}>
            Added <ArrowUpDown class="ml-1 h-3 w-3" />
          </Button>
        </TableHead>
        <TableHead class="w-12"></TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {#if filtered.length === 0}
        <TableRow>
          <TableCell colspan={6} class="py-10 text-center text-muted-foreground">
            No products found.
          </TableCell>
        </TableRow>
      {/if}
      {#each filtered as product (product.id)}
        <TableRow>
          <TableCell class="font-medium">{product.name}</TableCell>
          <TableCell>{product.brand}</TableCell>
          <TableCell>{formatPrice(product.price)}</TableCell>
          <TableCell>
            <ProductStatusBadge status={product.status} />
          </TableCell>
          <TableCell class="text-muted-foreground">{formatDate(product.createdAt)}</TableCell>
          <TableCell>
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button variant="ghost" size="icon" class="h-8 w-8">
                  <MoreHorizontal class="h-4 w-4" />
                  <span class="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onclick={() => onEdit(product)}>Edit</DropdownMenuItem>
                <DropdownMenuItem
                  class="text-destructive"
                  onclick={() => onDelete(product)}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>
      {/each}
    </TableBody>
  </Table>
</div>
```

**Key patterns to understand:**

`$derived` — Svelte 5's reactive computation. `filtered` automatically recalculates
whenever `products`, `search`, `statusFilter`, `sortKey`, or `sortDir` changes.
No manual subscriptions needed.

`onEdit` and `onDelete` are callback props — the table doesn't own the dialogs,
it just signals the parent page. This keeps the table component focused on display.

---

## Step 4 — Create the CreateProductDialog component

Create `src/lib/components/app/products/CreateProductDialog.svelte`:

```svelte
<script lang="ts">
  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Textarea } from '$lib/components/ui/textarea';
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '$lib/components/ui/select';
  import { Spinner } from '$lib/components/ui/spinner';
  import type { Product } from '$lib/server/db/schema';

  let {
    open = $bindable(false),
    onCreated
  }: {
    open: boolean;
    onCreated: (product: Product) => void;
  } = $props();

  // Form state
  let name = $state('');
  let brand = $state('');
  let price = $state('');
  let status = $state<'available' | 'reserved' | 'sold'>('available');
  let imageUrl = $state('');
  let notes = $state('');
  let loading = $state(false);
  let errors = $state<Record<string, string>>({});

  function reset() {
    name = '';
    brand = '';
    price = '';
    status = 'available';
    imageUrl = '';
    notes = '';
    errors = {};
  }

  async function handleSubmit() {
    loading = true;
    errors = {};

    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        brand,
        price: parseFloat(price),
        status,
        imageUrl: imageUrl || null,
        notes: notes || null
      })
    });

    const data = await res.json();
    loading = false;

    if (!res.ok) {
      // Map Zod field errors to form
      if (data.issues?.fieldErrors) {
        for (const [field, msgs] of Object.entries(data.issues.fieldErrors)) {
          errors[field] = (msgs as string[])[0];
        }
      }
      return;
    }

    onCreated(data);
    open = false;
    reset();
  }

  // Reset form when dialog closes
  $effect(() => {
    if (!open) reset();
  });
</script>

<Dialog bind:open>
  <DialogContent class="max-w-md">
    <DialogHeader>
      <DialogTitle>Add Product</DialogTitle>
    </DialogHeader>

    <form onsubmit|preventDefault={handleSubmit} class="space-y-4">
      <div class="space-y-1">
        <Label for="name">Name *</Label>
        <Input id="name" bind:value={name} placeholder="e.g. Floral Summer Dress" required />
        {#if errors.name}<p class="text-sm text-destructive">{errors.name}</p>{/if}
      </div>

      <div class="space-y-1">
        <Label for="brand">Brand *</Label>
        <Input id="brand" bind:value={brand} placeholder="e.g. Zara" required />
        {#if errors.brand}<p class="text-sm text-destructive">{errors.brand}</p>{/if}
      </div>

      <div class="space-y-1">
        <Label for="price">Price (₱) *</Label>
        <Input id="price" type="number" min="0.01" step="0.01" bind:value={price} placeholder="0.00" required />
        {#if errors.price}<p class="text-sm text-destructive">{errors.price}</p>{/if}
      </div>

      <div class="space-y-1">
        <Label for="status">Status</Label>
        <Select bind:value={status}>
          <SelectTrigger id="status">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="reserved">Reserved</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="space-y-1">
        <Label for="imageUrl">Image URL</Label>
        <Input id="imageUrl" type="url" bind:value={imageUrl} placeholder="https://..." />
        {#if errors.imageUrl}<p class="text-sm text-destructive">{errors.imageUrl}</p>{/if}
      </div>

      <div class="space-y-1">
        <Label for="notes">Notes</Label>
        <Textarea id="notes" bind:value={notes} placeholder="Size, condition, source..." rows={3} />
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onclick={() => (open = false)} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {#if loading}<Spinner />{/if}
          Add Product
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

---

## Step 5 — Create the EditProductDialog component

Create `src/lib/components/app/products/EditProductDialog.svelte`:

The edit dialog is nearly identical to create, but:
- It receives the `product` to edit as a prop
- It pre-fills the form fields from the product data
- It calls `PUT /api/products/[id]` instead of `POST /api/products`
- It calls `onUpdated(updatedProduct)` on success

```svelte
<script lang="ts">
  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Textarea } from '$lib/components/ui/textarea';
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '$lib/components/ui/select';
  import { Spinner } from '$lib/components/ui/spinner';
  import type { Product } from '$lib/server/db/schema';

  let {
    open = $bindable(false),
    product,
    onUpdated
  }: {
    open: boolean;
    product: Product | null;
    onUpdated: (product: Product) => void;
  } = $props();

  // Pre-fill form when product changes
  let name = $state('');
  let brand = $state('');
  let price = $state('');
  let status = $state<'available' | 'reserved' | 'sold'>('available');
  let imageUrl = $state('');
  let notes = $state('');
  let loading = $state(false);
  let errors = $state<Record<string, string>>({});

  // Sync form fields when product prop changes
  $effect(() => {
    if (product) {
      name = product.name;
      brand = product.brand;
      price = product.price;
      status = product.status;
      imageUrl = product.imageUrl ?? '';
      notes = product.notes ?? '';
      errors = {};
    }
  });

  async function handleSubmit() {
    if (!product) return;
    loading = true;
    errors = {};

    const res = await fetch(`/api/products/${product.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        brand,
        price: parseFloat(price),
        status,
        imageUrl: imageUrl || null,
        notes: notes || null
      })
    });

    const data = await res.json();
    loading = false;

    if (!res.ok) {
      if (data.issues?.fieldErrors) {
        for (const [field, msgs] of Object.entries(data.issues.fieldErrors)) {
          errors[field] = (msgs as string[])[0];
        }
      }
      return;
    }

    onUpdated(data);
    open = false;
  }
</script>

<!-- Same form structure as CreateProductDialog, pre-filled -->
<Dialog bind:open>
  <DialogContent class="max-w-md">
    <DialogHeader>
      <DialogTitle>Edit Product</DialogTitle>
    </DialogHeader>

    <form onsubmit|preventDefault={handleSubmit} class="space-y-4">
      <!-- Same fields as CreateProductDialog -->
      <!-- name, brand, price, status, imageUrl, notes -->
      <!-- ... -->

      <DialogFooter>
        <Button type="button" variant="ghost" onclick={() => (open = false)} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {#if loading}<Spinner />{/if}
          Save Changes
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

---

## Step 6 — Create the DeleteProductDialog component

Create `src/lib/components/app/products/DeleteProductDialog.svelte`:

```svelte
<script lang="ts">
  import { Dialog, DialogContent, DialogFooter } from '$lib/components/ui/dialog';
  import { Button } from '$lib/components/ui/button';
  import { Spinner } from '$lib/components/ui/spinner';
  import type { Product } from '$lib/server/db/schema';

  let {
    open = $bindable(false),
    product,
    onDeleted
  }: {
    open: boolean;
    product: Product | null;
    onDeleted: (id: string) => void;
  } = $props();

  let loading = $state(false);
  let error = $state('');

  async function handleDelete() {
    if (!product) return;
    loading = true;
    error = '';

    const res = await fetch(`/api/products/${product.id}`, { method: 'DELETE' });

    if (!res.ok) {
      loading = false;
      error = 'Failed to delete product. Please try again.';
      return;
    }

    loading = false;
    onDeleted(product.id);
    open = false;
  }
</script>

<Dialog bind:open>
  <DialogContent class="max-w-sm">
    <h2 class="text-lg font-semibold">Delete Product</h2>
    <p class="text-muted-foreground">
      Are you sure you want to delete
      <span class="font-medium text-foreground">{product?.name}</span>?
      This action cannot be undone.
    </p>

    {#if error}
      <p class="text-sm text-destructive">{error}</p>
    {/if}

    <DialogFooter>
      <Button variant="ghost" onclick={() => (open = false)} disabled={loading}>Cancel</Button>
      <Button variant="destructive" onclick={handleDelete} disabled={loading}>
        {#if loading}<Spinner />{/if}
        Delete
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Step 7 — Build the Products page

Create `src/routes/admin/products/+page.svelte`:

```svelte
<script lang="ts">
  import type { PageData } from './$types';
  import { Button } from '$lib/components/ui/button';
  import { Plus } from '@lucide/svelte';
  import ProductsTable from '$lib/components/app/products/ProductsTable.svelte';
  import CreateProductDialog from '$lib/components/app/products/CreateProductDialog.svelte';
  import EditProductDialog from '$lib/components/app/products/EditProductDialog.svelte';
  import DeleteProductDialog from '$lib/components/app/products/DeleteProductDialog.svelte';
  import type { Product } from '$lib/server/db/schema';

  let { data }: { data: PageData } = $props();

  // Reactive product list — starts from server data, updated by CRUD operations
  let products = $state<Product[]>(data.products);

  // Dialog state
  let createOpen = $state(false);
  let editOpen = $state(false);
  let deleteOpen = $state(false);
  let selectedProduct = $state<Product | null>(null);

  // Handlers passed to the table
  function handleEdit(product: Product) {
    selectedProduct = product;
    editOpen = true;
  }

  function handleDelete(product: Product) {
    selectedProduct = product;
    deleteOpen = true;
  }

  // Handlers passed to dialogs — update local state
  function handleCreated(product: Product) {
    products = [product, ...products];
  }

  function handleUpdated(updated: Product) {
    products = products.map((p) => (p.id === updated.id ? updated : p));
  }

  function handleDeleted(id: string) {
    products = products.filter((p) => p.id !== id);
  }
</script>

<div class="p-6">
  <!-- Page header -->
  <div class="mb-6 flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">Products</h1>
      <p class="text-muted-foreground">{products.length} items in inventory</p>
    </div>
    <Button onclick={() => (createOpen = true)}>
      <Plus class="mr-2 h-4 w-4" />
      Add Product
    </Button>
  </div>

  <!-- Datatable -->
  <ProductsTable
    {products}
    onEdit={handleEdit}
    onDelete={handleDelete}
  />
</div>

<!-- Dialogs -->
<CreateProductDialog bind:open={createOpen} onCreated={handleCreated} />
<EditProductDialog bind:open={editOpen} product={selectedProduct} onUpdated={handleUpdated} />
<DeleteProductDialog bind:open={deleteOpen} product={selectedProduct} onDeleted={handleDeleted} />
```

**Why manage product state in the page, not the table?**
The table is a display component. The page owns the data. This separation means
you can add a second table (e.g. a "sold items" section) later without refactoring.

**Why not invalidate and re-fetch after each mutation?**
Optimistic updates (updating local state immediately) feel instant to the user.
Re-fetching would cause a visible flash. Since the API returns the updated record,
you have everything you need to update local state without a round-trip.

---

## Step 8 — Wire up the sidebar navigation

Update `src/lib/components/app/AppSidebar.svelte` to make the Products link navigate
to `/admin/products`:

```svelte
<!-- Replace the Products MenuButton with: -->
<MenuItem>
  <MenuButton href="/admin/products">Products</MenuButton>
</MenuItem>
```

Also update the Dashboard link:

```svelte
<MenuItem>
  <MenuButton href="/admin/dashboard">Dashboard</MenuButton>
</MenuItem>
```

---

## Complete File Structure After Phase 4

```
src/
├── lib/
│   └── components/
│       └── app/
│           └── products/
│               ├── ProductsTable.svelte        ✅ This phase
│               ├── ProductStatusBadge.svelte   ✅ This phase
│               ├── CreateProductDialog.svelte  ✅ This phase
│               ├── EditProductDialog.svelte    ✅ This phase
│               └── DeleteProductDialog.svelte  ✅ This phase
└── routes/
    └── admin/
        └── products/
            ├── +page.server.ts   ✅ This phase
            └── +page.svelte      ✅ This phase
```

New shadcn-svelte components added:
```
src/lib/components/ui/
  ├── table/     ✅ This phase
  ├── badge/     ✅ This phase
  ├── select/    ✅ This phase
  └── textarea/  ✅ This phase
```

---

## Phase 4 Summary

| Feature | Implementation |
|---|---|
| Products datatable | `ProductsTable.svelte` with `$derived` filtering/sorting |
| Search | Client-side filter by name or brand |
| Status filter | Toggle buttons for all / available / reserved / sold |
| Column sorting | Click column headers to sort asc/desc |
| Create product | `CreateProductDialog.svelte` → `POST /api/products` |
| Edit product | `EditProductDialog.svelte` → `PUT /api/products/[id]` |
| Delete product | `DeleteProductDialog.svelte` → `DELETE /api/products/[id]` |
| Optimistic UI | Local `$state` updated immediately on success |
| Auth protection | Inherited from `/admin` layout server load |

---

## You're ready for Phase 5

Phase 5 will add the audit log — every create, update, and delete action writes
a row to the `logs` table. You'll build a Logs page that shows the full history
of changes with timestamps and before/after snapshots.

The `logs` table is already in your schema. Phase 5 is about writing to it
(in your API routes) and reading from it (in a new admin page).
