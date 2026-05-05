"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { CURRENCY_COOKIE } from "@/lib/currency/format";

/** Server action: persist the visitor's currency choice and refresh the current page. */
export async function setCurrency(formData: FormData) {
  const code = (formData.get("currency") as string | null)?.trim().toUpperCase() ?? "EUR";
  if (!/^[A-Z]{3}$/.test(code)) return;

  cookies().set(CURRENCY_COOKIE, code, {
    maxAge:   365 * 24 * 60 * 60, // 1 year
    path:     "/",
    sameSite: "lax",
    secure:   process.env.NODE_ENV === "production",
  });

  // Revalidate everything so server components re-render with the new currency
  revalidatePath("/", "layout");
}
