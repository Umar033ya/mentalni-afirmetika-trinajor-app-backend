import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.middleware";
import { requirePro } from "../../middleware/pro.middleware";
import { validate } from "../../middleware/validation.middleware";
import { chatLimiter } from "../../middleware/rate-limit.middleware";
import { asyncHandler } from "../../utils/async-handler";
import { chatController } from "./chat.controller";

const router = Router();

router.use(requireAuth);

router.get("/:id/messages", asyncHandler(chatController.listMessages));
router.post(
  "/:id/messages",
  requirePro,
  chatLimiter,
  validate({
    body: z.object({
      message: z.string().min(1).max(200),
      messageType: z.enum(["text", "emoji"]).default("text")
    })
  }),
  asyncHandler(chatController.sendMessage)
);

export default router;
