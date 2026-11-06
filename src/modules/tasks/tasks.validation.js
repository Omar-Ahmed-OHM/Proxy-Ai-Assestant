import { z } from "zod";
import { TASK_STATUSES, TASK_PRIORITIES } from "./task.model.js";
import { objectIdSchema, dateSchema } from "../../utils/validators.js";

const title = z.string().trim().min(1).max(150);
const description = z.string().trim().max(2000);

export const createTaskSchema = z
  .object({
    title,
    description: description.optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    dueDate: dateSchema.optional(),
  })
  .strict();

export const updateTaskSchema = z
  .object({
    title: title.optional(),
    description: description.nullable().optional(),
    status: z.enum(TASK_STATUSES).optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    dueDate: dateSchema.nullable().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const taskIdSchema = z
  .object({
    id: objectIdSchema,
  })
  .strict();
