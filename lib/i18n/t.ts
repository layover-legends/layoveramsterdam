// Client-safe — no server imports. Pure lookup functions only.
// Client components must import t/tpl from here, NOT from @/lib/i18n/ui
// (which pulls next/headers via loadUiStrings → createClient).

/** Synchronous lookup against a pre-loaded UI string map; falls back to key. */
export function t(
  strings: Record<string, string>,
  key: string,
  fallback?: string,
): string {
  return strings[key] ?? fallback ?? key;
}

/**
 * Template interpolation — replace {placeholder} tokens.
 * Example: tpl(t(s, "stops_teaser.free_count"), { count: 137 })
 *          → "137 free stops, hand-picked."
 */
export function tpl(str: string, vars: Record<string, string | number>): string {
  return str.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`));
}
