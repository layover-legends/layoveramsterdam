"use client";

import { useEffect } from "react";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw     = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export default function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js", { scope: "/driver/" })
      .then(async (reg) => {
        // Request push permission + subscribe
        if (!VAPID_PUBLIC) return;
        const perm = await Notification.requestPermission();
        if (perm !== "granted") return;

        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          // Refresh last_seen_at
          await savePushSubscription(existing);
          return;
        }

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as unknown as string,
        });
        await savePushSubscription(sub);
      })
      .catch((err) => console.warn("[SW] registration failed:", err));
  }, []);

  return null;
}

async function savePushSubscription(sub: PushSubscription) {
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;
  try {
    await fetch("/api/driver/push-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint:   json.endpoint,
        p256dh_key: json.keys.p256dh,
        auth_key:   json.keys.auth,
        user_agent: navigator.userAgent,
      }),
    });
  } catch { /* non-fatal */ }
}
