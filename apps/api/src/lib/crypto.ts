// Password hashing using PBKDF2-SHA256 (Web Crypto, available in Workers).
// scrypt isn't in Web Crypto; PBKDF2 with high iterations is the standard
// Workers-friendly choice. Argon2 would require a WASM module.
//
// Format: pbkdf2$<iterations>$<saltB64>$<hashB64>

// Cloudflare Workers caps PBKDF2 iterations at 100,000 (Web Crypto
// implementation limit). 100k SHA-256 is still well above OWASP's 600k
// recommendation for SHA-1 / 210k for SHA-256, BUT it's what the runtime
// allows. If we need stronger, swap to argon2 via a WASM module later.
const PBKDF2_ITER = 100_000;
const KEY_LEN = 32;

function b64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function unb64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, PBKDF2_ITER);
  return `pbkdf2$${PBKDF2_ITER}$${b64(salt)}$${b64(hash)}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iter = parseInt(parts[1]!, 10);
  const salt = unb64(parts[2]!);
  const expected = unb64(parts[3]!);
  const actual = await pbkdf2(password, salt, iter);
  return timingSafeEqual(new Uint8Array(actual), expected);
}

async function pbkdf2(
  password: string,
  salt: Uint8Array,
  iterations: number
): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    key,
    KEY_LEN * 8
  );
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

export async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(s)
  );
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function generateSmsCode(): string {
  // 6 digits, leading zeros allowed.
  const n = crypto.getRandomValues(new Uint32Array(1))[0]! % 1_000_000;
  return n.toString().padStart(6, "0");
}

export function randomId(bytes = 16): string {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  return [...buf].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function uuidv4(): string {
  return crypto.randomUUID();
}
