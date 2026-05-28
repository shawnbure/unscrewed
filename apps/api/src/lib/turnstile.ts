import type { Env } from "../env.js";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstile(
  env: Env,
  token: string,
  ip?: string
): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) {
    // Allow bypass in dev when not configured. Production must set the secret.
    console.warn("[turnstile] no secret configured, allowing");
    return true;
  }
  const body = new FormData();
  body.append("secret", env.TURNSTILE_SECRET_KEY);
  body.append("response", token);
  if (ip) body.append("remoteip", ip);
  try {
    const resp = await fetch(VERIFY_URL, { method: "POST", body });
    const j = (await resp.json()) as { success?: boolean };
    return j.success === true;
  } catch {
    return false;
  }
}
