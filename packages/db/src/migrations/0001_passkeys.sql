-- Passkeys / WebAuthn credentials
--
-- One row per registered authenticator (device, YubiKey, iCloud Keychain
-- entry, etc.). A single user may register many. Credential_id is the
-- opaque bytes the authenticator gives us; public_key is the COSE key
-- used to verify future assertions.

CREATE TABLE `passkeys` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`),
  `credential_id` text NOT NULL,        -- base64url-encoded
  `public_key` text NOT NULL,           -- base64url-encoded COSE key
  `counter` integer NOT NULL DEFAULT 0, -- signature counter (replay defense)
  `transports` text,                    -- csv: usb,nfc,ble,internal,hybrid
  `device_label` text,                  -- user-friendly name ("Mac Touch ID")
  `is_deleted` integer NOT NULL DEFAULT 0,
  `date_created` integer NOT NULL DEFAULT (unixepoch() * 1000),
  `date_last_used` integer
);
CREATE UNIQUE INDEX `ux_passkeys_credential_id` ON `passkeys` (`credential_id`);
CREATE INDEX `ix_passkeys_user` ON `passkeys` (`user_id`);
