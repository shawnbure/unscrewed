export interface StoredListingLocation {
  postalCode: string;
  countryCode: string;
  lat: number;
  lng: number;
}

export const REMOTE_MARKET_LOCATION: StoredListingLocation = {
  postalCode: "USA",
  countryCode: "US",
  lat: 39.8283,
  lng: -98.5795,
};

export function resolveCreateListingLocation(input: {
  exchangeMode: "local" | "remote" | "either";
  postalCode?: string;
  countryCode: string;
  lat?: number;
  lng?: number;
}): StoredListingLocation {
  if (input.exchangeMode === "remote") return REMOTE_MARKET_LOCATION;
  if (
    !input.postalCode ||
    input.lat === undefined ||
    input.lng === undefined
  ) {
    throw new Error("Local listing location was not validated");
  }
  return {
    postalCode: input.postalCode,
    countryCode: input.countryCode,
    lat: input.lat,
    lng: input.lng,
  };
}
