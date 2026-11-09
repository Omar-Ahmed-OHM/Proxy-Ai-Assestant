import { Router } from "express";
import {
  subscribe,
  unsubscribe,
  testPush,
} from "./push.controller.js";

import { requireAuth } from "../../middlewares/auth.js";

const router = Router();

router.post("/subscribe", requireAuth, subscribe);
router.post("/unsubscribe", requireAuth, unsubscribe);
router.post("/test", requireAuth, testPush);

export default router;