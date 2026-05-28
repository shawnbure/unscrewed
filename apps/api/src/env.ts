export interface Env {
  // Bindings
  DB: D1Database;
  SESSIONS: KVNamespace;
  RATE_LIMIT: KVNamespace;
  PHOTOS: R2Bucket;
  NEGOTIATION: DurableObjectNamespace;

  // Vars
  PUBLIC_BASE_URL: string;
  TOS_VERSION: string;

  // Secrets
  TELNYX_API_KEY: string;
  TELNYX_MESSAGING_PROFILE_ID: string;
  TELNYX_FROM_NUMBER: string;
  SESSION_SECRET: string;
  TURNSTILE_SECRET_KEY: string;
}

export type AppContext = {
  Bindings: Env;
  Variables: {
    userId?: string;
    isAdmin?: boolean;
  };
};
