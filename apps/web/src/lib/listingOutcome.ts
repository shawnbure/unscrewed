export interface ListingShareCounts {
  uniqueVisitors: number;
  proposalIntents: number;
  attributedMembers: number;
  proposals: number;
  twoSidedConversations: number;
  completedTrades: number;
}

export interface NextOutcomeAction {
  title: string;
  body: string;
  label: string;
  to: string;
}

export function getNextOutcomeAction(
  current: ListingShareCounts,
  listingId: string
): NextOutcomeAction {
  if (current.completedTrades > 0) {
    return {
      title: "Build on a completed trade",
      body: "This listing produced a confirmed exchange. If you can fulfill it again, invite one more person who may genuinely want it.",
      label: "Go to the invitation",
      to: `#share-listing-${listingId}`,
    };
  }

  if (current.twoSidedConversations > 0) {
    return {
      title: "Move the real conversation forward",
      body: "Both people have replied. Clarify the exact exchange, timing, and safety details; count success only after both people confirm completion.",
      label: "Open My trades",
      to: "/trades",
    };
  }

  if (current.proposals > 0) {
    return {
      title: "Reply to the proposal",
      body: "A real person proposed a trade. A prompt, specific reply is now more valuable than sending this listing to more people.",
      label: "Open My trades",
      to: "/trades",
    };
  }

  if (current.attributedMembers > 0) {
    return {
      title: "A visitor joined but has not proposed",
      body: "The invitation reached a new member. Do not chase an anonymous count; make the requested return easy to understand and give them room to decide.",
      label: "Review listing details",
      to: `/listing/${listingId}/edit`,
    };
  }

  if (current.proposalIntents > 0) {
    return {
      title: "The offer reached signup",
      body: "Someone clicked to propose but has not joined yet. Do not resend the link; check that the offer and requested return are concrete, then wait for a genuine decision.",
      label: "Review listing details",
      to: `/listing/${listingId}/edit`,
    };
  }

  if (current.uniqueVisitors > 0) {
    return {
      title: "Visits have not become proposal intent",
      body: "People are opening the invitation but not choosing to propose. Improve the offer, requested return, or clarity before inviting anyone else.",
      label: "Improve this listing",
      to: `/listing/${listingId}/edit`,
    };
  }

  return {
    title: "Find the first plausible counterparty",
    body: "Choose one person who could genuinely use this exact offer. Review the invitation, then decide whether and where to send it yourself.",
    label: "Go to the invitation",
    to: `#share-listing-${listingId}`,
  };
}
