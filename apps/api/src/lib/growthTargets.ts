export const UMASS_CENTER = { lat: 42.389326, lng: -72.528361 };
export const UMASS_RADIUS_KM = 20;

export function umassBounds() {
  const latitudeDelta = UMASS_RADIUS_KM / 111.32;
  const longitudeScale = Math.max(
    Math.cos((UMASS_CENTER.lat * Math.PI) / 180),
    0.1
  );
  const longitudeDelta = UMASS_RADIUS_KM / (111.32 * longitudeScale);
  return [
    Math.max(-90, UMASS_CENTER.lat - latitudeDelta),
    Math.min(90, UMASS_CENTER.lat + latitudeDelta),
    Math.max(-180, UMASS_CENTER.lng - longitudeDelta),
    Math.min(180, UMASS_CENTER.lng + longitudeDelta),
  ] as const;
}

export function campaignTargetLabel(campaign: string): string | null {
  const localZip = /^invite_your_block:(\d{5})$/.exec(campaign)?.[1];
  if (localZip) return `ZIP ${localZip}`;
  if (campaign.startsWith("umass_")) return "UMass Amherst area";
  return null;
}
