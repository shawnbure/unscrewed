import { z } from "zod";

export const ContractStatus = z.enum([
  "draft",
  "awaiting_signatures",
  "signed",
  "cancelled",
]);
export type ContractStatus = z.infer<typeof ContractStatus>;

// The agreed barter contract between two parties.
// The platform is NOT a party; see ToS for indemnification.
export const ContractTerms = z.object({
  whatPartyAGives: z.string().min(2).max(2000),
  whatPartyBGives: z.string().min(2).max(2000),
  meetupLocation: z.string().max(500).optional(),
  meetupAt: z.string().datetime().optional(),
  conditions: z.string().max(4000).optional(),
});
export type ContractTerms = z.infer<typeof ContractTerms>;
