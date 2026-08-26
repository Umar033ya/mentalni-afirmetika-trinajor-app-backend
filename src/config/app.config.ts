import { env } from "./env";

export const appConfig = {
  name: "mental-arifmetika-backend",
  apiPrefix: `/api/v1`,
  corsOrigins: env.CLIENT_URL === "*" ? "*" : env.CLIENT_URL.split(",").map((o) => o.trim()),
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
    max: env.RATE_LIMIT_MAX
  },
  authRateLimit: {
    windowMs: 15 * 60 * 1000,
    max: 20
  },
  chatRateLimit: {
    windowMs: 60 * 1000,
    max: 30
  },
  answerRateLimit: {
    windowMs: 60 * 1000,
    max: 120
  }
};
