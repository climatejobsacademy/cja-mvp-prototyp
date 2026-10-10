"use client";

import { useEffect, useState } from "react";

import { jetztInBerlin } from "@/lib/date";
import { stunden } from "@/lib/stundenplan";

// Stundenplan v2 (Brief 2.4): 2-px-Linie mit Punkt auf der aktuellen
// Berliner Uhrzeit, nur in der heutigen Spalte (entscheidet die Seite),
// aktualisiert jede Minute. Mit simulierter Zeit (?now=) steht sie fest.

export function JetztLinie({
  von,
  bis,
  startJetzt,
  simuliert,
}: {
  von: number;
  bis: number;
  /** "JJJJ-MM-TTTHH:MM:SS" vom Server -- gleicher Wert beim ersten Rendern auf Server und im Browser */
  startJetzt: string;
  /** ?now= aktiv: Linie steht fest */
  simuliert: boolean;
}) {
  const [jetzt, setJetzt] = useState(startJetzt);

  useEffect(() => {
    if (simuliert) return;
    // Nur ein Timer, kein Netzwerk -- Aufräumen reicht, kein AbortController nötig.
    const timer = setInterval(() => setJetzt(jetztInBerlin()), 60_000);
    return () => clearInterval(timer);
  }, [simuliert]);

  const h = stunden(jetzt.slice(11, 19));
  if (h < von || h > bis) return null;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 z-20 h-0.5 bg-eco-deep-green"
      style={{ top: `${((h - von) / (bis - von)) * 100}%` }}
    >
      <span className="absolute -top-[5px] -left-1.5 size-3 rounded-full bg-eco-deep-green" />
    </div>
  );
}
