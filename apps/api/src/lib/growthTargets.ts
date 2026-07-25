export const UMASS_CENTER = { lat: 42.389326, lng: -72.528361 };
export const UMASS_RADIUS_KM = 20;

export function locationBounds(
  center: { lat: number; lng: number },
  radiusKm: number
) {
  const latitudeDelta = radiusKm / 111.32;
  const longitudeScale = Math.max(
    Math.cos((center.lat * Math.PI) / 180),
    0.1
  );
  const longitudeDelta = radiusKm / (111.32 * longitudeScale);
  return [
    Math.max(-90, center.lat - latitudeDelta),
    Math.min(90, center.lat + latitudeDelta),
    Math.max(-180, center.lng - longitudeDelta),
    Math.min(180, center.lng + longitudeDelta),
  ] as const;
}

export function umassBounds() {
  return locationBounds(UMASS_CENTER, UMASS_RADIUS_KM);
}

export function campaignTargetLabel(campaign: string): string | null {
  if (campaign === "national_barter_movement_2026") return "United States";
  const localZip = /^invite_your_block:(\d{5})$/.exec(campaign)?.[1];
  if (localZip) return `ZIP ${localZip}`;
  if (campaign.startsWith("umass_")) return "UMass Amherst area";
  return null;
}
