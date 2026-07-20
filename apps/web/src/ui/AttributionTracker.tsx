import { useEffect } from "react";
import { captureAttribution } from "../lib/attribution.js";

export function AttributionTracker() {
  useEffect(() => {
    captureAttribution();
  }, []);

  return null;
}
