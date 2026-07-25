export function buildListingShareText(
  title: string,
  wants: string,
  postalCode?: string | null,
  exchangeMode: "local" | "remote" | "either" = "local"
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
  const availability =
    exchangeMode === "remote"
      ? " and is available remotely across the United States"
      : exchangeMode === "either"
        ? `${location} and can also be exchanged remotely`
        : location;
  return `${title} is up for barter${availability}. Looking for: ${shortenedWants}. No listing or transaction fees.`;
}
