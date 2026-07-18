// WebAuthn (passkey) auth routes.
//
// Two independent flows:
//   • REGISTER — an already-signed-in user pairs a new authenticator.
//   • AUTHENTICATE — a signed-out user proves possession of a previously
//     paired authenticator; on success we mint a session cookie.
//
// Challenge state is held in KV under short-lived keys — we never trust
// the client to bring back the challenge value itself; only the KV
// lookup key travels over the wire.
//
// See ADR: passkeys as a first-class alternative to email+password.
// Phone / SMS is NEVER on the passkey path.

import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { getDb, users, passkeys } from "@unscrewed/db";
import type { AppContext } from "../env.js";
import { requireAuth } from "../middleware/auth.js";
import { createSession } from "../lib/session.js";
import { uuidv4 } from "../lib/crypto.js";

export const passkeysRoutes = new Hono<AppContext>();

// ---------- Relying-Party identity ----------
// rpID must be the *bare* domain (no scheme, no path). Browsers scope
// credentials by this value, so keep it stable across environments.
// The Relying-Party ID must be the effective site domain (e.g.
// "unscrewed.lol"). Browsers scope passkeys by rpID and by origin.
// Because the site is reachable from both apex and www, we accept
// EITHER origin at verify time while keeping rpID pinned to the apex —
// per WebAuthn spec, an origin's registrable-domain suffix (unscrewed.lol)
// may still match the rpID even when the user is on www.unscrewed.lol.
function rpInfo(env: { PUBLIC_BASE_URL: string }) {
  const url = new URL(env.PUBLIC_BASE_URL);
  const apex = url.hostname === "localhost" ? "localhost" : url.hostname;
  const acceptedOrigins =
    apex === "localhost"
      ? [url.origin]
      : [`https://${apex}`, `https://www.${apex}`];
  return {
    rpID: apex,
    rpName: "unscrewed.lol",
    origin: url.origin, // used only for logging / display
    acceptedOrigins,
  };
}

const CHALLENGE_TTL = 300; // 5 minutes
const REG_KEY = (id: string) => `pk:reg:${id}`;
const AUTH_KEY = (id: string) => `pk:auth:${id}`;

// Serialize / deserialize passkey rows to what simplewebauthn expects.
function rowToAuthenticator(row: {
  credentialId: string;
  publicKey: string;
  counter: number;
  transports: string | null;
}) {
  // Uint8Array on Workers reports its buffer as ArrayBufferLike; force the
  // parameterization simplewebauthn's WebAuthnCredential type wants.
  const pk = base64UrlToBuffer(row.publicKey);
  return {
    id: row.credentialId,
    publicKey: pk as Uint8Array<ArrayBuffer>,
    counter: row.counter,
    transports: (row.transports?.split(",").filter(Boolean) ?? []) as any[],
  };
}
function base64UrlToBuffer(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    s.length + ((4 - (s.length % 4)) % 4),
    "="
  );
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bufferToBase64Url(buf: Uint8Array): string {
  let s = "";
  for (const b of buf) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// ============================================================
// REGISTRATION — auth required
// ============================================================
passkeysRoutes.post("/register/begin", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const { rpID, rpName } = rpInfo(c.env);
  const db = getDb(c.env.DB);

  const [me] = await db
    .select({ email: users.email, displayName: users.displayName })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!me) return c.json({ error: "user_missing" }, 400);

  const existing = await db
    .select({ credentialId: passkeys.credentialId, transports: passkeys.transports })
    .from(passkeys)
    .where(and(eq(passkeys.userId, userId), eq(passkeys.isDeleted, 0)));

  const options = await generateRegistrationOptions({
    rpID,
    rpName,
    userID: new TextEncoder().encode(userId),
    userName: me.email,
    userDisplayName: me.displayName,
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
    excludeCredentials: existing.map((e) => ({
      id: e.credentialId,
      transports: (e.transports?.split(",").filter(Boolean) ?? []) as any[],
    })),
  });

  const challengeId = uuidv4();
  await c.env.SESSIONS.put(
    REG_KEY(challengeId),
    JSON.stringify({ userId, challenge: options.challenge }),
    { expirationTtl: CHALLENGE_TTL }
  );
  return c.json({ challengeId, options });
});

passkeysRoutes.post("/register/finish", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const body = (await c.req.json().catch(() => null)) as {
    challengeId?: string;
    response?: any;
    deviceLabel?: string;
  } | null;
  if (!body?.challengeId || !body?.response)
    return c.json({ error: "invalid_input" }, 400);

  const stored = await c.env.SESSIONS.get(REG_KEY(body.challengeId));
  if (!stored) return c.json({ error: "challenge_expired" }, 400);
  const { userId: challUserId, challenge } = JSON.parse(stored) as {
    userId: string;
    challenge: string;
  };
  if (challUserId !== userId) return c.json({ error: "wrong_user" }, 403);
  await c.env.SESSIONS.delete(REG_KEY(body.challengeId));

  const { rpID, acceptedOrigins } = rpInfo(c.env);
  const verification = await verifyRegistrationResponse({
    response: body.response,
    expectedChallenge: challenge,
    expectedOrigin: acceptedOrigins,
    expectedRPID: rpID,
    requireUserVerification: false,
  });
  if (!verification.verified || !verification.registrationInfo)
    return c.json({ error: "registration_failed" }, 400);

  const info = verification.registrationInfo;
  const db = getDb(c.env.DB);
  await db.insert(passkeys).values({
    id: uuidv4(),
    userId,
    credentialId: info.credential.id,
    publicKey: bufferToBase64Url(info.credential.publicKey),
    counter: info.credential.counter,
    transports: info.credential.transports?.join(",") ?? null,
    deviceLabel:
      body.deviceLabel?.slice(0, 60) ??
      guessDeviceLabel(c.req.header("user-agent")),
  });
  return c.json({ ok: true });
});

function guessDeviceLabel(ua: string | undefined): string {
  if (!ua) return "Passkey";
  if (/iPhone|iPad/.test(ua)) return "iPhone / iPad";
  if (/Macintosh/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows PC";
  if (/Android/.test(ua)) return "Android";
  if (/Linux/.test(ua)) return "Linux";
  return "Passkey";
}

// ============================================================
// AUTHENTICATION — public, mints a session on success
// ============================================================
passkeysRoutes.post("/authenticate/begin", async (c) => {
  const { rpID } = rpInfo(c.env);
  // usernameless: allowCredentials empty → the browser picks any registered
  // passkey for the site (best UX + best privacy — no username enumeration).
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "preferred",
    allowCredentials: [],
  });
  const challengeId = uuidv4();
  await c.env.SESSIONS.put(
    AUTH_KEY(challengeId),
    JSON.stringify({ challenge: options.challenge }),
    { expirationTtl: CHALLENGE_TTL }
  );
  return c.json({ challengeId, options });
});

passkeysRoutes.post("/authenticate/finish", async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    challengeId?: string;
    response?: any;
  } | null;
  if (!body?.challengeId || !body?.response)
    return c.json({ error: "invalid_input" }, 400);

  const stored = await c.env.SESSIONS.get(AUTH_KEY(body.challengeId));
  if (!stored) return c.json({ error: "challenge_expired" }, 400);
  const { challenge } = JSON.parse(stored) as { challenge: string };
  await c.env.SESSIONS.delete(AUTH_KEY(body.challengeId));

  const credId: string | undefined = body.response?.id;
  if (!credId) return c.json({ error: "no_credential" }, 400);

  const db = getDb(c.env.DB);
  const [row] = await db
    .select()
    .from(passkeys)
    .where(and(eq(passkeys.credentialId, credId), eq(passkeys.isDeleted, 0)))
    .limit(1);
  if (!row) return c.json({ error: "unknown_credential" }, 401);

  const [u] = await db
    .select({
      id: users.id,
      isAdmin: users.isAdmin,
      isArchived: users.isArchived,
      isDeleted: users.isDeleted,
    })
    .from(users)
    .where(eq(users.id, row.userId))
    .limit(1);
  if (!u || u.isDeleted) return c.json({ error: "invalid_credentials" }, 401);
  if (u.isArchived) return c.json({ error: "account_suspended" }, 403);

  const { rpID, acceptedOrigins } = rpInfo(c.env);
  const verification = await verifyAuthenticationResponse({
    response: body.response,
    expectedChallenge: challenge,
    expectedOrigin: acceptedOrigins,
    expectedRPID: rpID,
    credential: rowToAuthenticator(row),
    requireUserVerification: false,
  });
  if (!verification.verified)
    return c.json({ error: "invalid_credentials" }, 401);

  await db
    .update(passkeys)
    .set({
      counter: verification.authenticationInfo.newCounter,
      dateLastUsed: Date.now(),
    })
    .where(eq(passkeys.id, row.id));

  await createSession(c, u.id, u.isAdmin === 1);
  return c.json({ ok: true });
});

// ============================================================
// MANAGEMENT — list / revoke — auth required
// ============================================================
passkeysRoutes.get("/", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const db = getDb(c.env.DB);
  const rows = await db
    .select({
      id: passkeys.id,
      deviceLabel: passkeys.deviceLabel,
      transports: passkeys.transports,
      dateCreated: passkeys.dateCreated,
      dateLastUsed: passkeys.dateLastUsed,
    })
    .from(passkeys)
    .where(and(eq(passkeys.userId, userId), eq(passkeys.isDeleted, 0)));
  return c.json({ items: rows });
});

passkeysRoutes.delete("/:id", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const id = c.req.param("id");
  const db = getDb(c.env.DB);
  const [row] = await db
    .select({ userId: passkeys.userId })
    .from(passkeys)
    .where(eq(passkeys.id, id))
    .limit(1);
  if (!row) return c.json({ error: "not_found" }, 404);
  if (row.userId !== userId) return c.json({ error: "forbidden" }, 403);
  await db
    .update(passkeys)
    .set({ isDeleted: 1 })
    .where(eq(passkeys.id, id));
  return c.json({ ok: true });
});
