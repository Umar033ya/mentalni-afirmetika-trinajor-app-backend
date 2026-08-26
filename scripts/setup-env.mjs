#!/usr/bin/env node
/**
 * Setup check for local development and deployment.
 *
 * - Creates .env from scratch if it is missing (never overwrites existing values).
 * - Generates a strong development JWT_SECRET with node:crypto when missing.
 * - NEVER invents Supabase credentials; they must come from the real project.
 * - NEVER prints secret values.
 *
 * Exit codes: 0 = configuration usable, 1 = configuration error.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { join } from "node:path";

const ENV_PATH = join(process.cwd(), ".env");

// Keys filled automatically when absent/empty.
const AUTO_DEFAULTS = {
  PORT: "5000",
  NODE_ENV: "development",
  JWT_EXPIRES_IN: "7d",
  CLIENT_URL: "http://localhost:8081"
};

// Keys that may be generated automatically.
const AUTO_GENERATED = ["JWT_SECRET"];

// Keys that MUST be provided by the developer (never invented here).
const MANUAL_REQUIRED = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];

function parseEnvLines(lines) {
  /** @type {Record<string, {value: string, lineIndex: number}>} */
  const map = {};
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) return;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) return;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in map)) map[key] = { value, lineIndex: index };
  });
  return map;
}

function main() {
  let lines = [];
  let existed = false;

  if (existsSync(ENV_PATH)) {
    existed = true;
    lines = readFileSync(ENV_PATH, "utf8").split(/\r?\n/);
  } else {
    lines = [
      "# Mental Arithmetic Backend - local environment",
      "# Copy of .env.example. Fill in the Supabase values from YOUR project.",
      ""
    ];
  }

  const entries = parseEnvLines(lines);
  let changed = !existed;
  let jwtGenerated = false;

  const ensureKey = (key) => {
    if (!(key in entries)) {
      lines.push(`${key}=`);
      entries[key] = { value: "", lineIndex: lines.length - 1 };
      changed = true;
    }
  };

  [...Object.keys(AUTO_DEFAULTS), ...AUTO_GENERATED, ...MANUAL_REQUIRED].forEach(ensureKey);

  const setValue = (key, value) => {
    const entry = entries[key];
    if (entry.value !== "" && entry.value != null) return; // preserve existing values
    lines[entry.lineIndex] = `${key}=${value}`;
    entry.value = value;
    changed = true;
  };

  for (const [key, value] of Object.entries(AUTO_DEFAULTS)) {
    setValue(key, value);
  }

  if (entries.JWT_SECRET.value.trim() === "") {
    const generated = randomBytes(48).toString("hex");
    setValue("JWT_SECRET", generated);
    jwtGenerated = true;
  }

  if (changed) {
    writeFileSync(ENV_PATH, lines.join("\n"), "utf8");
    console.log(existed ? "[setup] Updated .env (existing values preserved)" : "[setup] Created .env");
  } else {
    console.log("[setup] .env is already complete");
  }

  if (jwtGenerated) {
    console.log("[setup] Generated a new development JWT_SECRET (stored in .env)");
  }

  // Effective values: real environment variables win over .env (Render etc.)
  const effective = (key) => {
    const fromProcess = process.env[key];
    if (fromProcess !== undefined && fromProcess.trim() !== "") return fromProcess.trim();
    return entries[key] ? entries[key].value.trim() : "";
  };

  const missing = MANUAL_REQUIRED.filter((key) => effective(key) === "");

  if (missing.length > 0) {
    console.log("");
    console.log("========================================");
    console.log(" Configuration Error");
    console.log("========================================");
    console.log("");
    console.log("Missing environment variables:");
    console.log("");
    for (const key of missing) console.log(`- ${key}`);
    console.log("");
    console.log("Supabase credentials are required.");
    console.log("Put the REAL values in .env:");
    console.log("  1. Open https://supabase.com/dashboard and select your project");
    console.log("  2. Go to Project Settings -> API");
    console.log("  3. Copy 'Project URL'        -> SUPABASE_URL");
    console.log("  4. Copy 'service_role secret' -> SUPABASE_SERVICE_ROLE_KEY");
    console.log("");
    console.log("These values are SERVER ONLY. Never put them in Expo/frontend code.");
    console.log("");
    process.exit(1);
  }

  console.log("[setup] Configuration OK");
  console.log(`[setup] Port: ${effective("PORT")}`);
  console.log("[setup] Supabase: configured");
  console.log("[setup] JWT: configured");
}

try {
  main();
} catch (error) {
  console.error(`[setup] Failed to prepare .env: ${error instanceof Error ? error.message : "unknown error"}`);
  process.exit(1);
}
