export function buildListingShareText(
  title: string,
  wants: string,
  postalCode?: string | null
): string {
  const compactWants = wants.replace(/\s+/g, " ").trim();
  const shortenedWants =
    compactWants.length > 140
      ? `${compactWants.slice(0, 137).trimEnd()}…`
      : compactWants;
  const compactPostalCode = postalCode?.replace(/\s+/g, " ").trim();
  const locationLabel =
    compactPostalCode && /^\d{5}$/.test(compactPostalCode)
      ? `ZIP ${compactPostalCode}`
      : compactPostalCode;
  const location =
    locationLabel && locationLabel.toUpperCase() !== "USA"
      ? ` near ${locationLabel}`
      : "";
  return `${title} is up for barter${location}. Looking for: ${shortenedWants}. No listing or transaction fees.`;
}
