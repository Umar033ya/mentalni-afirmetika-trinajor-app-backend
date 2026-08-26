import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validation.middleware";
import { asyncHandler } from "../../utils/async-handler";
import { profileController } from "./profile.controller";

const router = Router();

router.use(requireAuth);

router.get("/me", asyncHandler(profileController.getMe));
router.patch(
  "/me",
  validate({
    body: z
      .object({
        bio: z.string().trim().max(280).nullable(),
        country: z.string().trim().max(60).nullable(),
        birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable()
      })
      .partial()
      .refine((v) => Object.keys(v).length > 0, { message: "At least one field is required" })
  }),
  asyncHandler(profileController.updateMe)
);

export default router;
