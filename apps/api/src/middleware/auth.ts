import type { MiddlewareHandler } from "hono";
import type { AppContext } from "../env.js";
import { readSession } from "../lib/session.js";

export const requireAuth: MiddlewareHandler<AppContext> = async (c, next) => {
  const s = await readSession(c);
  if (!s) return c.json({ error: "unauthorized" }, 401);
  c.set("userId", s.userId);
  c.set("isAdmin", s.isAdmin);
  await next();
};

export const optionalAuth: MiddlewareHandler<AppContext> = async (c, next) => {
  const s = await readSession(c);
  if (s) {
    c.set("userId", s.userId);
    c.set("isAdmin", s.isAdmin);
  }
  await next();
};
