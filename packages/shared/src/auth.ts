import { z } from "zod";

// E.164 phone number, e.g. +14155551234. Kept as an export for profile
// field validation — the marketplace no longer sends SMS to phone numbers
// stored here; the field is contact metadata only.
export const E164 = z
  .string()
  .regex(/^\+[1-9]\d{7,14}$/, "Phone must be in E.164 format like +14155551234");

// Signup is email + password + Turnstile. Phone is a fully optional
// profile field — collected here so users don't have to visit /account
// after signing up, but never validated, never texted, never used as
// an auth factor. Users can also edit / add / remove it from /account.
export const SignupSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(12).max(200),
  phone: z.union([E164, z.literal("")]).optional(),
  displayName: z.string().min(2).max(60),
  tosVersion: z.string().min(1),
  tosAccepted: z.literal(true),
  turnstileToken: z.string().min(1),
});
export type SignupInput = z.infer<typeof SignupSchema>;

export const LoginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(200),
  turnstileToken: z.string().min(1),
});
export type LoginInput = z.infer<typeof LoginSchema>;

// Profile-level phone update. Accepts blank string to clear the field.
export const UpdatePhoneSchema = z.object({
  phone: z.union([E164, z.literal("")]),
});
export type UpdatePhoneInput = z.infer<typeof UpdatePhoneSchema>;
