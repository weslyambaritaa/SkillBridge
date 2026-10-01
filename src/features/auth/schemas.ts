import { z } from "zod";

export const registrationSchema = z.object({
  email: z.email().trim().max(254),
  password: z.string().min(8).max(128),
  role: z.enum(["STUDENT", "BUSINESS"]),
});

export const loginSchema = z.object({
  email: z.email().trim().max(254),
  password: z.string().min(1).max(128),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
