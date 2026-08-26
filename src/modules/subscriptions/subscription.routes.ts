import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validation.middleware";
import { asyncHandler } from "../../utils/async-handler";
import { subscriptionController } from "./subscription.controller";
import { subscribeSchema } from "./subscription.validation";

const router = Router();

router.use(requireAuth);

router.get("/me", asyncHandler(subscriptionController.me));
router.post("/subscribe", validate({ body: subscribeSchema }), asyncHandler(subscriptionController.subscribe));
router.post("/cancel", asyncHandler(subscriptionController.cancel));

export default router;
