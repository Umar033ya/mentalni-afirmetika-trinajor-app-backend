import "dotenv/config";
import { env } from "./config/env";
import { createApp } from "./app";
import { checkSupabaseConnection } from "./config/database";

const app = createApp();
const PORT = env.PORT || 5000;

function printBanner(): void {
  // eslint-disable-next-line no-console
  console.log(`
========================================
 Mental Arithmetic Backend
========================================
Environment: ${env.NODE_ENV}
Port: ${PORT}
Supabase: configured
JWT: configured

Server: http://localhost:${PORT}
Health: http://localhost:${PORT}/health

========================================`);
}

async function verifyDatabaseConnection(): Promise<void> {
  const status = await checkSupabaseConnection();
  if (status.connected) {
    // eslint-disable-next-line no-console
    console.log(`Supabase connection: OK (${status.latencyMs}ms)`);
  } else {
    // Non-secret error only. Check the migrations if the message mentions a missing table.
    // eslint-disable-next-line no-console
    console.error(`Supabase connection: FAILED (${status.error})`);
    if (env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error(
        "Hint: run supabase/migrations/001_initial_schema.sql and 002_seed_data.sql in the Supabase SQL Editor."
      );
    }
  }
}

const server = app.listen(PORT, () => {
  printBanner();
  void verifyDatabaseConnection();
});

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] ${signal} received, shutting down`);
    server.close(() => process.exit(0));
  });
}

process.on("unhandledRejection", (reason) => {
  // eslint-disable-next-line no-console
  console.error("[server] unhandled rejection:", reason);
});
