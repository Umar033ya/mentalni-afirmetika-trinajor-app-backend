import rateLimit from "express-rate-limit";
import { appConfig } from "../config/app.config";

export const globalLimiter = rateLimit({
  windowMs: appConfig.rateLimit.windowMs,
  max: appConfig.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: "RATE_LIMITED", message: "Too many requests, please slow down" } }
});

export const authLimiter = rateLimit({
  windowMs: appConfig.authRateLimit.windowMs,
  max: appConfig.authRateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: "RATE_LIMITED", message: "Too many auth attempts, try again later" } }
});

export const chatLimiter = rateLimit({
  windowMs: appConfig.chatRateLimit.windowMs,
  max: appConfig.chatRateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: "RATE_LIMITED", message: "Sending messages too fast" } }
});

export const answerLimiter = rateLimit({
  windowMs: appConfig.answerRateLimit.windowMs,
  max: appConfig.answerRateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: "RATE_LIMITED", message: "Submitting answers too fast" } }
});
