import { Router } from "express";
import { validate } from "../../middlewares/validate.js";
import { loginLimiter, registerLimiter } from "../../middlewares/rateLimiter.js";
import * as authController from "./auth.controller.js";
import { registerSchema, loginSchema } from "./auth.validation.js";

const router = Router();

router.post(
  "/register",
  registerLimiter,
  validate(registerSchema),
  authController.register
);
router.post("/login", loginLimiter, validate(loginSchema), authController.login);

export default router;
