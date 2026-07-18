import { z } from "zod";

// URL-safe slug: lowercase letters, digits, hyphens, no leading/trailing hyphen.
export const Slug = z
  .string()
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    "Slug must be lowercase letters, digits, and single hyphens between words"
  )
  .min(2)
  .max(120);

export const BlogPostCreateSchema = z.object({
  slug: Slug,
  title: z.string().min(2).max(200),
  excerpt: z.string().max(500).nullable().optional(),
  bodyMd: z.string().min(1).max(200_000),
  heroImageUrl: z.string().url().max(500).nullable().optional(),
  status: z.enum(["draft", "published"]).default("draft"),
});
export type BlogPostCreateInput = z.infer<typeof BlogPostCreateSchema>;

export const BlogPostUpdateSchema = z.object({
  slug: Slug.optional(),
  title: z.string().min(2).max(200).optional(),
  excerpt: z.string().max(500).nullable().optional(),
  bodyMd: z.string().min(1).max(200_000).optional(),
  heroImageUrl: z.string().url().max(500).nullable().optional(),
  status: z.enum(["draft", "published"]).optional(),
});
export type BlogPostUpdateInput = z.infer<typeof BlogPostUpdateSchema>;

/**
 * Derive a URL-safe slug from a title.
 * Client-side helper — server re-validates via Slug regex.
 */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}
