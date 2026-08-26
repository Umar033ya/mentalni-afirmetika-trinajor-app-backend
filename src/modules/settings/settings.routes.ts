import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validation.middleware";
import { asyncHandler } from "../../utils/async-handler";
import { settingsController } from "./settings.controller";

const updateSchema = z
  .object({
    soundEnabled: z.boolean(),
    musicEnabled: z.boolean(),
    hapticsEnabled: z.boolean(),
    language: z.string().min(2).max(10),
    theme: z.enum(["system", "light", "dark"]),
    notificationsDuels: z.boolean(),
    notificationsResults: z.boolean(),
    dailyReminder: z.boolean()
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field is required" });

const router = Router();

router.use(requireAuth);

router.get("/me", asyncHandler(settingsController.me));
router.patch(
  "/me",
  validate({
    body: z.any().transform((body, ctx) => {
      const camelToSnake: Record<string, string> = {
        soundEnabled: "sound_enabled",
        musicEnabled: "music_enabled",
        hapticsEnabled: "haptics_enabled",
        language: "language",
        theme: "theme",
        notificationsDuels: "notifications_duels",
        notificationsResults: "notifications_results",
        dailyReminder: "daily_reminder"
      };
      if (typeof body !== "object" || body === null) {
        ctx.addIssue({ code: "custom", message: "Body must be an object" });
        return z.NEVER;
      }
      const patch: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
        const snake = camelToSnake[key];
        if (!snake) continue;
        patch[snake] = value;
      }
      const parsed = updateSchema.safeParse(body);
      if (!parsed.success) {
        for (const issue of parsed.error.errors) {
          ctx.addIssue(issue);
        }
        return z.NEVER;
      }
      return patch;
    })
  }),
  asyncHandler(settingsController.updateMe)
);

export default router;
