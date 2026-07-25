export interface ListingStarter {
  label: string;
  kind: "good" | "service";
  exchangeMode?: "local" | "remote" | "either";
  category: string;
  title: string;
  wants: string;
  wantsPlaceholder?: string;
  descriptionPlaceholder: string;
}

export const LISTING_STARTERS = {
  useful_item: {
    label: "Useful item",
    kind: "good",
    category: "other",
    title: "",
    wants: "",
    wantsPlaceholder:
      "Name two or three things you would genuinely accept, such as another household item or one hour of a specific skill.",
    descriptionPlaceholder:
      "Name the exact item, condition, size or age if relevant, pickup availability, and anything a neighbor should know.",
  },
  one_hour_help: {
    label: "One hour of practical help",
    kind: "service",
    category: "labor",
    title: "One hour of practical help",
    wants: "",
    wantsPlaceholder:
      "Name two or three realistic returns, such as a household item, garden produce, or one hour of another specific skill.",
    descriptionPlaceholder:
      "Name the specific task you can do for one hour, when you are available, what is included, and any limits.",
  },
  remote_skill: {
    label: "30-minute remote skill session",
    kind: "service",
    exchangeMode: "remote",
    category: "professional_services",
    title: "30-minute remote skill session",
    wants:
      "Open to 30 minutes of another practical skill, specific written feedback, or another fair remote exchange.",
    descriptionPlaceholder:
      "Name the exact skill you can share, what someone can accomplish in 30 minutes, how you will meet remotely, your availability, and any limits.",
  },
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
