import "dotenv/config";

export type NodeEnv = "development" | "test" | "production";

export interface EnvConfig {
  NODE_ENV: NodeEnv;
  PORT: number;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_ANON_KEY?: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  CLIENT_URL: string;
  RATE_LIMIT_WINDOW_MINUTES: number;
  RATE_LIMIT_MAX: number;
}

const missing: string[] = [];
const invalid: string[] = [];

function rawValue(name: string): string | undefined {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") return undefined;
  return value.trim();
}

function requireString(name: string): string {
  const value = rawValue(name);
  if (value === undefined) {
    missing.push(name);
    return "";
  }
  return value;
}

function stringWithDefault(name: string, fallback: string): string {
  return rawValue(name) ?? fallback;
}

function intWithDefault(name: string, fallback: number, label: string): number {
  const raw = rawValue(name);
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    invalid.push(`${label} must be a positive integer`);
    return fallback;
  }
  return parsed;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// --- Required values -------------------------------------------------------
const NODE_ENV_RAW = stringWithDefault("NODE_ENV", "development");
if (!["development", "test", "production"].includes(NODE_ENV_RAW)) {
  invalid.push("NODE_ENV must be one of: development, test, production");
}
const NODE_ENV = NODE_ENV_RAW as NodeEnv;

const PORT = intWithDefault("PORT", 5000, "PORT");

const SUPABASE_URL = requireString("SUPABASE_URL");
if (SUPABASE_URL !== "" && !isValidHttpUrl(SUPABASE_URL)) {
  invalid.push("SUPABASE_URL must be a valid http(s) URL");
}

// Length is checked, the value itself is never printed.
const SUPABASE_SERVICE_ROLE_KEY = requireString("SUPABASE_SERVICE_ROLE_KEY");
if (
  SUPABASE_SERVICE_ROLE_KEY !== "" &&
  SUPABASE_SERVICE_ROLE_KEY.length < 20
) {
  invalid.push("SUPABASE_SERVICE_ROLE_KEY looks too short to be a valid key");
}

const JWT_SECRET = requireString("JWT_SECRET");
if (JWT_SECRET !== "" && JWT_SECRET.length < 16) {
  invalid.push("JWT_SECRET must be at least 16 characters long");
}

// --- Optional values -------------------------------------------------------
const JWT_EXPIRES_IN = stringWithDefault("JWT_EXPIRES_IN", "7d");

let CLIENT_URL = stringWithDefault("CLIENT_URL", "http://localhost:8081");
const clientOrigins = CLIENT_URL.split(",").map((o) => o.trim()).filter(Boolean);
for (const origin of clientOrigins) {
  if (origin === "*") continue;
  if (!isValidHttpUrl(origin)) {
    invalid.push(`CLIENT_URL contains an invalid origin (use full http(s) URLs, comma separated): ${origin}`);
  }
}
if (NODE_ENV === "production" && clientOrigins.includes("*")) {
  invalid.push('CLIENT_URL cannot be "*" in production. List your real app origins instead.');
}

const RATE_LIMIT_WINDOW_MINUTES = intWithDefault(
  "RATE_LIMIT_WINDOW_MINUTES",
  15,
  "RATE_LIMIT_WINDOW_MINUTES"
);
const RATE_LIMIT_MAX = intWithDefault("RATE_LIMIT_MAX", 300, "RATE_LIMIT_MAX");

// --- Report ----------------------------------------------------------------
function reportAndExit(): never {
  console.error("");
  console.error("========================================");
  console.error(" Configuration Error");
  console.error("========================================");
  console.error("");

  if (missing.length > 0) {
    console.error("Missing environment variables:");
    console.error("");
    for (const name of missing) console.error(name);
    console.error("");
    console.error("Please add them to .env (see .env.example).");
    console.error("Supabase credentials are required - put the REAL values from");
    console.error("Supabase Dashboard -> Project Settings -> API into .env.");
    console.error("");
  }

  if (invalid.length > 0) {
    console.error("Invalid environment variables:");
    console.error("");
    for (const problem of invalid) console.error(`- ${problem}`);
    console.error("");
  }

  // Values are intentionally never printed.
  console.error("Secret values are never displayed in this output.");
  console.error("");
  process.exit(1);
}

if (missing.length > 0 || invalid.length > 0) {
  reportAndExit();
}

const env: EnvConfig = {
  NODE_ENV,
  PORT,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_ANON_KEY: rawValue("SUPABASE_ANON_KEY"),
  JWT_SECRET,
  JWT_EXPIRES_IN,
  CLIENT_URL,
  RATE_LIMIT_WINDOW_MINUTES,
  RATE_LIMIT_MAX
};

export { env, NODE_ENV };
export const isProduction = env.NODE_ENV === "production";
