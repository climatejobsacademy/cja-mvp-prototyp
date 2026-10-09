import Link from "next/link";

import type { AktuellesModul } from "@/lib/queries/home-modul";
import { cn } from "@/lib/utils";

// Home v6 (docs/design_handoff_home_v6, Brief 2.4, SR folgt): Kompetenzen
// des aktuellen Moduls als Fortschrittsringe. Keine Teilschritte auf Home,
// Klick führt auf die Kompetenzseite.

export type RingKompetenz = {
  id: string;
  name: string;
  /** Erreichte Teilschritte / alle Teilschritte (competency_fulfilment), 0-100 */
  prozent: number;
  /** Wird durch eine heutige Aktivität gestärkt → Glow (Brief 2.4). */
  heute: boolean;
};

const MAX_AUF_HOME = 6;

/** "Modul I: Theorie" steht schon für sich, sonst "Modul 1 · Grundlagen …". */
function modulZeile(modul: AktuellesModul): string {
  return /^modul\b/i.test(modul.name) ? modul.name : `Modul ${modul.nummer} · ${modul.name}`;
}

/**
 * Fortschrittsring 80 px. `dunkel` für die Fokus-Karte (Zustand D); `glow`
 * = heute gestärkt. Erklärt wird der Glow durch die Gruppe "Heute dran" im
 * Kompetenzbereich bzw. "Heute gestärkt" in Zustand D, nicht am Ring.
 */
export function Ring({ prozent, glow, dunkel }: { prozent: number; glow?: boolean; dunkel?: boolean }) {
  // 80 px, Strich 8 px: Umfang bei r = 36.
  const r = 36;
  const umfang = 2 * Math.PI * r;
  return (
    <span
      className={cn(
        "relative flex size-20 flex-none items-center justify-center rounded-full",
        glow && "shadow-glow-charge"
      )}
    >
      <svg viewBox="0 0 80 80" className="absolute inset-0 size-20 -rotate-90" aria-hidden="true">
        <circle cx="40" cy="40" r={r} fill="none" strokeWidth="8" className={dunkel ? "stroke-white/15" : "stroke-border"} />
        {prozent > 0 && (
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={umfang}
            strokeDashoffset={umfang * (1 - prozent / 100)}
            className={dunkel ? "stroke-eco-green-on-dark" : "stroke-eco-green"}
          />
        )}
      </svg>
      <span className="relative text-[15px] font-semibold tabular-nums" aria-hidden="true">
        {prozent} %
      </span>
    </span>
  );
}

/** Brief 7: 1 pro Zeile auf dem Handy, 2 auf dem Tablet, sonst feste Spalten
 * (auto-fill, damit beide Gruppen dieselben Spaltenbreiten haben). */
function RingListe({ kompetenzen }: { kompetenzen: RingKompetenz[] }) {
  return (
    <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
      {kompetenzen.map((k) => (
        <li key={k.id}>
          <Link
            href="/kompetenzen"
            aria-label={`${k.name}, ${k.prozent} Prozent`}
            className="flex items-center gap-[18px] rounded-xl text-eco-deep-green outline-none focus-visible:ring-2 focus-visible:ring-eco-green focus-visible:ring-offset-4"
          >
            <Ring prozent={k.prozent} glow={k.heute} />
            <span className="text-base leading-snug font-medium">{k.name}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

const GRUPPEN_TITEL = "text-[15px] font-semibold";

/**
 * Entscheidung Anna 2026-10-09 (Variante 3), abweichend vom Brief ("kein
 * Label"): heute gestärkte Kompetenzen stehen als eigene Gruppe "Heute dran"
 * oben, der Rest unter "Weitere in diesem Modul". Die Zwischenüberschrift
 * erklärt den Glow. Gibt es heute keine, entfallen beide Überschriften.
 */
export function KompetenzBereich({ modul, kompetenzen }: { modul: AktuellesModul; kompetenzen: RingKompetenz[] }) {
  // Heute relevante zuerst, sonst Lehrplan-Reihenfolge (sort ist stabil); höchstens 6.
  const sichtbar = [...kompetenzen].sort((a, b) => Number(b.heute) - Number(a.heute)).slice(0, MAX_AUF_HOME);
  const heute = sichtbar.filter((k) => k.heute);
  const weitere = sichtbar.filter((k) => !k.heute);
  return (
    <section aria-labelledby="kompetenzen" className="flex flex-col gap-7 pt-2">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[15px] text-muted-foreground">{modulZeile(modul)}</span>
          <h2 id="kompetenzen" className="font-heading text-[28px] leading-tight text-eco-deep-green md:text-[32px]">
            Diese Kompetenzen baust du auf
          </h2>
        </div>
        <Link
          href="/kompetenzen"
          className="rounded-sm text-[15px] text-muted-foreground outline-none hover:text-eco-deep-green focus-visible:ring-2 focus-visible:ring-eco-green"
        >
          Alle Kompetenzen →
        </Link>
      </div>

      {heute.length === 0 ? (
        <RingListe kompetenzen={weitere} />
      ) : (
        <>
          <div className="flex flex-col gap-5">
            <h3 className={cn(GRUPPEN_TITEL, "text-eco-deep-green")}>Heute dran</h3>
            <RingListe kompetenzen={heute} />
          </div>
          {weitere.length > 0 && (
            <div className="flex flex-col gap-5">
              <h3 className={cn(GRUPPEN_TITEL, "text-muted-foreground")}>Weitere in diesem Modul</h3>
              <RingListe kompetenzen={weitere} />
            </div>
          )}
        </>
      )}
    </section>
  );
}
