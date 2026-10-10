import Link from "next/link";
import { Check } from "lucide-react";

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
        {programmName.trim() && (
          <span className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            {programmName}
          </span>
        )}
        <h1 className="font-heading text-[40px] leading-none text-eco-deep-green md:text-[48px]">
          Deine Kompetenzen
        </h1>
      </div>

      {modulTabs.length > 0 && (
        // Bei vielen Modulen horizontal scrollbar (Brief 2.2).
        <nav aria-label="Module" className="max-w-full overflow-x-auto">
          <ul className="flex w-max items-center gap-0.5 rounded-xl bg-off-white p-1">
            {modulTabs.map((m) => {
              const gewaehlt = m.id === gewaehltId;
              return (
                <li key={m.id}>
                  <Link
                    href={`/kompetenzen?modul=${m.id}${zusatz}`}
                    aria-current={gewaehlt ? "true" : undefined}
                    className={cn(
                      "flex min-h-9 items-center gap-1.5 rounded-[9px] px-3.5 text-sm whitespace-nowrap outline-none transition-[background-color,box-shadow,color] duration-150 focus-visible:ring-2 focus-visible:ring-eco-green motion-reduce:transition-none",
                      gewaehlt
                        ? "bg-white font-semibold text-eco-deep-green shadow-sm"
                        : "text-muted-foreground hover:text-eco-deep-green"
                    )}
                  >
                    {m.abgeschlossen && (
                      <>
                        <Check className="size-3.5 shrink-0 text-eco-green" strokeWidth={3} aria-hidden="true" />
                        <span className="sr-only">abgeschlossen: </span>
                      </>
                    )}
                    Modul {m.nummer}
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

/** Brief 2.3: ruhige Zeile mit Balken + "{erreicht} von {gesamt} Teilschritten in Modul {n} erreicht". */
export function ModulFortschrittZeile({
  nummer,
  erreicht,
  gesamt,
}: {
  nummer: number;
  erreicht: number;
  gesamt: number;
}) {
  if (gesamt === 0) {
    return (
      <p className="rounded-[14px] bg-off-white px-5 py-4 text-[15px] text-muted-foreground">
        Für Modul {nummer} sind noch keine Teilschritte hinterlegt.
      </p>
    );
  }
  const prozent = Math.round((erreicht / gesamt) * 100);
  return (
    <div className="flex flex-wrap items-center gap-3.5 rounded-[14px] bg-off-white px-5 py-4 text-[15px] text-muted-foreground">
      <span
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={gesamt}
        aria-valuenow={erreicht}
        aria-label={`Fortschritt in Modul ${nummer}`}
        className="h-1.5 max-w-80 flex-[1_1_260px] rounded-full bg-border"
      >
        <span className="block h-1.5 rounded-full bg-eco-green" style={{ width: `${prozent}%` }} />
      </span>
      <span>
        <span className="font-semibold text-eco-deep-green">
          {erreicht} von {gesamt} Teilschritten
        </span>{" "}
        in Modul {nummer} erreicht
      </span>
    </div>
  );
}
