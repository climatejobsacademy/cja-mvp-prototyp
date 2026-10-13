import Link from "next/link";
import { Check } from "lucide-react";

import { ProgrammZeile } from "@/components/programm-zeile";
import { cn } from "@/lib/utils";

// Kompetenzseite v1 (SR-61, SR-62, SR-63; Design aus dem Branch demo,
// docs/design_handoff_kompetenzen_v1, Brief 2.2 + 2.3): Überzeile Programm,
// "Deine Kompetenzen", Modul-Reiter als Segmented Control und die
// Fortschrittszeile des gewählten Moduls. Reiter und Zuordnung der
// Kompetenzen aus der Modul-Ebene (0028, modul_competency).

export type ModulTab = {
  id: string;
  /** modul.ueberzeile, z. B. "Modul II" */
  ueberzeile: string;
  aktuell: boolean;
  /** Alle Kompetenzschritte des Moduls erreicht (Entscheidung Anna 2026-10-10) */
  abgeschlossen: boolean;
  /** Liegt nach dem aktuellen Modul -- grau, aber anklickbar (Vorschau) */
  zukuenftig: boolean;
};

export function KompetenzenKopf({
  programmName,
  modulTabs = [],
  gewaehltId = null,
  zusatz = "",
}: {
  programmName: string;
  modulTabs?: ModulTab[];
  gewaehltId?: string | null;
  /** Weitere Query-Parameter, z. B. "&now=…" zum Testen */
  zusatz?: string;
}) {
  return (
    <section className="flex flex-wrap items-end justify-between gap-6">
      <div className="flex flex-col gap-2">
        <ProgrammZeile name={programmName} />
        <h1 className="font-heading text-[40px] leading-none text-ink md:text-[52px]">Deine Kompetenzen</h1>
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
                      gewaehlt ? "bg-white font-semibold text-ink shadow-segment" : "text-ink-muted hover:text-ink"
                    )}
                  >
                    {m.abgeschlossen && (
                      <>
                        <Check className="size-3.5 shrink-0 text-progress" strokeWidth={3} aria-hidden="true" />
                        <span className="sr-only">abgeschlossen: </span>
                      </>
                    )}
                    {m.ueberzeile}
                    {m.aktuell && " · aktuell"}
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

/** Brief 2.3: ruhige Zeile mit Balken + "{erreicht} von {gesamt} Kompetenzschritten in Modul II erreicht". */
export function ModulFortschrittZeile({
  ueberzeile,
  erreicht,
  gesamt,
}: {
  ueberzeile: string;
  erreicht: number;
  gesamt: number;
}) {
  if (gesamt === 0) {
    return (
      <p className="rounded-karte bg-card px-5 py-4 text-[15px] text-ink-muted shadow-card">
        Für {ueberzeile} sind noch keine Kompetenzschritte hinterlegt.
      </p>
    );
  }
  const prozent = Math.round((erreicht / gesamt) * 100);
  return (
    <div className="flex flex-wrap items-center gap-3.5 rounded-karte bg-anchor-brand px-6 py-5 text-[15px] text-white/85 shadow-anchor-brand">
      <span
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={gesamt}
        aria-valuenow={erreicht}
        aria-label={`Fortschritt in ${ueberzeile}`}
        className="h-1.5 max-w-80 flex-[1_1_260px] rounded-full bg-white/25"
      >
        <span className="block h-1.5 rounded-full bg-lime" style={{ width: `${prozent}%` }} />
      </span>
      <span>
        <span className="font-semibold text-white">
          {erreicht} von {gesamt} Kompetenzschritten
        </span>{" "}
        in {ueberzeile} erreicht
      </span>
    </div>
  );
}
