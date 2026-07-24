-- Per-party read cursors make negotiation replies durable and visible even
-- when the recipient was not connected to the realtime room.

ALTER TABLE negotiations ADD COLUMN lister_last_read_at integer;
ALTER TABLE negotiations ADD COLUMN requester_last_read_at integer;

CREATE INDEX ix_negotiation_messages_created
  ON negotiation_messages (negotiation_id, date_created);
