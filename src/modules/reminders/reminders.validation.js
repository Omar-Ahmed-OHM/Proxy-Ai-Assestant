import { z } from "zod";
import { REMINDER_STATUSES } from "./reminder.model.js";
import { objectIdSchema } from "../../utils/validators.js";
import { isValidTimezone, isRealCalendarDate } from "../../utils/date.js";

const title = z.string().trim().min(1).max(150);
const description = z.string().trim().max(2000);
const timezone = z.string().refine(isValidTimezone, "Invalid timezone");

const remindAt = z.iso
  .datetime({ local: true, offset: true })
  .refine(isRealCalendarDate, "Invalid calendar date");

export const createReminderSchema = z
  .object({
    title,
    description: description.optional(),
    remindAt,
    timezone: timezone.optional(),
  })
  .strict();

export const updateReminderSchema = z
  .object({
    title: title.optional(),
    description: description.nullable().optional(),
    remindAt: remindAt.optional(),
    timezone: timezone.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const reminderIdSchema = z
  .object({
    id: objectIdSchema,
  })
  .strict();

export const listRemindersQuerySchema = z
  .object({
    status: z.enum(REMINDER_STATUSES).optional(),
  })
  .strict();
