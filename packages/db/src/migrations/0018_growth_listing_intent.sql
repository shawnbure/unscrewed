-- Measure the missing step between a campaign or onsite Community visit and
-- beginning a real listing. This stores only the existing anonymous visitor
-- UUID, the first approved onsite context/starter, and the event timestamp.

ALTER TABLE growth_visits
  ADD COLUMN first_listing_intent_at integer;

ALTER TABLE growth_visits
  ADD COLUMN first_listing_intent_context text;

ALTER TABLE growth_visits
  ADD COLUMN first_listing_starter text;

CREATE INDEX ix_growth_visits_listing_intent
  ON growth_visits (
    source,
    medium,
    campaign,
    first_listing_intent_at
  )
  WHERE first_listing_intent_at IS NOT NULL;
