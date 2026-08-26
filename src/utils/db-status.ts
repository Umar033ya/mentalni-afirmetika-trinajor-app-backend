import { checkSupabaseConnection } from "../config/database";

interface DbStatusCache {
  connected: boolean;
  checkedAt: number;
}

const CACHE_TTL_MS = 10_000;
let cache: DbStatusCache | null = null;

/** Cached database status so /health stays cheap. Refreshes at most every 10s. */
export async function getCachedDbStatus(force = false): Promise<DbStatusCache> {
  if (!force && cache && Date.now() - cache.checkedAt < CACHE_TTL_MS) {
    return cache;
  }
  const result = await checkSupabaseConnection();
  cache = { connected: result.connected, checkedAt: Date.now() };
  return cache;
}
