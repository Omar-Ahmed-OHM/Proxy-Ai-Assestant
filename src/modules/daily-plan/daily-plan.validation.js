import { z } from "zod";
import { objectIdSchema } from "../../utils/validators.js";
import { isRealCalendarDate } from "../../utils/date.js";
import { MAX_TASKS_PER_PLAN } from "./daily-plan.model.js";

export const dailyPlanDateSchema = z
  .iso.date()
  .refine(isRealCalendarDate, "Invalid calendar date");

const note = z.string().trim().max(500);

const hasUniqueIds = (ids) => new Set(ids).size === ids.length;

const planTasks = z
  .array(
    z
      .object({
        taskId: objectIdSchema,
        note: note.optional(),
      })
      .strict()
  )
  .max(MAX_TASKS_PER_PLAN)
  .refine((tasks) => hasUniqueIds(tasks.map((t) => t.taskId)), "Duplicate taskId in plan");

export const createDailyPlanSchema = z
  .object({
    date: dailyPlanDateSchema.optional(),
    tasks: planTasks.optional(),
  })
  .strict();

export const updateDailyPlanSchema = z
  .object({
    date: dailyPlanDateSchema.optional(),
    tasks: planTasks.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const dailyPlanIdSchema = z
  .object({
    id: objectIdSchema,
  })
  .strict();

export const listDailyPlansQuerySchema = z
  .object({
    date: dailyPlanDateSchema.optional(),
    from: dailyPlanDateSchema.optional(),
    to: dailyPlanDateSchema.optional(),
  })
  .strict()
  .refine((q) => !(q.date && (q.from || q.to)), {
    message: "Use either date or from/to, not both",
  })
  .refine((q) => !(q.from && q.to) || q.from <= q.to, {
    message: "from must not be after to",
    path: ["from"],
  });

export const addTaskToPlanSchema = z
  .object({
    taskId: objectIdSchema,
    note: note.optional(),
  })
  .strict();

export const removeTaskFromPlanSchema = z
  .object({
    id: objectIdSchema,
    taskId: objectIdSchema,
  })
  .strict();

export const reorderPlanTasksSchema = z
  .object({
    taskIds: z
      .array(objectIdSchema)
      .min(1)
      .max(MAX_TASKS_PER_PLAN)
      .refine(hasUniqueIds, "Duplicate taskId in order"),
  })
  .strict();
