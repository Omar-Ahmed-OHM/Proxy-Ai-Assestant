import { z } from "zod";
import { isValidTimezone } from "../../utils/date.js";

const timezone = z.string().refine(isValidTimezone, "Invalid timezone");

export const summaryQuerySchema = z
  .object({
    timezone: timezone.optional(),
  })
  .strict();

export const weatherQuerySchema = z
  .object({
    timezone: timezone.optional(),
    city: z.string().trim().min(1).max(100).optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lon: z.coerce.number().min(-180).max(180).optional(),
  })
  .strict()
  .refine((query) => (query.lat === undefined) === (query.lon === undefined), {
    message: "lat and lon must be sent together",
    path: ["lat"],
  });
