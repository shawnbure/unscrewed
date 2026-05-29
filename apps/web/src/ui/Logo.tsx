// Wordmark + standalone mark for unscrewed.lol.
//
// The mark is a stylized "u" with a counter-rotating arrow that suggests
// "unscrew" — a fastener loosening counter-clockwise. Single-color, scales
// cleanly down to favicon size.

interface Props {
  className?: string;
  withWord?: boolean;
}

export function Logo({ className = "h-7 w-auto", withWord = true }: Props) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Mark className="h-full w-auto text-brand-600" />
      {withWord && (
        <span className="text-[15px] font-semibold tracking-tightish text-ink-900">
          unscrewed
          <span className="text-ink-300">.lol</span>
        </span>
      )}
    </span>
  );
}

function Mark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* counter-rotating loop suggesting "unscrew" */}
      <path
        d="M9 8v9.5a7 7 0 0 0 14 0V12"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* arrow tail */}
      <path
        d="M23 12l3.5-2.6M23 12l-2.6-3.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export { Mark as LogoMark };
