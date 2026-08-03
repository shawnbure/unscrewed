-- Measure the missing step between an attributed landing and account signup.
-- This stores only the anonymous campaign visitor UUID already in use, the
-- first active listing they tried to propose on, and the event timestamp.

ALTER TABLE growth_visits
  ADD COLUMN first_proposal_intent_at integer;

ALTER TABLE growth_visits
  ADD COLUMN first_proposal_listing_id text;

CREATE INDEX ix_growth_visits_proposal_intent
  ON growth_visits (
    source,
    medium,
    campaign,
    first_proposal_intent_at
  )
  WHERE first_proposal_intent_at IS NOT NULL;
