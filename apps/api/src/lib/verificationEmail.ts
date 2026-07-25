import type { Env } from "../env.js";
import { hmacSha256Hex } from "./crypto.js";

const FROM = "notifications@unscrewed.lol";
const VERIFY_PURPOSE = "verify-email:v1";

export async function emailVerificationToken(
  env: Env,
  userId: string,
  emailNormalized: string
): Promise<string> {
  return hmacSha256Hex(
    env.SESSION_SECRET,
    `${VERIFY_PURPOSE}:${userId}:${emailNormalized}`
  );
}

export async function sendVerificationEmail(
  env: Env,
  input: {
    userId: string;
    email: string;
    emailNormalized: string;
  }
): Promise<"sent" | "already_sent"> {
  const dedupeKey = `verify-email:${input.userId}:${input.emailNormalized}`;
  if (await env.RATE_LIMIT.get(dedupeKey)) return "already_sent";

  const token = await emailVerificationToken(
    env,
    input.userId,
    input.emailNormalized
  );
  const query = new URLSearchParams({ u: input.userId, t: token });
  const verifyUrl = `${env.PUBLIC_BASE_URL}/verify-email?${query}`;
  const escapedVerifyUrl = verifyUrl.replace(/&/g, "&amp;");

  await env.EMAIL.send({
    to: input.email,
    from: { email: FROM, name: "unscrewed" },
    subject: "Verify your email for unscrewed",
    text: `Verify this email address for your unscrewed account:

${verifyUrl}

After verification, unscrewed can alert you when a neighbor proposes, replies, or updates an agreement. These are transactional account alerts, not marketing.

If you did not create this account, you can ignore this email.`,
    html: `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f7f5ef;color:#25231f;font-family:Arial,sans-serif">
    <div style="max-width:560px;margin:0 auto;padding:32px 20px">
      <p style="font-size:13px;font-weight:700;letter-spacing:.08em;color:#5a6f3b">UNSCREWED</p>
      <h1 style="font-size:24px;line-height:1.25;margin:16px 0 8px">Verify your email</h1>
      <p style="font-size:16px;line-height:1.6">Confirm that this address belongs to your unscrewed account. Afterward, we can alert you when a neighbor proposes, replies, or updates an agreement.</p>
      <p style="margin:28px 0">
        <a href="${escapedVerifyUrl}" style="display:inline-block;background:#455d2a;color:#fff;text-decoration:none;border-radius:10px;padding:13px 18px;font-weight:700">Verify email address</a>
      </p>
      <p style="font-size:12px;line-height:1.5;color:#68645c">These are transactional account alerts, not marketing. If you did not create this account, you can ignore this email.</p>
    </div>
  </body>
</html>`,
  });

  await env.RATE_LIMIT.put(dedupeKey, "1", { expirationTtl: 300 });
  return "sent";
}
