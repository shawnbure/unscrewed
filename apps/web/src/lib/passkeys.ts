// Thin wrappers around @simplewebauthn/browser + our /passkeys endpoints.
// Keeps components ignorant of the WebAuthn protocol details.

import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
} from "@simplewebauthn/browser";
import { api } from "./api.js";

export function passkeysSupported(): boolean {
  return browserSupportsWebAuthn();
}

interface BeginRegResponse {
  challengeId: string;
  options: any;
}

/** Auth required. Pairs a new authenticator with the current account. */
export async function registerPasskey(deviceLabel?: string): Promise<void> {
  const { challengeId, options } = await api<BeginRegResponse>(
    "/passkeys/register/begin",
    { method: "POST" }
  );
  const response = await startRegistration({ optionsJSON: options });
  await api("/passkeys/register/finish", {
    method: "POST",
    body: JSON.stringify({ challengeId, response, deviceLabel }),
  });
}

interface BeginAuthResponse {
  challengeId: string;
  options: any;
}

/** No auth required. Prompts the browser's credential picker; on success the server sets our session cookie. */
export async function signInWithPasskey(): Promise<void> {
  const { challengeId, options } = await api<BeginAuthResponse>(
    "/passkeys/authenticate/begin",
    { method: "POST" }
  );
  const response = await startAuthentication({ optionsJSON: options });
  await api("/passkeys/authenticate/finish", {
    method: "POST",
    body: JSON.stringify({ challengeId, response }),
  });
}

export interface StoredPasskey {
  id: string;
  deviceLabel: string | null;
  transports: string | null;
  dateCreated: number;
  dateLastUsed: number | null;
}

export async function listPasskeys(): Promise<StoredPasskey[]> {
  const r = await api<{ items: StoredPasskey[] }>("/passkeys");
  return r.items;
}

export async function revokePasskey(id: string): Promise<void> {
  await api(`/passkeys/${id}`, { method: "DELETE" });
}
