import { z } from "zod";

// E.164 phone number, e.g. +14155551234
export const E164 = z
  .string()
  .regex(/^\+[1-9]\d{7,14}$/, "Phone must be in E.164 format like +14155551234");

export const SignupSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(12).max(200),
  phone: E164,
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

// After password verification, server returns a challenge id;
// client posts the SMS code with this id to /auth/2fa/verify.
export const TwoFactorVerifySchema = z.object({
  challengeId: z.string().min(10),
  code: z.string().regex(/^\d{6}$/, "Code must be 6 digits"),
});
export type TwoFactorVerifyInput = z.infer<typeof TwoFactorVerifySchema>;

export const ResendCodeSchema = z.object({
  challengeId: z.string().min(10),
});
export type ResendCodeInput = z.infer<typeof ResendCodeSchema>;

export type SmsCodePurpose =
  | "signup_verify_phone"
  | "login_2fa"
  | "phone_change";
