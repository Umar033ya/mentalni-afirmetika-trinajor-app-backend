export interface SubscriptionRow {
  id: string;
  user_id: string;
  plan: "FREE" | "PRO";
  status: "active" | "cancelled" | "expired";
  started_at: string;
  expires_at: string | null;
  payment_provider: string | null;
  external_id: string | null;
  created_at: string;
  updated_at: string;
}
