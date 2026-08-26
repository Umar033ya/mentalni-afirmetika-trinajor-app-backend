import { db } from "../../config/database";
import { ONLINE_WINDOW_MS, PRESENCE_TOUCH_INTERVAL_MS } from "../../config/constants";
import { AppError } from "../../utils/response";
import type { PageParams } from "../../utils/pagination";
import { buildPaginationMeta } from "../../utils/pagination";
import type { PublicUserProfile } from "./user.mapper";
import {
  USER_SELECT_WITH_COSMETICS,
  toPublicUser,
  type UserQueryRow
} from "./user.mapper";

async function findRawById(userId: string): Promise<UserQueryRow> {
  const { data, error } = await db
    .from("users")
    .select(USER_SELECT_WITH_COSMETICS)
    .eq("id", userId)
    .maybeSingle<UserQueryRow>();
  if (error) throw error;
  if (!data) throw new AppError(404, "USER_NOT_FOUND", "User not found");
  return data;
}

async function getMe(userId: string) {
  return findRawById(userId);
}

async function getPublicUser(targetId: string): Promise<PublicUserProfile> {
  const row = await findRawById(targetId);
  return toPublicUser(row);
}

interface UpdateMeInput {
  username?: string;
  phone?: string | null;
  avatarUrl?: string | null;
}

async function updateMe(userId: string, input: UpdateMeInput): Promise<UserQueryRow> {
  const patch: Record<string, unknown> = {};
  if (input.username !== undefined) {
    const existing = await db
      .from("users")
      .select("id")
      .ilike("username", input.username)
      .neq("id", userId)
      .maybeSingle();
    if (existing.data) throw new AppError(409, "USERNAME_TAKEN", "Username is already taken");
    patch.username = input.username;
  }
  if (input.phone !== undefined) patch.phone = input.phone;
  if (input.avatarUrl !== undefined) patch.avatar_url = input.avatarUrl;

  if (Object.keys(patch).length === 0) {
    return findRawById(userId);
  }

  const { data, error } = await db
    .from("users")
    .update(patch)
    .eq("id", userId)
    .select(USER_SELECT_WITH_COSMETICS)
    .single<UserQueryRow>();
  if (error) throw error;
  return data;
}

async function listOnline(page: PageParams): Promise<{
  items: PublicUserProfile[];
  pagination: ReturnType<typeof buildPaginationMeta>;
}> {
  const since = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();
  const { data, error, count } = await db
    .from("users")
    .select(USER_SELECT_WITH_COSMETICS, { count: "exact" })
    .eq("is_online", true)
    .gte("last_seen", since)
    .order("duel_rating", { ascending: false })
    .range(page.from, page.to);

  if (error) throw error;
  const rows = (data ?? []) as UserQueryRow[];
  return { items: rows.map(toPublicUser), pagination: buildPaginationMeta(page, count) };
}

async function touchPresence(userId: string, online = true): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await db
    .from("users")
    .update({ is_online: online, last_seen: now })
    .eq("id", userId);
  if (error && process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.error("[presence] touch failed:", error.message);
  }
}

async function shouldTouch(row: UserQueryRow): Promise<boolean> {
  const lastSeen = row.last_seen ? new Date(row.last_seen).getTime() : 0;
  return !row.is_online || Date.now() - lastSeen > PRESENCE_TOUCH_INTERVAL_MS;
}

export const userService = {
  findRawById,
  getMe,
  getPublicUser,
  updateMe,
  listOnline,
  touchPresence,
  shouldTouch
};
