-- A signed agreement proves mutual intent, not that the real-world exchange
-- happened. Each party must separately confirm fulfillment before the
-- marketplace counts or shares a completed trade.
ALTER TABLE `contracts`
  ADD COLUMN `party_a_completed_at` integer;

ALTER TABLE `contracts`
  ADD COLUMN `party_b_completed_at` integer;

CREATE INDEX `ix_contract_completion`
  ON `contracts` (`party_a_completed_at`, `party_b_completed_at`)
  WHERE `status` = 'signed';
