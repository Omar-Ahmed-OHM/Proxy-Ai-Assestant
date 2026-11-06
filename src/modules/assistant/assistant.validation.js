import { z } from "zod";
import { isValidTimezone } from "../../utils/date.js";

const timezone = z.string().refine(isValidTimezone, "Invalid timezone");

export const sendMessageSchema = z
  .object({
    content: z.string().trim().min(1).max(2000),
    history: z
      .array(
        z
          .object({
            role: z.enum(["user", "assistant"]),
            content: z.string().min(1).max(4000),
          })
          .strict()
      )
      .max(20)
      .optional(),
    timezone: timezone.optional(),
  })
  .strict();

export const briefingQuerySchema = z
  .object({
    timezone: timezone.optional(),
  })
  .strict();
