export interface Env {
  // Bindings
  DB: D1Database;
  SESSIONS: KVNamespace;
  RATE_LIMIT: KVNamespace;
  PHOTOS: R2Bucket;
  NEGOTIATION: DurableObjectNamespace;
  AI: Ai;
  EMAIL: SendEmail;

  // Vars
  API_BASE_URL: string;
  PUBLIC_BASE_URL: string;
  OPERATOR_EMAIL: string;
  TOS_VERSION: string;

  // Secrets
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
