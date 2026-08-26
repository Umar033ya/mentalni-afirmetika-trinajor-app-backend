import { db } from "../../config/database";
import { SUBSCRIPTION_DEFAULT_DAYS } from "../../config/constants";
import { AppError } from "../../utils/response";
import type { SubscriptionRow } from "../../types/subscription.types";

async function getActiveSubscription(userId: string): Promise<SubscriptionRow | null> {
  const now = new Date().toISOString();
  const { data, error } = await db
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("plan", "PRO")
    .eq("status", "active")
    .gt("expires_at", now)
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle<SubscriptionRow>();
  if (error) throw error;
  return data ?? null;
}

async function isPro(userId: string): Promise<boolean> {
  return (await getActiveSubscription(userId)) !== null;
}

async function getMySubscriptionStatus(userId: string) {
  const active = await getActiveSubscription(userId);
  if (!active) {
    return { plan: "FREE" as const, isPro: false, subscription: null };
  }
  const daysRemaining = Math.max(
    0,
    Math.ceil((new Date(active.expires_at as string).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );
  return {
    plan: "PRO" as const,
    isPro: true,
    daysRemaining,
    subscription: active
  };
}

/**
 * Activates or extends a Pro subscription. No payment processing happens here;
 * a real payment provider can be integrated by calling this after a verified webhook.
 */
export async function subscribe(userId: string, plan: "PRO", days?: number): Promise<SubscriptionRow> {
  if (plan !== "PRO") {
    throw new AppError(422, "INVALID_PLAN", "Only the PRO plan can be activated");
  }
  const durationDays = days && days > 0 ? Math.min(days, 3650) : SUBSCRIPTION_DEFAULT_DAYS;
  const existing = await getActiveSubscription(userId);
  const now = Date.now();

  let startedAt = new Date(now).toISOString();
  let expiresAt = new Date(now + durationDays * 24 * 60 * 60 * 1000).toISOString();

  if (existing?.expires_at) {
    expiresAt = new Date(new Date(existing.expires_at).getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();
    startedAt = existing.started_at;

    const { data, error } = await db
      .from("subscriptions")
      .update({ expires_at: expiresAt, status: "active", updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select("*")
      .single<SubscriptionRow>();
    if (error || !data) throw error ?? new Error("Failed to extend subscription");
    return data;
  }

  const { data, error } = await db
    .from("subscriptions")
    .insert({
      user_id: userId,
      plan: "PRO",
      status: "active",
      started_at: startedAt,
      expires_at: expiresAt
    })
    .select("*")
    .single<SubscriptionRow>();
  if (error || !data) throw error ?? new Error("Failed to create subscription");
  return data;
}

export async function cancel(userId: string) {
  const active = await getActiveSubscription(userId);
  if (!active) {
    throw new AppError(404, "NO_ACTIVE_SUBSCRIPTION", "You have no active Pro subscription");
  }
  const { error } = await db
    .from("subscriptions")
    .update({ status: "cancelled", expires_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", active.id);
  if (error) throw error;
  return { cancelled: true };
}

export const subscriptionService = {
  getActiveSubscription,
  isPro,
  getMySubscriptionStatus,
  subscribe,
  cancel
};
