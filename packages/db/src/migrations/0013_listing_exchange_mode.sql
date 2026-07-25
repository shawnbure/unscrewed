-- A national marketplace needs to distinguish offers that require proximity
-- from skills that can be exchanged anywhere. Existing listings remain local
-- unless their stored copy explicitly describes a remote exchange.
ALTER TABLE `listings`
  ADD COLUMN `exchange_mode` text NOT NULL DEFAULT 'local'
  CHECK (`exchange_mode` IN ('local', 'remote', 'either'));

UPDATE `listings`
   SET `exchange_mode` = 'remote'
 WHERE `id` = '44f85fcb-9bc0-43db-be09-d460f50582f9'
   AND lower(`description`) LIKE '%remote%'
   AND lower(`wants`) LIKE '%remote%';

CREATE INDEX `ix_listings_exchange_mode`
  ON `listings` (`exchange_mode`);
