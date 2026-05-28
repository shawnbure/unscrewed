// Session cookie + KV-backed session store.
// We sign the session id with HMAC-SHA256 using SESSION_SECRET so a stolen
// KV key alone can't forge a cookie, and we can detect tampering offline.

import type { Context } from "hono";
import { setCookie, getCookie, deleteCookie } from "hono/cookie";
import type { AppContext, Env } from "../env.js";
import { randomId } from "./crypto.js";

const COOKIE_NAME = "us_sess";
const COOKIE_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const SLIDING_REFRESH_AFTER_SECONDS = 60 * 60 * 24; // refresh once/day

export interface SessionData {
  userId: string;
  isAdmin: boolean;
  createdAt: number;
  lastSeenAt: number;
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data)
  );
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function signId(env: Env, id: string): Promise<string> {
  const tag = (await hmac(env.SESSION_SECRET, id)).slice(0, 32);
  return `${id}.${tag}`;
}

async function verifyId(env: Env, signed: string): Promise<string | null> {
  const dot = signed.lastIndexOf(".");
  if (dot < 0) return null;
  const id = signed.slice(0, dot);
  const tag = signed.slice(dot + 1);
  const expected = (await hmac(env.SESSION_SECRET, id)).slice(0, 32);
  if (tag.length !== expected.length) return null;
  // Constant-time-ish compare:
  let diff = 0;
  for (let i = 0; i < tag.length; i++)
    diff |= tag.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0 ? id : null;
}

export async function createSession(
  c: Context<AppContext>,
  userId: string,
  isAdmin: boolean
): Promise<void> {
  const id = randomId(24);
  const now = Date.now();
  const data: SessionData = {
    userId,
    isAdmin,
    createdAt: now,
    lastSeenAt: now,
  };
  await c.env.SESSIONS.put(`sess:${id}`, JSON.stringify(data), {
    expirationTtl: COOKIE_TTL_SECONDS,
  });
  const signed = await signId(c.env, id);
  setCookie(c, COOKIE_NAME, signed, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: COOKIE_TTL_SECONDS,
  });
}

export async function readSession(
  c: Context<AppContext>
): Promise<SessionData | null> {
  const cookie = getCookie(c, COOKIE_NAME);
  if (!cookie) return null;
  const id = await verifyId(c.env, cookie);
  if (!id) return null;
  const raw = await c.env.SESSIONS.get(`sess:${id}`);
  if (!raw) return null;
  const data = JSON.parse(raw) as SessionData;

  // Sliding refresh
  const now = Date.now();
  if (now - data.lastSeenAt > SLIDING_REFRESH_AFTER_SECONDS * 1000) {
    data.lastSeenAt = now;
    await c.env.SESSIONS.put(`sess:${id}`, JSON.stringify(data), {
      expirationTtl: COOKIE_TTL_SECONDS,
    });
  }
  return data;
}

export async function destroySession(c: Context<AppContext>): Promise<void> {
  const cookie = getCookie(c, COOKIE_NAME);
  if (cookie) {
    const id = await verifyId(c.env, cookie);
    if (id) await c.env.SESSIONS.delete(`sess:${id}`);
  }
  deleteCookie(c, COOKIE_NAME, { path: "/" });
}
