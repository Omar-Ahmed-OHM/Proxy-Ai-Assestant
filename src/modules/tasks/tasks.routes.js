import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { writeLimiter } from "../../middlewares/rateLimiter.js";
import * as tasksController from "./tasks.controller.js";
import {
  createTaskSchema,
  updateTaskSchema,
  taskIdSchema,
} from "./tasks.validation.js";

const router = Router();
const validateId = validate(taskIdSchema, "params");

// Before auth so write attempts with missing/invalid tokens still count against the IP
router.use(writeLimiter);
router.use(requireAuth);

router.post("/", validate(createTaskSchema), tasksController.createTask);
router.get("/", tasksController.getTasks);
router.get("/:id", validateId, tasksController.getTask);
router.patch(
  "/:id",
  validateId,
  validate(updateTaskSchema),
  tasksController.updateTask
);
router.patch("/:id/complete", validateId, tasksController.completeTask);
router.delete("/:id", validateId, tasksController.deleteTask);

export default router;
