import { Router } from "express";
import {
  subscribe,
  unsubscribe,
  testPush,
} from "./push.controller.js";

import { protect } from "../../middlewares/auth.middleware.js";

const router = Router();

router.post("/subscribe", protect, subscribe);
router.post("/unsubscribe", protect, unsubscribe);
router.post("/test", protect, testPush);

export default router;