-- Money ideas + community votes
--
-- "Thoughts on making money :)" — the shared workspace for how unscrewed
-- pays for itself without becoming the thing we're fighting.
--
-- Two kinds:
--   • kind='trust_stack'         — seed proposals (notary, escrow, etc.)
--   • kind='community_suggestion' — user-submitted ideas
--
-- Votes are +1 / -1 / 0 per user per idea. Totals are cached on the
-- idea row for cheap listing; a background reconcile can rebuild them
-- from money_idea_votes if they ever drift.

CREATE TABLE `money_ideas` (
  `id` text PRIMARY KEY NOT NULL,
  `kind` text NOT NULL,                       -- 'trust_stack' | 'community_suggestion'
  `title` text NOT NULL,
  `description` text NOT NULL,
  `price_hint` text,                          -- e.g. "$5–10 flat", "3–5%"
  `status` text NOT NULL DEFAULT 'proposed',  -- proposed | accepted | shipped | rejected
  `submitted_by` text REFERENCES `users`(`id`),  -- null for seed items
  `votes_up` integer NOT NULL DEFAULT 0,
  `votes_down` integer NOT NULL DEFAULT 0,
  `is_deleted` integer NOT NULL DEFAULT 0,
  `date_created` integer NOT NULL DEFAULT (unixepoch() * 1000),
  `date_modified` integer NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX `ix_money_ideas_kind`   ON `money_ideas` (`kind`);
CREATE INDEX `ix_money_ideas_status` ON `money_ideas` (`status`);

CREATE TABLE `money_idea_votes` (
  `id` text PRIMARY KEY NOT NULL,
  `idea_id` text NOT NULL REFERENCES `money_ideas`(`id`),
  `user_id` text NOT NULL REFERENCES `users`(`id`),
  `vote` integer NOT NULL,                    -- -1 | 1  (0 == row deleted)
  `date_created` integer NOT NULL DEFAULT (unixepoch() * 1000),
  `date_modified` integer NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE UNIQUE INDEX `ux_money_idea_votes_user_idea` ON `money_idea_votes` (`user_id`, `idea_id`);
CREATE INDEX `ix_money_idea_votes_idea` ON `money_idea_votes` (`idea_id`);

-- Seed the trust-stack proposals so the community has something to react to.
INSERT INTO `money_ideas` (`id`, `kind`, `title`, `description`, `price_hint`, `status`, `submitted_by`)
VALUES
  ('seed:notary',
   'trust_stack',
   'Notarized contracts',
   'Optional add-on when signing a social contract: we cryptographically sign and timestamp it, and the record is admissible in small-claims court. Real weight when the stakes are real.',
   '$5–10 flat',
   'proposed',
   NULL),
  ('seed:verified-badge',
   'trust_stack',
   'Verified trader badge',
   'Voluntary identity verification (Persona / Stripe Identity). You wear the badge if you want to, other traders see it. Never required. A trust signal, not a gate.',
   'Free or $20 one-time',
   'proposed',
   NULL),
  ('seed:escrow',
   'trust_stack',
   'Escrow of value',
   'For higher-value trades: unscrewed holds cash or the item until both parties confirm receipt. Same idea as Upwork or eBay Guaranteed Payment. Optional, never mandatory.',
   '3–5% of trade value, min $10',
   'proposed',
   NULL),
  ('seed:mediation',
   'trust_stack',
   'Dispute mediation',
   'If a trade goes sideways, either party can pay a flat fee to have a real human arbitrator (via partner service) read the contract, the evidence, and rule. Binding by ToS.',
   '$25–50 per case',
   'proposed',
   NULL),
  ('seed:insurance',
   'trust_stack',
   'Trade insurance',
   'Insurance partner covers the difference if a trade completes with clear evidence of loss or damage. We take a small cut of the premium; the partner handles the rest.',
   'Cut of premium',
   'proposed',
   NULL),
  ('seed:donations',
   'trust_stack',
   'Community donations',
   'A quiet, permanent "chip in" button in the footer. Not aggressive, no guilt-tripping, no drive campaigns. Wikipedia-lite. Enough to keep the lights on in the early years.',
   'Voluntary',
   'proposed',
   NULL);
