---
description: Scaffold a new admin page following our conventions
---

# New admin page: $ARGUMENTS

Build the page with the same structure as `/admin/stops` and `/admin/users`.

## 1. Files to create

```
app/admin/<slug>/page.tsx          # list / overview, server component
app/admin/<slug>/[id]/page.tsx     # detail / edit, server component
app/admin/<slug>/new/page.tsx      # create, server component
app/admin/<slug>/actions.ts        # server actions for create/update/delete
lib/admin/<slug>.ts                # server queries (listX, getXById)
lib/admin/<slug>-types.ts          # client-safe types & constants
components/admin/<X>Form.tsx       # client form (with `"use client";`)
components/admin/<X>Filters.tsx    # client filter chips, if filtering needed
```

## 2. Auth gate

Layout already wraps every `/admin/**` route in `requireAdmin()` via
`app/admin/layout.tsx`. **Never bypass that.** If you need to call admin
data from a server action, also call `requireAdmin()` at the top of the
action — RLS is the safety net but the gate is the front door.

## 3. Sidebar entry

Add the new tab to `components/admin/AdminSidebar.tsx` `NAV` array:

```ts
{ key: "<slug>", label: "<Label>", href: "/admin/<slug>", icon: "<unicode>", matchPrefix: "/admin/<slug>" },
```

## 4. List page conventions

- Page header: title + count + `+ New <thing>` button on the right
- Search (debounced 250ms via `<XFilters />`)
- Filter chips with live counts (use the same chip styling)
- Table:
  - First column shows a small thumbnail (image or icon) + name + 2-line description
  - Each row is a `<Link>` to `/admin/<slug>/[id]`
  - Pagination at 25 or 50 per page (footer bar)
  - Empty state with helpful copy
- Toast banners for `?saved=1`, `?deleted=1`, `?error=…`

## 5. Edit page conventions

Two stacked sections:

```
<header>     // breadcrumb, name, status
<saved/error toast if present>
<section>    // photos / gallery (if applicable)
<section>    // details form
```

- `getXById()` server-side; if not found, `notFound()`.
- Bind the id into the action: `const updateAction = updateX.bind(null, x.id)`.
- Pass `mode="edit"` and `deleteAction` to the form.

## 6. Form component (client)

- `"use client";` at top
- Use `useFormStatus()` for the save / delete buttons
- Tailwind `inputClass` helper for all `<input>`/`<select>`/`<textarea>`
- For `<select>` with categories from DB: pass categories as a prop (server
  component fetches them with `listCategories()` and forwards)
- Inline-style every `<option>` with `backgroundColor: "#0F172A"` and
  `color: "#FFF7ED"` so the dropdown is dark across browsers
- Confirm dialog on delete:
  ```tsx
  onClick={(e) => { if (!confirm("Delete X?")) e.preventDefault(); }}
  ```

## 7. Actions file

```ts
"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";

export async function createX(formData: FormData) {
  await requireAdmin();
  // validate
  // insert
  // revalidatePath everywhere this surfaces
  // redirect with ?saved=1
}

export async function updateX(id: string, formData: FormData) { /* … */ }
export async function deleteX(id: string) { /* … */ }
```

## 8. Wire it into the public site if needed

If the new entity is user-visible, add a public read in
`lib/public/<slug>.ts` and surface it in `app/page.tsx` or its own
public route.

## 9. Test

- Create a record, observe it on the list
- Edit it, confirm changes persist + UI reflects them after redirect
- Delete it, confirm gone + cascading children gone too
- Try an invalid input (too long, invalid format) and confirm the error
  banner appears
- Sign out and confirm visiting `/admin/<slug>` bounces to home with
  `?admin_only=1`

## 10. Update CLAUDE.md

Add the new entity to the Database schema or Repo layout section so the
next session starts informed.
