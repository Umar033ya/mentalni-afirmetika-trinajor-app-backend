import { db } from "../../config/database";
import type { PageParams } from "../../utils/pagination";
import { buildPaginationMeta } from "../../utils/pagination";

async function getMyRating(userId: string) {
  const { data: me, error } = await db
    .from("users")
    .select("id,duel_rating")
    .eq("id", userId)
    .single<{ id: string; duel_rating: number }>();
  if (error || !me) throw error ?? new Error("User not found");

  const { count, error: countError } = await db
    .from("users")
    .select("id", { count: "exact", head: true })
    .gt("duel_rating", me.duel_rating)
    .eq("is_banned", false);
  if (countError) throw countError;

  return { rating: me.duel_rating, rank: (count ?? 0) + 1 };
}

async function getHistory(userId: string, page: PageParams) {
  const { data, error, count } = await db
    .from("rating_history")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(page.from, page.to);
  if (error) throw error;
  return { items: data ?? [], pagination: buildPaginationMeta(page, count) };
}

export const ratingService = { getMyRating, getHistory };
