-- Add a per-user "kill switch" timestamp for stale sessions.
--
-- Sessions carry their createdAt in KV. On every authenticated request the
-- middleware compares users.sessions_invalidated_at against the session's
-- createdAt — any session older than the timestamp is treated as gone.
--
-- This lets password / email changes and admin actions invalidate every
-- other session for a user without maintaining a KV reverse-index.

ALTER TABLE users ADD COLUMN sessions_invalidated_at INTEGER;
