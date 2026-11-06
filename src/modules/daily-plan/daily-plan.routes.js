import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { writeLimiter } from "../../middlewares/rateLimiter.js";
import * as dailyPlanController from "./daily-plan.controller.js";
import {
  createDailyPlanSchema,
  updateDailyPlanSchema,
  dailyPlanIdSchema,
  listDailyPlansQuerySchema,
  addTaskToPlanSchema,
  removeTaskFromPlanSchema,
  reorderPlanTasksSchema,
} from "./daily-plan.validation.js";

const router = Router();
const validateId = validate(dailyPlanIdSchema, "params");

// Before auth so write attempts with missing/invalid tokens still count against the IP
router.use(writeLimiter);
router.use(requireAuth);

router.post("/", validate(createDailyPlanSchema), dailyPlanController.createDailyPlan);
router.get(
  "/",
  validate(listDailyPlansQuerySchema, "query"),
  dailyPlanController.getDailyPlans
);

// Static "/tasks/reorder" is declared before the "/tasks/:taskId" param route
router.patch(
  "/:id/tasks/reorder",
  validateId,
  validate(reorderPlanTasksSchema),
  dailyPlanController.reorderPlanTasks
);
router.post(
  "/:id/tasks",
  validateId,
  validate(addTaskToPlanSchema),
  dailyPlanController.addTaskToPlan
);
router.delete(
  "/:id/tasks/:taskId",
  validate(removeTaskFromPlanSchema, "params"),
  dailyPlanController.removeTaskFromPlan
);
router.patch("/:id/complete", validateId, dailyPlanController.completeDailyPlan);

router.get("/:id", validateId, dailyPlanController.getDailyPlan);
router.patch(
  "/:id",
  validateId,
  validate(updateDailyPlanSchema),
  dailyPlanController.updateDailyPlan
);
router.delete("/:id", validateId, dailyPlanController.deleteDailyPlan);

export default router;
