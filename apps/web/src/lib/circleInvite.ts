export type CircleInviteState = "start" | "active" | "unknown";

const ZIP_PATTERN = /^\d{5}$/;

export function buildCircleInvite(
  zip: string,
  origin = window.location.origin,
  state: CircleInviteState = "start"
) {
  if (!ZIP_PATTERN.test(zip) || state === "unknown") return null;

  const active = state === "active";
  const url = new URL(`/circle/${zip}`, origin);
  url.searchParams.set("utm_source", "circle_invite");
  url.searchParams.set("utm_medium", "share");
  url.searchParams.set(
    "utm_campaign",
    `${active ? "join_a_circle" : "start_a_circle"}:${zip}`
  );

  return {
    url: url.toString(),
    title: active
      ? `See barter offers around ZIP ${zip}`
      : `Help start a barter circle around ZIP ${zip}`,
    text: active
      ? `See real goods and skills available for local barter around ZIP ${zip}. Propose a fair exchange or add something useful—no listing fees or transaction fees.`
      : `Help start a free barter circle around ZIP ${zip}. Post one useful item or skill, invite one plausible trading partner, and keep local value in local hands—no listing fees or transaction fees.`,
  };
}
