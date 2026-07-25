-- A visitor may encounter the same campaign through more than one legitimate
-- channel. Preserve those landings separately so the eventual signup is
-- credited only to the exact source + medium + campaign captured at signup.
DROP INDEX IF EXISTS ux_growth_visits_visitor_campaign;

CREATE UNIQUE INDEX ux_growth_visits_visitor_channel_campaign
  ON growth_visits (visitor_id, source, medium, campaign);
