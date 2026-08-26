import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../utils/async-handler";
import { matchController } from "./match.controller";

const router = Router();

router.use(requireAuth);

router.get("/", asyncHandler(matchController.list));
router.get("/:id", asyncHandler(matchController.getById));

export default router;
