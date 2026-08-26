import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validation.middleware";
import { asyncHandler } from "../../utils/async-handler";
import { z } from "zod";
import { userController } from "./user.controller";

const router = Router();

router.use(requireAuth);

router.get("/online", asyncHandler(userController.listOnline));
router.get("/me", asyncHandler(userController.getMe));
router.patch(
  "/me",
  validate({
    body: z.object({
      username: z.string().trim().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/).optional(),
      phone: z.string().trim().regex(/^\+?[0-9]{7,15}$/).nullable().optional(),
      avatarUrl: z.string().url().nullable().optional()
    })
  }),
  asyncHandler(userController.updateMe)
);
router.get("/:id", asyncHandler(userController.getPublicUser));

export default router;
