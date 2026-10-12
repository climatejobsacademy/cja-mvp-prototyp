import Link from "next/link";
import { Check } from "lucide-react";

import { ProgrammZeile } from "@/components/programm-zeile";
import { cn } from "@/lib/utils";

// Kompetenzseite v1 (docs/design_handoff_kompetenzen_v1, Brief 2.2 + 2.3,
// SR folgt): Überzeile Programm, "Deine Kompetenzen", Modul-Tabs als
// Segmented Control (gleicher Stil wie die Hauptnavigation) und die
// Fortschrittszeile des gewählten Moduls.

export type ModulTab = {
  id: string;
  nummer: number;
  aktuell: boolean;
  /** Alle Teilschritte des Moduls erreicht (Entscheidung Anna 2026-10-10) */
  abgeschlossen: boolean;
  /** Liegt nach dem aktuellen Modul -- grau, aber anklickbar (Vorschau) */
  zukuenftig: boolean;
};

export function KompetenzenKopf({
  programmName,
  modulTabs,
  gewaehltId,
  zusatz,
}: {
  programmName: string;
  modulTabs: ModulTab[];
  gewaehltId: string | null;
  /** Weitere Query-Parameter, z. B. "&now=…" zum Testen */
  zusatz: string;
}) {
  return (
    <section className="flex flex-wrap items-end justify-between gap-6">
      <div className="flex flex-col gap-2">
        <ProgrammZeile name={programmName} />
        <h1 className="font-heading text-[40px] leading-none text-ink md:text-[52px]">
          Deine Kompetenzen
        </h1>
      </div>

      {modulTabs.length > 0 && (
        // Bei vielen Modulen horizontal scrollbar (Brief 2.2).
        <nav aria-label="Module" className="max-w-full overflow-x-auto">
          <ul className="flex w-max items-center gap-0.5 rounded-full bg-subtle p-1">
            {modulTabs.map((m) => {
              const gewaehlt = m.id === gewaehltId;
              return (
                <li key={m.id}>
                  <Link
                    href={`/kompetenzen?modul=${m.id}${zusatz}`}
                    aria-current={gewaehlt ? "true" : undefined}
                    className={cn(
                      "flex min-h-9 items-center gap-1.5 rounded-full px-3.5 text-sm whitespace-nowrap outline-none transition-[background-color,box-shadow,color] duration-150 focus-visible:ring-2 focus-visible:ring-brand motion-reduce:transition-none",
                      gewaehlt
                        ? "bg-white font-semibold text-ink shadow-segment"
                        : "text-ink-muted hover:text-ink"
                    )}
                  >
                    {m.abgeschlossen && (
                      <>
                        <Check className="size-3.5 shrink-0 text-progress" strokeWidth={3} aria-hidden="true" />
                        <span className="sr-only">abgeschlossen: </span>
                      </>
                    )}
                    {/* Aktuelles Modul: Lime-Punkt statt " · aktuell" (Anna 2026-10-12),
                        wie "Hier bist du" und "Läuft gerade" auf den anderen Seiten. */}
                    {m.aktuell && (
                      <>
                        <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-lime shadow-glow-charge-sm" />
                        <span className="sr-only">aktuell: </span>
                      </>
                    )}
                    Modul {m.nummer}
                    {m.zukuenftig && !gewaehlt && <span className="sr-only"> (Vorschau)</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </section>
  );
}

/**
 * Brief 2.3, geändert 2026-10-12 (Anna): Balken = Durchschnitt der
 * Kompetenz-Ringe des Moduls, nicht mehr gezählte Kompetenzschritte.
 */
export function ModulFortschrittZeile({
  nummer,
  prozent,
  anzahl,
}: {
  nummer: number;
  /** Mittelwert der Kompetenz-Fortschritte, 0-100 */
  prozent: number;
  /** Zahl der Kompetenzen im Modul */
  anzahl: number;
}) {
  if (anzahl === 0) {
    return (
      <p className="rounded-karte bg-card px-5 py-4 text-[15px] text-ink-muted shadow-card">
        Für Modul {nummer} sind noch keine Kompetenzen hinterlegt.
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3.5 rounded-karte bg-anchor-brand px-6 py-5 text-[15px] text-white/85 shadow-anchor-brand">
      <span
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={prozent}
        aria-label={`Fortschritt deiner Kompetenzen in Modul ${nummer}`}
        className="h-1.5 max-w-80 flex-[1_1_260px] rounded-full bg-white/25"
      >
        <span className="block h-1.5 rounded-full bg-lime" style={{ width: `${prozent}%` }} />
      </span>
      <span>
        Im Schnitt <span className="font-semibold text-white">{prozent} %</span> über{" "}
        {anzahl === 1 ? "deine Kompetenz" : `alle ${anzahl} Kompetenzen`} in Modul {nummer}
      </span>
    </div>
  );
}
