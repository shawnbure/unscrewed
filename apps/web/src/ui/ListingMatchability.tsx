import { Link } from "react-router-dom";
import { ListChecks } from "lucide-react";

export type MatchabilityInput = {
  kind: "good" | "service";
  title: string;
  description: string;
  wants: string;
  photoCount: number;
};

const SCOPE_SIGNAL =
  /\b(\d+\s*(minute|hour|day|session|lesson|call)s?|one[- ]time|review|diagnosis|installation|repair|delivery|consultation|walkthrough)\b/i;
const AVAILABILITY_SIGNAL =
  /\b(weekday|weekend|morning|afternoon|evening|monday|tuesday|wednesday|thursday|friday|saturday|sunday|available|appointment|remote|video call|in person)\b/i;
const VAGUE_WANTS =
  /\b(make (this|it) go viral|spread the word|help everyone|anything|whatever|surprise me|open to ideas)\b/i;
const EXAMPLE_SIGNAL = /[,;/]|\b(or|such as|for example|e\.g\.)\b/i;

export function listingMatchabilityTips(
  input: MatchabilityInput
): string[] {
  const tips: string[] = [];
  const title = input.title.trim();
  const description = input.description.trim();
  const wants = input.wants.trim();

  if (title.length > 0 && title.length < 12) {
    tips.push(
      "Make the title specific enough to identify the item or service at a glance."
    );
  }
  if (description.length > 0 && description.length < 80) {
    tips.push(
      "Add condition or scope, important limits, and what the other trader will actually receive."
    );
  }
  if (
    input.kind === "service" &&
    description.length > 0 &&
    !SCOPE_SIGNAL.test(`${title} ${description}`)
  ) {
    tips.push(
      "Define one trade unit—for example a 30-minute call, one repair, or one written review."
    );
  }
  if (
    description.length > 0 &&
    !AVAILABILITY_SIGNAL.test(description)
  ) {
    tips.push(
      "Say when or how the exchange can happen, without posting a private address."
    );
  }
  if (
    wants.length > 0 &&
    (wants.length < 20 ||
      VAGUE_WANTS.test(wants) ||
      !EXAMPLE_SIGNAL.test(wants))
  ) {
    tips.push(
      "Name two or three goods or services you would realistically accept so a neighbor can make a concrete offer."
    );
  }
  if (input.photoCount === 0) {
    tips.push(
      input.kind === "good"
        ? "Add a current photo so people can judge condition before proposing."
        : "Add a relevant photo when it helps establish what the service covers."
    );
  }
  return tips;
}

export function ListingMatchability({
  input,
  editHref,
}: {
  input: MatchabilityInput;
  editHref?: string;
}) {
  const tips = listingMatchabilityTips(input);
  if (tips.length === 0) {
    return (
      <section className="rounded-2xl border border-brand-200 bg-brand-50/50 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-brand-800">
          <ListChecks className="h-4 w-4" strokeWidth={2} />
          Ready for a concrete proposal
        </p>
        <p className="mt-1 text-xs leading-5 text-brand-800/80">
          This listing gives neighbors enough detail to decide what to offer.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-900">
        <ListChecks className="h-4 w-4" strokeWidth={2} />
        Make this easier to match
      </h3>
      <p className="mt-1 text-xs leading-5 text-amber-800">
        These are suggestions, not automatic edits. Keep every detail honest.
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-amber-900">
        {tips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
      {editHref && (
        <Link
          to={editHref}
          className="mt-3 inline-flex text-xs font-semibold text-amber-900 underline"
        >
          Edit this trade
        </Link>
      )}
    </section>
  );
}
