"use client";

import { useEffect, useState, useTransition } from "react";
import { loadWaitlistEmails } from "@/app/admin/services/actions";

type Email = { email: string; created_at: string; locale: string | null };

type Props = {
  serviceId: string;
  serviceName: string;
  onClose: () => void;
};

export default function WaitlistDrawer({ serviceId, serviceName, onClose }: Props) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const data = await loadWaitlistEmails(serviceId);
      setEmails(data);
    });
  }, [serviceId]);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-ink-black border-l border-warm-cream/10 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-warm-cream/10">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-warm-cream/40 mb-0.5">Waitlist</p>
            <h2 className="font-semibold text-warm-cream text-sm">{serviceName}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-warm-cream/50 hover:text-warm-cream hover:bg-warm-cream/10 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {emails.length === 0 ? (
            <p className="text-sm text-warm-cream/30 text-center py-8">No signups yet.</p>
          ) : (
            <ul className="space-y-2">
              {emails.map((e, i) => (
                <li key={i} className="rounded-lg border border-warm-cream/10 bg-warm-cream/[0.03] px-3 py-2">
                  <p className="text-sm text-warm-cream font-mono">{e.email}</p>
                  <div className="flex gap-3 mt-0.5">
                    <p className="text-[10px] text-warm-cream/35">
                      {new Date(e.created_at).toLocaleDateString("en-NL")}
                    </p>
                    {e.locale && (
                      <p className="text-[10px] text-warm-cream/30">{e.locale}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="px-5 py-4 border-t border-warm-cream/10">
          <p className="text-xs text-warm-cream/30 text-center">
            {emails.length} {emails.length === 1 ? "signup" : "signups"}
          </p>
        </div>
      </div>
    </>
  );
}
