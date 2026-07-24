export interface ListingStarter {
  label: string;
  kind: "good" | "service";
  category: string;
  title: string;
  wants: string;
  descriptionPlaceholder: string;
}

export const LISTING_STARTERS = {
  dorm_fridge: {
    label: "Mini-fridge",
    kind: "good",
    category: "home_garden",
    title: "Mini-fridge",
    wants: "Open to a desk lamp, storage bins, or other useful dorm gear.",
    descriptionPlaceholder:
      "Add the fridge size, age, condition, pickup details, and anything a neighbor should know.",
  },
  course_textbook: {
    label: "Course textbook",
    kind: "good",
    category: "books_media",
    title: "Course textbook",
    wants: "Open to another course textbook or useful campus gear.",
    descriptionPlaceholder:
      "Add the title, author, edition, course, condition, and whether any access code is included.",
  },
  bike_repair: {
    label: "Bike repair help",
    kind: "service",
    category: "skilled_trades",
    title: "Bike repair help",
    wants: "Open to help moving, tutoring, or another useful skill.",
    descriptionPlaceholder:
      "Describe the repairs you can handle, tools you have, availability, and any limits.",
  },
} satisfies Record<string, ListingStarter>;

export type ListingStarterId = keyof typeof LISTING_STARTERS;

export function getListingStarter(
  value: string | null
): ListingStarter | null {
  if (!value || !(value in LISTING_STARTERS)) return null;
  return LISTING_STARTERS[value as ListingStarterId];
}

export function listingStarterPath(id: ListingStarterId): string {
  return `/post?starter=${encodeURIComponent(id)}`;
}
