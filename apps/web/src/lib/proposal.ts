export interface ProposalListingOption {
  id: string;
  title: string;
  description: string;
  kind: string;
  postalCode: string;
}

export interface ProposalStarter {
  id: "time_or_skill" | "item" | "testing_feedback";
  label: string;
  offering: string;
  openingMessage: string;
}

export const PROPOSAL_STARTERS: ProposalStarter[] = [
  {
    id: "time_or_skill",
    label: "Time or a skill",
    offering:
      "I can offer [amount of time] helping with [specific task or skill].",
    openingMessage:
      "Hi — I’m interested in this trade. I can offer the time or skill described above. Would that be useful to you?",
  },
  {
    id: "item",
    label: "An item",
    offering: "I can offer my [specific item], in [condition].",
    openingMessage:
      "Hi — I’m interested in this trade. I can offer the item described above. Would that work for you, and is there anything I should know about the exchange?",
  },
  {
    id: "testing_feedback",
    label: "Testing or feedback",
    offering:
      "I can spend [amount of time] testing [specific part] and provide candid written feedback.",
    openingMessage:
      "Hi — I’m interested in this trade. I can provide the testing or feedback described above. Is that the kind of help you’re looking for?",
  },
];

export function hasProposalPlaceholders(...values: string[]): boolean {
  return values.some((value) => /\[[^\]]+\]/.test(value));
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
