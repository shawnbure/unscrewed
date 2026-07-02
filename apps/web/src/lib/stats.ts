// Shared client for the public /stats endpoint. Both the header member-
// counter and the /community page hit this — we cache locally for a
// minute so incidental re-renders don't beat up the API.

import { api } from "./api.js";

export interface MapCluster {
  zip3: string;
  lat: number;
  lng: number;
  count: number;
}

export interface StatsPayload {
  members_total: number;
  listings_active: number;
  listings_this_month: number;
  map_clusters: MapCluster[];
  updated_at: number;
}

let inflight: Promise<StatsPayload> | null = null;
let cached: { at: number; value: StatsPayload } | null = null;
const CACHE_MS = 60_000;

export async function getStats(): Promise<StatsPayload> {
  const now = Date.now();
  if (cached && now - cached.at < CACHE_MS) return cached.value;
  if (inflight) return inflight;
  inflight = api<StatsPayload>("/stats")
    .then((v) => {
      cached = { at: Date.now(), value: v };
      return v;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
