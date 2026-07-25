export interface ProposalListingOption {
  id: string;
  title: string;
  description: string;
  kind: string;
  postalCode: string;
}

function compact(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function proposalOfferingFromListing(
  listing: ProposalListingOption
): string {
  const title = compact(listing.title);
  const description = compact(listing.description);
  const shortenedDescription =
    description.length > 220
      ? `${description.slice(0, 219).trimEnd()}…`
      : description;
  return `I can offer: ${title}${shortenedDescription ? ` — ${shortenedDescription}` : ""}`;
}
