import { z } from "zod";

// No phone required. Sign-up is anonymous-friendly by design: email +
// password + Turnstile bot check + ToS. We don't collect a phone number,
// we don't send SMS, and we don't require identity verification. This is
// intentional — see the "Our philosophy" section of the ToS.

export const SignupSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(12).max(200),
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
