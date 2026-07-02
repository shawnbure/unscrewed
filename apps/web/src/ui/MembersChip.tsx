// Small "N neighbors" pill for the header. Threshold-gated so an empty
// day-1 doesn't render a sad "3 neighbors" chip.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import { getStats } from "../lib/stats.js";

const SHOW_THRESHOLD = 25;

export function MembersChip() {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    getStats()
      .then((s) => setN(s.members_total))
      .catch(() => setN(null));
  }, []);
  if (n === null || n < SHOW_THRESHOLD) return null;
  return (
    <Link
      to="/community"
      className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-200 transition-colors hover:bg-brand-100"
      title="Trades happen here"
    >
      <Users className="h-3.5 w-3.5" strokeWidth={2.25} />
      {n.toLocaleString()} neighbors
    </Link>
  );
}
