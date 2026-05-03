// Shared types for the Stripe sync + checkout layers.
// No server imports — safe to use in both contexts.

export type SyncStatus = "created" | "updated" | "unchanged" | "failed";
export type ServiceKind = "tour" | "addon";

export type SyncResult = {
  service_id: string;
  service_kind: ServiceKind;
  product_id: string | null;
  price_id: string | null;
  old_price_id: string | null;
  status: SyncStatus;
  error?: string;
};

export type CheckoutPayload = {
  bookingId: string;
  locale: string;
  successUrl: string;
  cancelUrl: string;
  userEmail?: string | null;
};
