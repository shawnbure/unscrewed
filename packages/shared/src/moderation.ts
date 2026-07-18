import { z } from "zod";

export const ReportReason = z.enum([
  "csam",
  "sexual",
  "violence",
  "harassment",
  "spam",
  "illegal",
  "ip_infringement",
  "other",
]);
export type ReportReason = z.infer<typeof ReportReason>;

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  csam: "Child sexual abuse material (CSAM)",
  sexual: "Sexual / adult content",
  violence: "Violence, gore, or self-harm",
  harassment: "Harassment or hate",
  spam: "Spam or scam",
  illegal: "Illegal goods or services",
  ip_infringement: "Copyright / trademark violation",
  other: "Other",
};

export const ReportTargetType = z.enum(["listing", "blog_post", "user"]);
export type ReportTargetType = z.infer<typeof ReportTargetType>;

export const ReportCreateSchema = z.object({
  targetType: ReportTargetType,
  targetId: z.string().min(1).max(64),
  reason: ReportReason,
  notes: z.string().max(1000).optional(),
});
export type ReportCreateInput = z.infer<typeof ReportCreateSchema>;

export const AdminReportResolveSchema = z.object({
  status: z.enum(["resolved_action", "resolved_no_action"]),
  action: z.enum(["hide", "delete", "approve"]).optional(),
  resolutionNote: z.string().max(1000).optional(),
});
export type AdminReportResolveInput = z.infer<typeof AdminReportResolveSchema>;

/** How many distinct reporters trigger auto-hide. Tune later. */
export const AUTO_HIDE_THRESHOLD = 3;
