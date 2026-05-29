import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { AppContext } from "./env.js";
import { authRoutes } from "./routes/auth.js";
import { listingsRoutes } from "./routes/listings.js";
import { negotiationRoutes } from "./routes/negotiation.js";
import { webhookRoutes } from "./routes/webhooks.js";
import { meRoutes } from "./routes/me.js";
import { adminRoutes } from "./routes/admin.js";

export { NegotiationRoom } from "./lib/negotiationRoom.js";

const app = new Hono<AppContext>();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: (origin) => {
      // Allow the prod web origin + localhost dev.
      if (!origin) return origin;
      if (origin === "https://unscrewed.lol") return origin;
      if (origin === "https://www.unscrewed.lol") return origin;
      if (origin.startsWith("http://localhost:")) return origin;
      if (origin.endsWith(".unscrewed-web.pages.dev")) return origin;
      return null;
    },
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  })
);

app.get("/", (c) => c.json({ ok: true, service: "unscrewed-api" }));
app.get("/health", (c) => c.json({ ok: true, ts: Date.now() }));

app.route("/auth", authRoutes);
app.route("/me", meRoutes);
app.route("/listings", listingsRoutes);
app.route("/negotiations", negotiationRoutes);
app.route("/webhooks", webhookRoutes);
app.route("/admin", adminRoutes);

app.onError((err, c) => {
  console.error("[api error]", err);
  return c.json({ error: "internal_error", message: err.message }, 500);
});

export default app;
