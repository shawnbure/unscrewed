import { api } from "./api.js";

export interface Attribution {
  visitorId: string;
  source: string;
  medium: string;
  campaign: string;
}

interface StoredAttribution extends Attribution {
  capturedAt: number;
}

const ATTRIBUTION_KEY = "unscrewed.attribution.v1";
const VISITOR_KEY = "unscrewed.visitor.v1";
const ATTRIBUTION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function captureAttribution(): void {
  const params = new URLSearchParams(window.location.search);
  const source = clean(params.get("utm_source"), 80);
  const medium = clean(params.get("utm_medium"), 80);
  const campaign = clean(params.get("utm_campaign"), 120);
  if (!source || !medium || !campaign) return;

  try {
    let visitorId = window.localStorage.getItem(VISITOR_KEY);
    if (!visitorId) {
      visitorId = crypto.randomUUID();
      window.localStorage.setItem(VISITOR_KEY, visitorId);
    }

    const attribution: StoredAttribution = {
      visitorId,
      source,
      medium,
      campaign,
      capturedAt: Date.now(),
    };
    window.localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));

    api("/growth/visit", {
      method: "POST",
      body: JSON.stringify({ visitorId, source, medium, campaign }),
    }).catch(() => {
      // Attribution must never interrupt browsing. Signup will still carry
      // the campaign if this best-effort landing event is unavailable.
    });
  } catch {
    // Storage may be disabled. The site remains fully usable without it.
  }
}

export function getStoredAttribution(): Attribution | undefined {
  try {
    const raw = window.localStorage.getItem(ATTRIBUTION_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as StoredAttribution;
    if (
      !parsed.visitorId ||
      !UUID_PATTERN.test(parsed.visitorId) ||
      !parsed.source ||
      parsed.source.length > 80 ||
      !parsed.medium ||
      parsed.medium.length > 80 ||
      !parsed.campaign ||
      parsed.campaign.length > 120 ||
      !parsed.capturedAt ||
      Date.now() - parsed.capturedAt > ATTRIBUTION_TTL_MS
    ) {
      window.localStorage.removeItem(ATTRIBUTION_KEY);
      return undefined;
    }
    return {
      visitorId: parsed.visitorId,
      source: parsed.source,
      medium: parsed.medium,
      campaign: parsed.campaign,
    };
  } catch {
    return undefined;
  }
}

function clean(value: string | null, maxLength: number): string {
  return value?.trim().slice(0, maxLength) ?? "";
}
