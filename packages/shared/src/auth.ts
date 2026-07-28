import { z } from "zod";

// E.164 phone number, e.g. +14155551234. Kept as an export for profile
// field validation — the marketplace no longer sends SMS to phone numbers
// stored here; the field is contact metadata only.
export const E164 = z
  .string()
  .regex(/^\+[1-9]\d{7,14}$/, "Phone must be in E.164 format like +14155551234");

// 5-digit US ZIP. Normally required at signup so we can plot approximate
// membership on the /community map. A person returning to a real remote
// listing may defer it; the API verifies that listing before accepting a
// ZIP-less account. When provided, the server geocodes it → (lat, lng) and
// only ever exposes map data in aggregate, never per-user.
export const UsZip = z
  .string()
  .regex(/^\d{5}$/, "Enter a 5-digit US ZIP code");

export const AttributionSchema = z.object({
  visitorId: z.string().uuid(),
  source: z.string().min(1).max(80),
  medium: z.string().min(1).max(80),
  campaign: z.string().min(1).max(120),
});
export type AttributionInput = z.infer<typeof AttributionSchema>;

// Signup normally includes ZIP. It may be deferred only when the request
// identifies the remote listing the new member is returning to propose on;
// the API performs the authoritative listing check. Phone remains an optional
// profile field and is never used as an auth factor.
export const SignupSchema = z
  .object({
    email: z.string().email().max(255),
    password: z.string().min(12).max(200),
    phone: z.union([E164, z.literal("")]).optional(),
    homeZip: UsZip.optional(),
    proposalListingId: z.string().uuid().optional(),
    displayName: z.string().min(2).max(60),
    tosVersion: z.string().min(1),
    tosAccepted: z.literal(true),
    turnstileToken: z.string().min(1),
    attribution: AttributionSchema.optional(),
  })
  .superRefine((input, ctx) => {
    if (!input.homeZip && !input.proposalListingId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["homeZip"],
        message: "Enter a 5-digit US ZIP code",
      });
    }
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

// Profile-level ZIP update.
export const UpdateZipSchema = z.object({
  homeZip: UsZip,
});
export type UpdateZipInput = z.infer<typeof UpdateZipSchema>;

// Change display name.
export const UpdateNameSchema = z.object({
  displayName: z.string().min(2).max(60),
});
export type UpdateNameInput = z.infer<typeof UpdateNameSchema>;

// Change email. Requires re-authentication with the current password so a
// stolen session cookie can't silently rebind the account to an attacker.
export const UpdateEmailSchema = z.object({
  email: z.string().email().max(255),
  currentPassword: z.string().min(1).max(200),
});
export type UpdateEmailInput = z.infer<typeof UpdateEmailSchema>;

// Change password. Verifies the current password AND invalidates every
// other active session (see users.sessions_invalidated_at).
export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(12).max(200),
});
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

// Delete-my-account. Confirms with current password.
export const DeleteAccountSchema = z.object({
  currentPassword: z.string().min(1).max(200),
});
export type DeleteAccountInput = z.infer<typeof DeleteAccountSchema>;

// Transactional activity only: new proposals and replies. This is deliberately
// separate from marketing consent; unscrewed does not use it for campaigns.
export const UpdateTradeEmailNotificationsSchema = z.object({
  enabled: z.boolean(),
});
export type UpdateTradeEmailNotificationsInput = z.infer<
  typeof UpdateTradeEmailNotificationsSchema
>;

// Explicitly requested local-supply alerts. Separate from transactional trade
// activity and off by default at the database layer.
export const UpdateLocalListingNotificationsSchema = z.object({
  enabled: z.boolean(),
});
export type UpdateLocalListingNotificationsInput = z.infer<
  typeof UpdateLocalListingNotificationsSchema
>;

// Signed email-preference links manage both categories independently. Keep the
// legacy `enabled` field so an older cached web bundle can still change only
// transactional alerts during a rolling deploy.
export const UpdateEmailPreferencesSchema = z
  .object({
    enabled: z.boolean().optional(),
    tradeEnabled: z.boolean().optional(),
    localEnabled: z.boolean().optional(),
  })
  .refine(
    (input) =>
      input.enabled !== undefined ||
      input.tradeEnabled !== undefined ||
      input.localEnabled !== undefined
  );
