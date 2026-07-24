import { z } from "zod";

export const SupportTopic = z.enum([
  "question",
  "account",
  "safety",
  "partnership",
  "feedback",
  "other",
]);
export type SupportTopic = z.infer<typeof SupportTopic>;

export const SUPPORT_TOPIC_LABELS: Record<SupportTopic, string> = {
  question: "How the site works",
  account: "Account help",
  safety: "Safety concern",
  partnership: "Community partnership",
  feedback: "Product feedback",
  other: "Something else",
};

export const SupportRequestCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  topic: SupportTopic,
  message: z.string().trim().min(10).max(5000),
  turnstileToken: z.string().min(1),
  // Hidden honeypot. A real visitor never sees or fills this.
  website: z.string().max(200).optional(),
});
export type SupportRequestCreateInput = z.infer<
  typeof SupportRequestCreateSchema
>;

export const AdminSupportRequestUpdateSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved", "spam"]),
  adminNote: z.string().trim().max(2000).optional(),
});
export type AdminSupportRequestUpdateInput = z.infer<
  typeof AdminSupportRequestUpdateSchema
>;
