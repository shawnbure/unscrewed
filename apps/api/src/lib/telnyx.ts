// Telnyx Messaging API client.
// Docs: https://developers.telnyx.com/api/messaging/send-message
//
// We use the Messaging Profile ID approach so Telnyx picks the best
// number from the pool attached to the profile. Falls back to the
// configured FROM number if profile_id sends fail.

import type { Env } from "../env.js";

export interface SendSmsArgs {
  to: string; // E.164
  text: string;
}

export interface TelnyxSendResult {
  ok: boolean;
  messageId?: string;
  status?: string;
  errorCode?: string;
  errorMessage?: string;
  raw?: unknown;
}

const TELNYX_URL = "https://api.telnyx.com/v2/messages";

export async function sendSms(
  env: Env,
  { to, text }: SendSmsArgs
): Promise<TelnyxSendResult> {
  const body: Record<string, unknown> = {
    to,
    text,
    messaging_profile_id: env.TELNYX_MESSAGING_PROFILE_ID,
  };
  // Telnyx will choose from the profile pool when `from` is omitted, but
  // including it pins the sender when you have a single dedicated number.
  if (env.TELNYX_FROM_NUMBER) body.from = env.TELNYX_FROM_NUMBER;

  let resp: Response;
  try {
    resp = await fetch(TELNYX_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.TELNYX_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return {
      ok: false,
      errorCode: "fetch_failed",
      errorMessage: e instanceof Error ? e.message : String(e),
    };
  }

  let json: any = null;
  try {
    json = await resp.json();
  } catch {
    /* non-JSON response */
  }

  if (!resp.ok) {
    const firstErr = json?.errors?.[0];
    return {
      ok: false,
      status: String(resp.status),
      errorCode: firstErr?.code ? String(firstErr.code) : String(resp.status),
      errorMessage:
        firstErr?.detail ||
        firstErr?.title ||
        `Telnyx ${resp.status} ${resp.statusText}`,
      raw: json,
    };
  }

  return {
    ok: true,
    messageId: json?.data?.id,
    status: json?.data?.to?.[0]?.status ?? "queued",
    raw: json,
  };
}

export function build2faMessage(code: string): string {
  return `unscrewed.lol verification code: ${code}\nExpires in 5 min. Don't share this code.`;
}
