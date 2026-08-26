import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../utils/async-handler";
import { cosmeticsController } from "./cosmetics.controller";

const router = Router();

router.use(requireAuth);

router.get("/", asyncHandler(cosmeticsController.catalog));
router.get("/emojis", asyncHandler(cosmeticsController.emojis));
router.get("/frames", asyncHandler(cosmeticsController.frames));
router.get("/titles", asyncHandler(cosmeticsController.titles));
router.post("/emojis/:id/equip", asyncHandler(cosmeticsController.equipEmoji));
router.post("/frames/:id/equip", asyncHandler(cosmeticsController.equipFrame));
router.post("/titles/:id/equip", asyncHandler(cosmeticsController.equipTitle));

export default router;
