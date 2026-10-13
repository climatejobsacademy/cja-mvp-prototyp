"use client";

import { useEffect } from "react";

// Programmseite v8 (Brief 2.6): Der Modulpfad scrollt auf schmalen
// Bildschirmen seitlich. Beim Laden wird er so verschoben, dass das
// aktuelle Modul sichtbar ist -- nur der Pfad selbst, nicht die Seite.
export function AktuellSichtbar({ zielId }: { zielId: string }) {
  useEffect(() => {
    const ziel = document.getElementById(zielId);
    const pfad = ziel?.closest("ol");
    if (!ziel || !pfad || pfad.scrollWidth <= pfad.clientWidth) return;
    pfad.scrollLeft = ziel.offsetLeft - pfad.offsetLeft - 16;
  }, [zielId]);
  return null;
}
