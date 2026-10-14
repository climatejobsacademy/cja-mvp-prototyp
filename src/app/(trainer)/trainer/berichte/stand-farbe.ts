import type { BerichtStand } from "@/lib/praxisbericht";

/** Farbe der Stand-Marke: offen in Lime (Handlung nötig), sonst Erfolg bzw. Warnung. */
export const STAND_FARBE: Record<BerichtStand, string> = {
  offen: "bg-lime text-on-lime",
  freigegeben: "bg-success/15 text-success",
  zurueckgegeben: "bg-warning/15 text-warning-foreground",
};
