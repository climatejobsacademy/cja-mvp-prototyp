"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Ring } from "@/components/fortschritts-ring";
import { cn } from "@/lib/utils";

// Kompetenzseite v1 (docs/design_handoff_kompetenzen_v1, Brief 2.4 + 3, SR
// folgt; Zähler wie SR-61/63): jede Kompetenz des gewählten Moduls als
// Zeile mit Ring, Name und "{x} von {y} Teilschritten". Die Auswahl steht in
// der URL (?kompetenz=…), damit Home direkt auf eine Kompetenz verlinken
// kann -- deshalb Links mit aria-current statt Buttons mit aria-pressed.
// Client-Komponente nur wegen des Scrollens: auf dem Handy öffnet die
// Auswahl eine eigene Detailansicht (Brief 2.4), die oben beginnen soll; auf
// breiten Bildschirmen bleibt die Position (Liste und Details nebeneinander).

/** Gleiche Grenze wie das Layout der Seite (min-[960px]). */
const EINSPALTIG = "(max-width: 959px)";

export type ListenKompetenz = {
  id: string;
  name: string;
  prozent: number;
  erreicht: number;
  gesamt: number;
  /** Heute durch eine Aktivität gestärkt → Glow wie auf Home (Brief 2.4) */
  heute: boolean;
};

export function KompetenzListe({
  modulId,
  modulNummer,
  kompetenzen,
  gewaehltId,
  zusatz,
}: {
  modulId: string;
  modulNummer: number;
  kompetenzen: ListenKompetenz[];
  gewaehltId: string | null;
  /** Weitere Query-Parameter, z. B. "&now=…" zum Testen */
  zusatz: string;
}) {
  if (kompetenzen.length === 0) {
    return (
      <p className="text-[15px] text-muted-foreground">Für Modul {modulNummer} sind noch keine Kompetenzen hinterlegt.</p>
    );
  }
  return (
    <section aria-label={`Kompetenzen in Modul ${modulNummer}`}>
      <ul className="flex flex-col gap-2">
        {kompetenzen.map((k) => {
          const gewaehlt = k.id === gewaehltId;
          return (
            <li key={k.id}>
              <Link
                href={`/kompetenzen?modul=${modulId}&kompetenz=${k.id}${zusatz}`}
                scroll={false}
                onClick={() => {
                  if (window.matchMedia(EINSPALTIG).matches) window.scrollTo({ top: 0 });
                }}
                aria-current={gewaehlt ? "true" : undefined}
                className={cn(
                  "flex w-full items-center gap-4 rounded-2xl border px-[18px] py-4 text-eco-deep-green outline-none transition-[background-color,border-color] duration-150 focus-visible:ring-2 focus-visible:ring-eco-green motion-reduce:transition-none",
                  gewaehlt ? "border-eco-deep-green bg-white" : "border-transparent hover:bg-off-white"
                )}
              >
                <Ring prozent={k.prozent} glow={k.heute} groesse={56} />
                <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <span className={cn("text-base leading-snug", gewaehlt ? "font-semibold" : "font-medium")}>
                    {k.name}
                    {k.heute && <span className="sr-only"> · heute dran</span>}
                  </span>
                  {k.gesamt > 0 && (
                    <span className="text-[13px] text-muted-foreground">
                      {k.erreicht} von {k.gesamt} Teilschritten
                    </span>
                  )}
                </span>
                <ChevronRight
                  className={cn("size-[18px] shrink-0", gewaehlt ? "text-eco-deep-green" : "text-muted-foreground")}
                  aria-hidden="true"
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
