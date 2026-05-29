import { Hono } from "hono";
import { eq } from "drizzle-orm";
import {
  SignupSchema,
  LoginSchema,
  TwoFactorVerifySchema,
  ResendCodeSchema,
  type SmsCodePurpose,
} from "@unscrewed/shared";
import { getDb, users, smsCodes, smsLog, tosAcceptances } from "@unscrewed/db";
import type { AppContext } from "../env.js";
import {
  hashPassword,
  verifyPassword,
  generateSmsCode,
  sha256Hex,
  uuidv4,
} from "../lib/crypto.js";
import { sendSms, build2faMessage } from "../lib/telnyx.js";
import { verifyTurnstile } from "../lib/turnstile.js";
import { rateLimit } from "../lib/rateLimit.js";
import { createSession, destroySession, readSession } from "../lib/session.js";

export const authRoutes = new Hono<AppContext>();

const CODE_TTL_MS = 5 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;

function normalizeEmail(e: string) {
  return e.trim().toLowerCase();
}

function clientIp(c: any): string | undefined {
  return (
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim()
  );
}

async function issueSmsCode(opts: {
  env: AppContext["Bindings"];
  userId: string;
  phone: string;
  purpose: SmsCodePurpose;
}): Promise<{ challengeId: string; sendOk: boolean; errorMessage?: string }> {
  const { env, userId, phone, purpose } = opts;
  const challengeId = uuidv4();
  const code = generateSmsCode();
  const codeHash = await sha256Hex(`${code}:${challengeId}`);
  const expiresAt = Date.now() + CODE_TTL_MS;

  const db = getDb(env.DB);
  await db.insert(smsCodes).values({
    id: challengeId,
    userId,
    purpose,
    codeHash,
    expiresAt,
    sentToPhoneE164: phone,
  });

  const sendResult = await sendSms(env, {
    to: phone,
    text: build2faMessage(code),
  });

  await db.insert(smsLog).values({
    id: uuidv4(),
    userId,
    direction: "outbound",
    toNumber: phone,
    fromNumber: env.TELNYX_FROM_NUMBER,
    telnyxMessageId: sendResult.messageId,
    status: sendResult.ok ? sendResult.status ?? "queued" : "send_failed",
    errorCode: sendResult.errorCode,
    errorMessage: sendResult.errorMessage,
    body: `[2FA code redacted] purpose=${purpose}`,
  });

  return {
    challengeId,
    sendOk: sendResult.ok,
    errorMessage: sendResult.errorMessage,
  };
}

// ---------------- signup ----------------
authRoutes.post("/signup", async (c) => {
  const ip = clientIp(c);
  const rl = await rateLimit(c.env, `signup:${ip ?? "unknown"}`, 10, 3600);
  if (!rl.allowed) return c.json({ error: "rate_limited" }, 429);

  const json = await c.req.json().catch(() => null);
  const parsed = SignupSchema.safeParse(json);
  if (!parsed.success)
    return c.json({ error: "invalid_input", issues: parsed.error.issues }, 400);
  const input = parsed.data;

  if (input.tosVersion !== c.env.TOS_VERSION)
    return c.json(
      { error: "stale_tos", currentVersion: c.env.TOS_VERSION },
      400
    );

  const ok = await verifyTurnstile(c.env, input.turnstileToken, ip);
  if (!ok) return c.json({ error: "turnstile_failed" }, 400);

  const db = getDb(c.env.DB);
  const emailNorm = normalizeEmail(input.email);
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.emailNormalized, emailNorm))
    .limit(1);
  if (existing.length > 0)
    return c.json({ error: "email_in_use" }, 409);

  const userId = uuidv4();
  const passwordHash = await hashPassword(input.password);
  const now = Date.now();
  await db.insert(users).values({
    id: userId,
    email: input.email.trim(),
    emailNormalized: emailNorm,
    passwordHash,
    phoneE164: input.phone,
    displayName: input.displayName.trim(),
    dateCreated: now,
    dateModified: now,
  });
  await db.insert(tosAcceptances).values({
    id: uuidv4(),
    userId,
    tosVersion: input.tosVersion,
    ipAddress: ip,
    userAgent: c.req.header("user-agent")?.slice(0, 500),
  });

  // Issue phone-verification SMS. Phone is NOT marked verified until /signup/verify succeeds.
  const issue = await issueSmsCode({
    env: c.env,
    userId,
    phone: input.phone,
    purpose: "signup_verify_phone",
  });
  if (!issue.sendOk) {
    return c.json(
      {
        error: "sms_send_failed",
        message: issue.errorMessage ?? "Failed to send verification SMS",
      },
      502
    );
  }
  return c.json({ ok: true, challengeId: issue.challengeId, step: "verify_phone" });
});

// ---------------- signup phone verification ----------------
authRoutes.post("/signup/verify", async (c) => {
  const json = await c.req.json().catch(() => null);
  const parsed = TwoFactorVerifySchema.safeParse(json);
  if (!parsed.success)
    return c.json({ error: "invalid_input", issues: parsed.error.issues }, 400);
  const { challengeId, code } = parsed.data;

  const db = getDb(c.env.DB);
  const row = await db
    .select()
    .from(smsCodes)
    .where(eq(smsCodes.id, challengeId))
    .limit(1);
  const challenge = row[0];
  if (!challenge) return c.json({ error: "invalid_challenge" }, 400);
  if (challenge.consumedAt) return c.json({ error: "already_used" }, 400);
  if (challenge.expiresAt < Date.now())
    return c.json({ error: "expired" }, 400);
  if (challenge.attempts >= MAX_VERIFY_ATTEMPTS)
    return c.json({ error: "too_many_attempts" }, 429);
  if (challenge.purpose !== "signup_verify_phone")
    return c.json({ error: "wrong_purpose" }, 400);

  const expectedHash = await sha256Hex(`${code}:${challengeId}`);
  if (expectedHash !== challenge.codeHash) {
    await db
      .update(smsCodes)
      .set({ attempts: challenge.attempts + 1 })
      .where(eq(smsCodes.id, challengeId));
    return c.json({ error: "wrong_code" }, 400);
  }

  const now = Date.now();
  await db
    .update(smsCodes)
    .set({ consumedAt: now })
    .where(eq(smsCodes.id, challengeId));
  await db
    .update(users)
    .set({ phoneVerifiedAt: now, dateModified: now })
    .where(eq(users.id, challenge.userId));

  // Auto-login after phone verify.
  const u = await db
    .select({ id: users.id, isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.id, challenge.userId))
    .limit(1);
  if (u[0]) await createSession(c, u[0].id, u[0].isAdmin === 1);

  return c.json({ ok: true });
});

// ---------------- login (password + Turnstile) ----------------
// Login does NOT require SMS 2FA. Turnstile + password is sufficient. SMS
// codes are reserved for proving phone ownership at signup, on phone-change,
// and any future high-trust action. (Background: every login burning a
// toll-free SMS is expensive and adds latency for a marginal security win
// when Turnstile is already blocking automated credential stuffing.)
authRoutes.post("/login", async (c) => {
  const ip = clientIp(c);
  const rl = await rateLimit(c.env, `login:${ip ?? "unknown"}`, 20, 600);
  if (!rl.allowed) return c.json({ error: "rate_limited" }, 429);

  const json = await c.req.json().catch(() => null);
  const parsed = LoginSchema.safeParse(json);
  if (!parsed.success) return c.json({ error: "invalid_input" }, 400);
  const input = parsed.data;

  const ok = await verifyTurnstile(c.env, input.turnstileToken, ip);
  if (!ok) return c.json({ error: "turnstile_failed" }, 400);

  const db = getDb(c.env.DB);
  const row = await db
    .select()
    .from(users)
    .where(eq(users.emailNormalized, normalizeEmail(input.email)))
    .limit(1);
  const u = row[0];
  // Don't leak the distinction between "wrong password" and "archived account"
  // to unauthenticated callers — return the same generic error.
  if (!u || u.isDeleted) return c.json({ error: "invalid_credentials" }, 401);
  if (u.isArchived) return c.json({ error: "account_suspended" }, 403);

  const pwOk = await verifyPassword(input.password, u.passwordHash);
  if (!pwOk) return c.json({ error: "invalid_credentials" }, 401);

  // Phone never verified during signup (likely abandoned). Send an SMS code
  // so the user can finish phone verification; they cannot log in until then.
  if (!u.phoneVerifiedAt) {
    const phoneRl = await rateLimit(c.env, `sms:${u.phoneE164}`, 5, 3600);
    if (!phoneRl.allowed) return c.json({ error: "sms_rate_limited" }, 429);
    const issue = await issueSmsCode({
      env: c.env,
      userId: u.id,
      phone: u.phoneE164,
      purpose: "signup_verify_phone",
    });
    if (!issue.sendOk)
      return c.json(
        { error: "sms_send_failed", message: issue.errorMessage },
        502
      );
    return c.json({
      ok: true,
      step: "verify_phone",
      challengeId: issue.challengeId,
    });
  }

  // Phone already verified — issue a session immediately.
  await createSession(c, u.id, u.isAdmin === 1);
  return c.json({ ok: true, step: "done" });
});

// ---------------- 2FA verify ----------------
authRoutes.post("/2fa/verify", async (c) => {
  const json = await c.req.json().catch(() => null);
  const parsed = TwoFactorVerifySchema.safeParse(json);
  if (!parsed.success)
    return c.json({ error: "invalid_input" }, 400);
  const { challengeId, code } = parsed.data;

  const db = getDb(c.env.DB);
  const row = await db
    .select()
    .from(smsCodes)
    .where(eq(smsCodes.id, challengeId))
    .limit(1);
  const ch = row[0];
  if (!ch || ch.consumedAt) return c.json({ error: "invalid_challenge" }, 400);
  if (ch.expiresAt < Date.now()) return c.json({ error: "expired" }, 400);
  if (ch.attempts >= MAX_VERIFY_ATTEMPTS)
    return c.json({ error: "too_many_attempts" }, 429);
  if (ch.purpose !== "login_2fa")
    return c.json({ error: "wrong_purpose" }, 400);

  const expected = await sha256Hex(`${code}:${challengeId}`);
  if (expected !== ch.codeHash) {
    await db
      .update(smsCodes)
      .set({ attempts: ch.attempts + 1 })
      .where(eq(smsCodes.id, challengeId));
    return c.json({ error: "wrong_code" }, 400);
  }

  await db
    .update(smsCodes)
    .set({ consumedAt: Date.now() })
    .where(eq(smsCodes.id, challengeId));

  const u = await db
    .select({ id: users.id, isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.id, ch.userId))
    .limit(1);
  if (!u[0]) return c.json({ error: "user_missing" }, 400);

  await createSession(c, u[0].id, u[0].isAdmin === 1);
  return c.json({ ok: true });
});

// ---------------- resend SMS ----------------
authRoutes.post("/2fa/resend", async (c) => {
  const json = await c.req.json().catch(() => null);
  const parsed = ResendCodeSchema.safeParse(json);
  if (!parsed.success) return c.json({ error: "invalid_input" }, 400);

  const db = getDb(c.env.DB);
  const row = await db
    .select()
    .from(smsCodes)
    .where(eq(smsCodes.id, parsed.data.challengeId))
    .limit(1);
  const ch = row[0];
  if (!ch) return c.json({ error: "invalid_challenge" }, 400);

  const phoneRl = await rateLimit(
    c.env,
    `sms:${ch.sentToPhoneE164}`,
    5,
    3600
  );
  if (!phoneRl.allowed)
    return c.json({ error: "sms_rate_limited" }, 429);

  // Mark the old one consumed and issue a fresh one with the same purpose.
  await db
    .update(smsCodes)
    .set({ consumedAt: Date.now() })
    .where(eq(smsCodes.id, ch.id));
  const issue = await issueSmsCode({
    env: c.env,
    userId: ch.userId,
    phone: ch.sentToPhoneE164,
    purpose: ch.purpose as SmsCodePurpose,
  });
  if (!issue.sendOk)
    return c.json(
      { error: "sms_send_failed", message: issue.errorMessage },
      502
    );
  return c.json({ ok: true, challengeId: issue.challengeId });
});

// ---------------- logout ----------------
authRoutes.post("/logout", async (c) => {
  await destroySession(c);
  return c.json({ ok: true });
});

// ---------------- session ----------------
authRoutes.get("/session", async (c) => {
  const s = await readSession(c);
  if (!s) return c.json({ authenticated: false });
  return c.json({ authenticated: true, userId: s.userId, isAdmin: s.isAdmin });
});
