-- Wipe all demo:* seed data + anything that references it.
--
-- Order matters: delete children before parents so FKs never reference a
-- missing row (and so listings_fts stays in sync).
--
-- Preserves:
--   • Real users (id NOT LIKE 'demo:%')
--   • Their sms_log history
--   • Their tos_acceptances

-- 1. Messages inside any negotiation on a demo listing OR involving a demo user
DELETE FROM negotiation_messages
 WHERE negotiation_id IN (
   SELECT id FROM negotiations
    WHERE listing_id LIKE 'demo:%'
       OR lister_user_id LIKE 'demo:%'
       OR requester_user_id LIKE 'demo:%'
 );

-- 2. Contracts against demo listings/users
DELETE FROM contracts
 WHERE listing_id LIKE 'demo:%'
    OR party_a_user_id LIKE 'demo:%'
    OR party_b_user_id LIKE 'demo:%';

-- 3. Negotiations (now childless)
DELETE FROM negotiations
 WHERE listing_id LIKE 'demo:%'
    OR lister_user_id LIKE 'demo:%'
    OR requester_user_id LIKE 'demo:%';

-- 4. FTS index rows for demo listings (must precede the listings delete
--    because listings_fts.rowid mirrors listings.rowid).
DELETE FROM listings_fts
 WHERE rowid IN (SELECT rowid FROM listings WHERE id LIKE 'demo:%');

-- 5. Photos owned by demo listings (none seeded, but idempotent).
DELETE FROM listing_photos WHERE listing_id LIKE 'demo:%';

-- 6. Listings themselves
DELETE FROM listings WHERE id LIKE 'demo:%';

-- 7. Auth trail for demo users
DELETE FROM sms_codes       WHERE user_id LIKE 'demo:%';
DELETE FROM sms_log         WHERE user_id LIKE 'demo:%';
DELETE FROM tos_acceptances WHERE user_id LIKE 'demo:%';

-- 8. Finally, the demo users
DELETE FROM users WHERE id LIKE 'demo:%';
