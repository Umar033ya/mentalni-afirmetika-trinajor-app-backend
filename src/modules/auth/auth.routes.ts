import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { authLimiter } from "../../middleware/rate-limit.middleware";
import { validate } from "../../middleware/validation.middleware";
import { asyncHandler } from "../../utils/async-handler";
import { authController } from "./auth.controller";
import { loginSchema, registerSchema } from "./auth.validation";

const router = Router();

router.post("/register", authLimiter, validate({ body: registerSchema }), asyncHandler(authController.register));
router.post("/login", authLimiter, validate({ body: loginSchema }), asyncHandler(authController.login));
router.get("/me", requireAuth, asyncHandler(authController.me));
router.post("/logout", requireAuth, asyncHandler(authController.logout));

export default router;
