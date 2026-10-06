import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { AppContext } from "./env.js";
import { authRoutes } from "./routes/auth.js";
import { passkeysRoutes } from "./routes/passkeys.js";
import { moneyIdeasRoutes } from "./routes/moneyIdeas.js";
import { statsRoutes } from "./routes/stats.js";
import { blogRoutes } from "./routes/blog.js";
import { reportsRoutes } from "./routes/reports.js";
import { sitemapRoutes } from "./routes/sitemap.js";
import { listingsRoutes } from "./routes/listings.js";
import { negotiationRoutes } from "./routes/negotiation.js";
import { meRoutes } from "./routes/me.js";
import { adminRoutes } from "./routes/admin.js";
import { contractsRoutes } from "./routes/contracts.js";
import { geocodeRoutes } from "./routes/geocode.js";
import { growthRoutes } from "./routes/growth.js";
import { supportRoutes } from "./routes/support.js";
import { emailPreferencesRoutes } from "./routes/emailPreferences.js";
import { emailVerificationRoutes } from "./routes/emailVerification.js";

export { NegotiationRoom } from "./lib/negotiationRoom.js";

const app = new Hono<AppContext>();

app.use("*", logger());
app.use(
  "*",
  (c, next) => cors({
    origin: (origin) => {
      // Allow prod + localhost + Pages preview URLs.
      if (!origin) return origin;
      if (origin === c.env.PUBLIC_BASE_URL) return origin;
      if (origin.startsWith("http://localhost:")) return origin;

      return null;
    },
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })(c, next)
);

app.get("/", (c) => c.json({ ok: true, service: "unscrewed-api" }));
app.get("/health", (c) => c.json({ ok: true, ts: Date.now() }));

app.route("/auth", authRoutes);
app.route("/passkeys", passkeysRoutes);
app.route("/money-ideas", moneyIdeasRoutes);
app.route("/stats", statsRoutes);
// Exact public discovery routes such as /blog/feed.xml must precede the
// dynamic /blog/:slug route.
app.route("/", sitemapRoutes);
app.route("/blog", blogRoutes);
app.route("/reports", reportsRoutes);
app.route("/me", meRoutes);
app.route("/listings", listingsRoutes);
app.route("/negotiations", negotiationRoutes);
app.route("/contracts", contractsRoutes);
app.route("/geocode", geocodeRoutes);
app.route("/growth", growthRoutes);
app.route("/support", supportRoutes);
app.route("/email-preferences", emailPreferencesRoutes);
app.route("/email-verification", emailVerificationRoutes);
app.route("/admin", adminRoutes);

app.onError((err, c) => {
  console.error("[api error]", err);
  return c.json({ error: "internal_error", message: err.message }, 500);
});

export default app;
