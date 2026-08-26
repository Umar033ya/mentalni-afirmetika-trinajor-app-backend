import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validation.middleware";
import { asyncHandler } from "../../utils/async-handler";
import { notificationController } from "./notification.controller";

const router = Router();

router.use(requireAuth);

router.get("/", asyncHandler(notificationController.list));
router.patch(
  "/read-all",
  validate({ body: z.object({}).optional() }),
  asyncHandler(notificationController.markAllRead)
);
router.patch(
  "/:id/read",
  validate({ body: z.object({}).optional() }),
  asyncHandler(notificationController.markRead)
);

export default router;
