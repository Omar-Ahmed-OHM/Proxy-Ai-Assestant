import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { writeLimiter } from "../../middlewares/rateLimiter.js";
import * as remindersController from "./reminders.controller.js";
import {
  createReminderSchema,
  updateReminderSchema,
  reminderIdSchema,
  listRemindersQuerySchema,
} from "./reminders.validation.js";

const router = Router();
const validateId = validate(reminderIdSchema, "params");

// Before auth so write attempts with missing/invalid tokens still count against the IP
router.use(writeLimiter);
router.use(requireAuth);

router.post("/", validate(createReminderSchema), remindersController.createReminder);
router.get(
  "/",
  validate(listRemindersQuerySchema, "query"),
  remindersController.getReminders
);
router.get("/:id", validateId, remindersController.getReminder);
router.patch(
  "/:id",
  validateId,
  validate(updateReminderSchema),
  remindersController.updateReminder
);
router.patch("/:id/complete", validateId, remindersController.completeReminder);
router.patch("/:id/cancel", validateId, remindersController.cancelReminder);
router.delete("/:id", validateId, remindersController.deleteReminder);

export default router;
