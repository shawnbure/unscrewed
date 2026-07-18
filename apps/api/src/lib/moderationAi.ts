// Content moderation via Cloudflare Workers AI.
//
// - Text: @cf/meta/llama-guard-3-8b is purpose-built. It scores 14 hazard
//   categories and returns "safe" or "unsafe" with a category list.
// - Images: @cf/meta/llama-3.2-11b-vision-instruct is a multimodal LLM we
//   prompt with a strict safety rubric and parse a small JSON response.
//
// Both are best-effort. Failures fail OPEN by default (the write proceeds
// with `unreviewed` status) so a Workers AI outage doesn't take down
// posting entirely. Real deterministic blocks (CSAM) belong on Cloudflare's
// CSAM Scanning Tool at the edge, not this layer.

import type { Env } from "../env.js";

export type ModerationVerdict = "allow" | "block" | "flag" | "unreviewed";

export interface ModerationResult {
  verdict: ModerationVerdict;
  categories: string[];
  score?: number;
  raw?: unknown;
}

// ===================== TEXT =====================

const TEXT_MODEL = "@cf/meta/llama-guard-3-8b";

/**
 * Classify one or more text blobs (concatenated) via LlamaGuard.
 * Returns `allow` (safe) or `block` (unsafe with S1-S14 categories) — no
 * middle "flag" tier for text; LlamaGuard is binary.
 */
export async function classifyText(
  env: Env,
  parts: string[]
): Promise<ModerationResult> {
  const joined = parts.filter(Boolean).join("\n\n").slice(0, 8000);
  if (!joined.trim()) return { verdict: "allow", categories: [] };
  try {
    const out: any = await env.AI.run(TEXT_MODEL as any, {
      messages: [{ role: "user", content: joined }],
    });
    const raw = typeof out === "string" ? out : (out?.response ?? "");
    const text = String(raw ?? "").trim();
    // LlamaGuard responds with "safe" or "unsafe\nS1,S3" style.
    if (/^safe/i.test(text)) return { verdict: "allow", categories: [], raw };
    const cats = (text.match(/S\d+/g) ?? []) as string[];
    return { verdict: "block", categories: cats, raw };
  } catch (e) {
    console.warn("[mod-text] failed", e);
    return { verdict: "unreviewed", categories: [] };
  }
}

// ===================== IMAGE =====================

const IMAGE_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";

const IMAGE_RUBRIC = `You are an image safety classifier.
Rate the image on these axes 0-10 (10 = maximum severity):
- sexual_adult: sexual, nude, or pornographic content involving anyone
- sexual_minors: any hint the depicted person could be a minor in a sexual context — err strict
- violence_gore: graphic violence, injury, blood, weapons pointed at people
- self_harm: self-injury, suicide themes
- illegal_goods: drugs, drug paraphernalia, weapons for illegal sale
- hate_symbols: hate speech symbols, extremist iconography

Reply ONLY with a JSON object of the six axes to integer scores.
No prose, no markdown, no code fences.`;

const ALLOW_MAX = 2; // 0..2 → allow
const FLAG_MAX = 5; // 3..5 → flag for review

export async function classifyImage(
  env: Env,
  imageBytes: Uint8Array
): Promise<ModerationResult> {
  try {
    const image = Array.from(imageBytes);
    const out: any = await env.AI.run(IMAGE_MODEL as any, {
      prompt: IMAGE_RUBRIC,
      image,
      max_tokens: 200,
      temperature: 0,
    });
    const raw = typeof out === "string" ? out : (out?.response ?? "");
    const scores = parseScores(String(raw ?? ""));
    if (!scores) return { verdict: "unreviewed", categories: [], raw };

    // Any minor-sexual signal at all → block outright.
    if ((scores.sexual_minors ?? 0) >= 1)
      return {
        verdict: "block",
        categories: ["sexual_minors"],
        score: scores.sexual_minors,
        raw,
      };

    const max = Math.max(
      scores.sexual_adult ?? 0,
      scores.violence_gore ?? 0,
      scores.self_harm ?? 0,
      scores.illegal_goods ?? 0,
      scores.hate_symbols ?? 0
    );
    const topCat =
      Object.entries(scores).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0]?.[0] ??
      "unknown";
    if (max <= ALLOW_MAX) return { verdict: "allow", categories: [], score: max, raw };
    if (max <= FLAG_MAX)
      return { verdict: "flag", categories: [topCat], score: max, raw };
    return { verdict: "block", categories: [topCat], score: max, raw };
  } catch (e) {
    console.warn("[mod-image] failed", e);
    return { verdict: "unreviewed", categories: [] };
  }
}

function parseScores(raw: string): Record<string, number> | null {
  if (!raw) return null;
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first < 0 || last <= first) return null;
  try {
    const obj = JSON.parse(raw.slice(first, last + 1));
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(obj)) {
      const n = typeof v === "number" ? v : parseInt(String(v), 10);
      if (!Number.isNaN(n)) out[k] = n;
    }
    return out;
  } catch {
    return null;
  }
}
