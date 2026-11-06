import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { writeLimiter } from "../../middlewares/rateLimiter.js";
import * as assistantController from "./assistant.controller.js";
import { sendMessageSchema, briefingQuerySchema } from "./assistant.validation.js";

const router = Router();

// Before auth so write attempts with missing/invalid tokens still count against the IP
router.use(writeLimiter);
router.use(requireAuth);

router.post("/messages", validate(sendMessageSchema), assistantController.sendMessage);
router.get(
  "/briefing",
  validate(briefingQuerySchema, "query"),
  assistantController.getBriefing
);

export default router;
