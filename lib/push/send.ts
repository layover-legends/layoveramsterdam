import "server-only";

import webPush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

const VAPID_PUBLIC  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:travellayoverlegends@gmail.com";

function getWebPush() {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return null;
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  return webPush;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  icon?: string;
};

/** Send a push notification to all subscriptions for a given user_id. */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<void> {
  const wp = getWebPush();
  if (!wp) {
    console.warn("[push] VAPID keys not configured — skipping push");
    return;
  }

  const admin = createAdminClient();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh_key, auth_key")
    .eq("user_id", userId);

  if (!subs?.length) return;

  const json = JSON.stringify(payload);

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await wp.sendNotification(
          {
            endpoint: sub.endpoint as string,
            keys: {
              p256dh: sub.p256dh_key as string,
              auth:   sub.auth_key as string,
            },
          },
          json
        );
        // Update last_seen_at
        await admin
          .from("push_subscriptions")
          .update({ last_seen_at: new Date().toISOString() })
          .eq("id", sub.id);
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        // 404 / 410 = subscription expired — remove it
        if (status === 404 || status === 410) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error("[push] send error", err);
        }
      }
    })
  );
}

/** Send a push to ALL subscriptions belonging to the staff member's user account. */
export async function notifyStaffAssigned(
  staffUserId: string,
  tourName: string,
  pickupAt: string
): Promise<void> {
  const pickupTime = new Date(pickupAt).toLocaleTimeString("en-NL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  });
  await sendPushToUser(staffUserId, {
    title: "New tour assigned",
    body:  `${tourName} — pickup at ${pickupTime}`,
    url:   "/driver/today",
    icon:  "/icons/icon-192.png",
  });
}
