import { z } from "zod";

export const ListingKind = z.enum(["good", "service"]);
export type ListingKind = z.infer<typeof ListingKind>;

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
  title: z.string().min(4).max(120),
  description: z.string().min(10).max(5000),
  category: ListingCategory,
  condition: ListingCondition.optional(),
  // What the lister wants in trade. Freeform; AI matches later.
  wants: z.string().min(2).max(500),
  // Approximate location (zip + lat/lng). We never expose street address.
  postalCode: z.string().min(3).max(12),
  countryCode: z.string().length(2).default("US"),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  // Photos uploaded separately; client passes returned R2 keys here.
  photoKeys: z.array(z.string()).max(8).default([]),
});
export type ListingCreateInput = z.infer<typeof ListingCreateSchema>;

export const ListingSearchSchema = z.object({
  q: z.string().max(200).optional(),
  category: ListingCategory.optional(),
  kind: ListingKind.optional(),
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
