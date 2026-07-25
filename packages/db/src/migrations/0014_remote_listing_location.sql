-- Remote-only offers are available nationwide and never participate in local
-- maps, density, or listing-watch alerts. Remove obsolete listing-level home
-- location data from existing remote rows and use the same neutral marker as
-- all newly created remote offers. This does not change a member's private
-- account home ZIP.
UPDATE `listings`
   SET `postal_code` = 'USA',
       `country_code` = 'US',
       `lat` = 39.8283,
       `lng` = -98.5795,
       `geohash` = '9z1fsf8'
 WHERE `exchange_mode` = 'remote'
   AND (
     `postal_code` <> 'USA'
     OR `country_code` <> 'US'
     OR `lat` <> 39.8283
     OR `lng` <> -98.5795
     OR `geohash` <> '9z1fsf8'
   );
