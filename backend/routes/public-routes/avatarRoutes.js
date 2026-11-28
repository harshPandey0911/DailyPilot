import { Router } from "express";
import { createPortrait, getAvatarStatus } from "../../controllers/publicControllers/avatarController.js";

const router = Router();
router.get("/status", getAvatarStatus);
router.post("/portrait", createPortrait);

export default router;
