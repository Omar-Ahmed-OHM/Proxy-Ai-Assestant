import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { writeLimiter } from "../../middlewares/rateLimiter.js";
import * as usersController from "./users.controller.js";
import { updateMeSchema, changePasswordSchema } from "./users.validation.js";

const router = Router();

// Before auth so write attempts with missing/invalid tokens still count against the IP
router.use(writeLimiter);
router.use(requireAuth);

router.get("/me", usersController.getMe);
router.patch("/me", validate(updateMeSchema), usersController.updateMe);
router.put(
  "/me/password",
  validate(changePasswordSchema),
  usersController.changeMyPassword
);
router.delete("/me", usersController.deleteMe);

export default router;
