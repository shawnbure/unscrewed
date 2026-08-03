import { z } from "zod";

/**
 * Removes a redundant, user-authored label when the surrounding UI already
 * introduces the requested return. Stored listing text remains unchanged.
 */
export function withoutRequestedReturnLeadIn(value: string): string {
  const compact = value.replace(/\s+/g, " ").trim();
  const withoutLeadIn = compact
    .replace(
      /^(?:(?:i(?:['’]m| am)\s+)?looking\s+for|in\s+(?:trade|exchange))\s*:\s*/i,
      ""
    )
    .trim();
  return withoutLeadIn || compact;
}

export const ListingKind = z.enum(["good", "service"]);
export type ListingKind = z.infer<typeof ListingKind>;

export const ListingExchangeMode = z.enum(["local", "remote", "either"]);
export type ListingExchangeMode = z.infer<typeof ListingExchangeMode>;

export const ListingCondition = z.enum([
  "new",
  "like_new",
  "good",
  "fair",
  "poor",
  "na",
]);

// Coarse top-level taxonomy. Subcategories live as freeform tags for now;
// AI will help cluster these later.
export const ListingCategory = z.enum([
  "electronics",
  "tools",
  "vehicles",
  "home_garden",
  "clothing",
  "kids_baby",
  "sports_outdoors",
  "music_instruments",
  "books_media",
  "labor",
  "professional_services",
  "skilled_trades",
  "tutoring",
  "creative",
  "other",
]);

export const ListingCreateSchema = z.object({
  kind: ListingKind,
  exchangeMode: ListingExchangeMode.default("local"),
  title: z.string().min(4).max(120),
  description: z.string().min(10).max(5000),
  category: ListingCategory,
  condition: ListingCondition.optional(),
  // What the lister wants in trade. Freeform; AI matches later.
  wants: z.string().min(2).max(500),
  // Local/either offers need an approximate location. Remote-only offers are
  // stored against a neutral nationwide marker and must not require or expose
  // a member's home area.
  postalCode: z.string().min(3).max(12).optional(),
  countryCode: z.string().length(2).default("US"),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  // Photos uploaded separately; client passes returned R2 keys here.
  photoKeys: z.array(z.string()).max(8).default([]),
}).superRefine((input, context) => {
  if (input.exchangeMode === "remote") return;
  if (!input.postalCode) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["postalCode"],
      message: "Choose an approximate location for a local exchange.",
    });
  }
  if (input.lat === undefined) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["lat"],
      message: "Choose an approximate location for a local exchange.",
    });
  }
  if (input.lng === undefined) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["lng"],
      message: "Choose an approximate location for a local exchange.",
    });
  }
});
export type ListingCreateInput = z.infer<typeof ListingCreateSchema>;

// Owner-facing partial update. Kind + createdAt are immutable — changing
// the type of a listing after negotiations have started would be dishonest;
// people can withdraw and post again if they need that.
export const ListingUpdateSchema = z.object({
  exchangeMode: ListingExchangeMode.optional(),
  title: z.string().min(4).max(120).optional(),
  description: z.string().min(10).max(5000).optional(),
  category: ListingCategory.optional(),
  condition: ListingCondition.optional(),
  wants: z.string().min(2).max(500).optional(),
  postalCode: z.string().min(3).max(12).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  photoKeys: z.array(z.string()).max(8).optional(),
  // Owner can withdraw or reactivate their own listing.
  status: z.enum(["active", "withdrawn"]).optional(),
});
export type ListingUpdateInput = z.infer<typeof ListingUpdateSchema>;

export const ListingSearchSchema = z.object({
  q: z.string().max(200).optional(),
  category: ListingCategory.optional(),
  kind: ListingKind.optional(),
  exchangeMode: ListingExchangeMode.optional(),
  // Exact U.S. ZIP filtering powers truthful local-circle inventory. The API
  // additionally excludes remote-only offers when this filter is present.
  postalCode: z.string().regex(/^\d{5}$/).optional(),
  // Bounding box for map viewport queries
  north: z.number().optional(),
  south: z.number().optional(),
  east: z.number().optional(),
  west: z.number().optional(),
  // Or radius-from-point fallback
  lat: z.number().optional(),
  lng: z.number().optional(),
  radiusKm: z.number().min(1).max(500).optional(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20),
});
export type ListingSearchInput = z.infer<typeof ListingSearchSchema>;
