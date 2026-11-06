import { z } from "zod";

export const updateMeSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    timezone: z.string().min(1).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(128),
  })
  .strict();
