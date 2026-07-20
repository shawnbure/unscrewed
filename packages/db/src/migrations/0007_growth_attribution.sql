-- Privacy-conscious campaign attribution.
--
-- growth_visits stores one anonymous landing per random browser visitor and
-- campaign. It deliberately stores no IP address, user agent, or referrer.
-- If that visitor later creates an account, the campaign fields copied onto
-- users let the admin dashboard measure invite -> signup -> first listing.

ALTER TABLE users ADD COLUMN attribution_visitor_id text;
ALTER TABLE users ADD COLUMN attribution_source text;
ALTER TABLE users ADD COLUMN attribution_medium text;
ALTER TABLE users ADD COLUMN attribution_campaign text;

CREATE INDEX ix_users_attribution_campaign
  ON users (attribution_campaign, date_created)
  WHERE attribution_campaign IS NOT NULL;

CREATE TABLE growth_visits (
  id text PRIMARY KEY NOT NULL,
  visitor_id text NOT NULL,
  source text NOT NULL,
  medium text NOT NULL,
  campaign text NOT NULL,
  date_created integer NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE UNIQUE INDEX ux_growth_visits_visitor_campaign
  ON growth_visits (visitor_id, campaign);
CREATE INDEX ix_growth_visits_campaign_date
  ON growth_visits (campaign, date_created);
CREATE INDEX ix_growth_visits_date
  ON growth_visits (date_created);
