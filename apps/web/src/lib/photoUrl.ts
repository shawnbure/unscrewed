// R2 keys are served by the API Worker at /listings/photos/:key
// Use the same routing logic as api.ts so we always hit the live host on prod.

import { API_BASE as API_HOST } from "./api";

export function photoUrl(key: string): string {
  return `${API_HOST}/listings/photos/${encodeURIComponent(key)}`;
}
