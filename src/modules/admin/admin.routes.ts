import { Router } from "express";
import { z } from "zod";
import { requireAdmin, requireAuth } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validation.middleware";
import { asyncHandler } from "../../utils/async-handler";
import { adminController } from "./admin.controller";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/users", asyncHandler(adminController.listUsers));
router.patch(
  "/users/:id",
  validate({
    body: z
      .object({
        role: z.enum(["user", "admin"]),
        is_banned: z.boolean()
      })
      .refine((v) => Object.keys(v).length > 0, { message: "At least one field is required" })
  }),
  asyncHandler(adminController.updateUser)
);
router.get("/overview", asyncHandler(adminController.overview));
router.get("/settings", asyncHandler(adminController.getAppSettings));
router.put(
  "/settings",
  validate({
    body: z.object({
      key: z.string().min(1).max(100),
      value: z.unknown()
    })
  }),
  asyncHandler(adminController.setAppSetting)
);

export default router;
