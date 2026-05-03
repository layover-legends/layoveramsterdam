#!/usr/bin/env tsx
/**
 * scripts/build-redirects.ts
 *
 * Fetches all rows from `slug_redirects` and writes them to
 * `lib/generated/redirects.json`.  Run automatically via the `prebuild`
 * npm script so middleware.ts gets a fresh static map on every deploy.
 *
 * Required env (already set in Vercel for the app):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * If either var is missing the script writes an empty `[]` and exits 0
 * so the build doesn't fail on first-time setups.
 */

import { loadEnvFile } from "node:process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";

const OUT_PATH = resolve(process.cwd(), "lib/generated/redirects.json");

// Auto-load .env.local so the script works without a manual export.
for (const envPath of [".env.local", ".env"]) {
  const abs = resolve(process.cwd(), envPath);
  if (existsSync(abs)) {
    try { loadEnvFile(abs); } catch { /* node <20.12 — continue silently */ }
    break;
  }
}

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

function writeEmpty() {
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, "[]\n");
}

if (!url || !key) {
  console.warn("[build-redirects] env vars missing — writing empty redirects.json");
  writeEmpty();
  process.exit(0);
}

const supabase = createClient(url, key);
const { data, error } = await supabase
  .from("slug_redirects")
  .select("entity_type, old_slug, new_slug")
  .order("created_at", { ascending: true });

if (error) {
  console.error("[build-redirects] query failed:", error.message, "— writing empty redirects.json");
  writeEmpty();
  process.exit(0);
}

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, JSON.stringify(data ?? [], null, 2) + "\n");
console.log(`[build-redirects] wrote ${(data ?? []).length} redirect(s) → lib/generated/redirects.json`);
