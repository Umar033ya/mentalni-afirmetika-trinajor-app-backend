import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

export const db: SupabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  },
  global: {
    headers: { "x-application-name": "mental-arifmetika-backend" }
  }
});

export interface SupabaseStatus {
  connected: boolean;
  latencyMs?: number;
  error?: string;
}

/**
 * Cheap, safe connectivity probe. Performs a HEAD-style select against a tiny
 * system table and reports only a boolean + non-secret error message.
 * Never logs or returns credentials.
 */
export async function checkSupabaseConnection(): Promise<SupabaseStatus> {
  const startedAt = Date.now();
  try {
    const { error } = await db
      .from("app_settings")
      .select("key", { head: true })
      .limit(1);

    if (error) {
      // PostgREST/Supabase error messages are safe (no keys included).
      return { connected: false, error: error.message };
    }
    return { connected: true, latencyMs: Date.now() - startedAt };
  } catch (err) {
    const message =
      err instanceof Error ? err.message.replace(/https?:\/\/\S+/g, "<supabase-host>") : "Unknown connection error";
    return { connected: false, error: message };
  }
}
