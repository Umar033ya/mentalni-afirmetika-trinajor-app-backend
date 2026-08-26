import { db } from "../../config/database";
import type { PageParams } from "../../utils/pagination";
import { buildPaginationMeta } from "../../utils/pagination";

async function listUsers(page: PageParams, search?: string) {
  let query = db
    .from("users")
    .select(
      "id,username,email,phone,role,level,xp,wins,losses,duel_rating,is_online,is_banned,last_seen,created_at",
      { count: "exact" }
    );
  if (search) query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%`);

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(page.from, page.to);
  if (error) throw error;
  return { items: data ?? [], pagination: buildPaginationMeta(page, count) };
}

async function updateUser(userId: string, patch: { role?: "user" | "admin"; is_banned?: boolean }) {
  const { data, error } = await db
    .from("users")
    .update(patch)
    .eq("id", userId)
    .select("id,username,role,is_banned")
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function overview() {
  const [usersRes, duelsRes, matchesRes, practiceRes, subsRes] = await Promise.all([
    db.from("users").select("id", { count: "exact", head: true }),
    db.from("duels").select("id", { count: "exact", head: true }),
    db
      .from("duels")
      .select("id", { count: "exact", head: true })
      .eq("status", "COMPLETED"),
    db.from("practice_sessions").select("id", { count: "exact", head: true }),
    db
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .eq("plan", "PRO")
  ]);
  return {
    users: usersRes.count ?? 0,
    duels: duelsRes.count ?? 0,
    completedDuels: matchesRes.count ?? 0,
    practiceSessions: practiceRes.count ?? 0,
    activeProSubscriptions: subsRes.count ?? 0
  };
}

async function listAppSettings() {
  const { data, error } = await db.from("app_settings").select("*").order("key");
  if (error) throw error;
  return data ?? [];
}

async function upsertAppSetting(key: string, value: unknown) {
  const { data, error } = await db
    .from("app_settings")
    .upsert({ key, value }, { onConflict: "key" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export const adminService = { listUsers, updateUser, overview, listAppSettings, upsertAppSetting };
