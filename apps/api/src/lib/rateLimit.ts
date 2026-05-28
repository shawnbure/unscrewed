import type { Env } from "../env.js";

/**
 * Simple fixed-window rate limit backed by KV.
 * Returns true if the call is allowed; false if over limit.
 */
export async function rateLimit(
  env: Env,
  key: string,
  max: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
  const k = `rl:${key}`;
  const raw = await env.RATE_LIMIT.get(k);
  const count = raw ? parseInt(raw, 10) : 0;
  if (count >= max) return { allowed: false, remaining: 0 };
  await env.RATE_LIMIT.put(k, String(count + 1), {
    expirationTtl: windowSeconds,
  });
  return { allowed: true, remaining: max - count - 1 };
}
