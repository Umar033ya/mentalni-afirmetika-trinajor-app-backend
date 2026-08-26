import { db } from "../../config/database";
import type { NotificationType } from "../../types/notification.types";
import type { PageParams } from "../../utils/pagination";
import { buildPaginationMeta } from "../../utils/pagination";

export interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

interface CreateInput {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string | null;
  data?: Record<string, unknown> | null;
}

async function create(input: CreateInput): Promise<void> {
  const { error } = await db.from("notifications").insert({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    message: input.message ?? null,
    data: input.data ?? null
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[notification] failed to create:", error.message);
  }
}

async function createMany(inputs: CreateInput[]): Promise<void> {
  if (inputs.length === 0) return;
  const rows = inputs.map((input) => ({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    message: input.message ?? null,
    data: input.data ?? null
  }));
  const { error } = await db.from("notifications").insert(rows);
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[notification] failed to create batch:", error.message);
  }
}

async function list(userId: string, page: PageParams) {
  let query = db
    .from("notifications")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(page.from, page.to);

  const { data, error, count } = await query;
  if (error) throw error;
  return { items: (data ?? []) as NotificationRow[], pagination: buildPaginationMeta(page, count) };
}

async function countUnread(userId: string): Promise<number> {
  const { count, error } = await db
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  if (error) throw error;
  return count ?? 0;
}

async function markRead(userId: string, notificationId: string): Promise<void> {
  const { data, error } = await db
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw Object.assign(new Error("Notification not found"), { statusCode: 404, code: "NOTIFICATION_NOT_FOUND" });
  }
}

async function markAllRead(userId: string): Promise<void> {
  const { error } = await db
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  if (error) throw error;
}

export const notificationService = { create, createMany, list, countUnread, markRead, markAllRead };
