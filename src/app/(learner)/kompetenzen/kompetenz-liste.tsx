import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Ring } from "@/components/fortschritts-ring";
import { cn } from "@/lib/utils";

// Kompetenzseite v1 (docs/design_handoff_kompetenzen_v1, Brief 2.4 + 3, SR
// folgt; Zähler wie SR-61/63). Entscheidung Anna 2026-10-12: alle
// Kompetenzen des gewählten Moduls als Kacheln über die Seite verteilt; ein
// Klick öffnet die eigene Detailansicht (?kompetenz=…, damit Home direkt
// auf eine Kompetenz verlinken kann).

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
  zusatz,
}: {
  modulId: string;
  modulNummer: number;
  kompetenzen: ListenKompetenz[];
  /** Weitere Query-Parameter, z. B. "&now=…" zum Testen */
  zusatz: string;
}) {
  if (kompetenzen.length === 0) {
    return (
      <p className="text-[15px] text-ink-muted">Für Modul {modulNummer} sind noch keine Kompetenzen hinterlegt.</p>
    );
  }
  return (
    <section aria-label={`Kompetenzen in Modul ${modulNummer}`}>
      {/* Gleichmäßige Reihen (Anna 2026-10-12): drei Spalten nur, wenn die
          Zahl aufgeht (3, 6, 9 …), sonst zwei -- 4 also als 2 × 2. */}
      <ul
        className={cn(
          "grid grid-cols-1 gap-4 sm:grid-cols-2",
          kompetenzen.length % 3 === 0 && "lg:grid-cols-3"
        )}
      >
        {kompetenzen.map((k) => (
          <li key={k.id} className="flex">
            <Link
              href={`/kompetenzen?modul=${modulId}&kompetenz=${k.id}${zusatz}`}
              // Übersicht bleibt, wo sie war -- das Panel legt sich darüber.
              scroll={false}
              className="flex w-full items-center gap-4 rounded-karte bg-card px-5 py-5 text-ink shadow-card outline-none transition-[background-color] duration-150 hover:bg-subtle focus-visible:ring-2 focus-visible:ring-brand motion-reduce:transition-none"
            >
              <Ring prozent={k.prozent} glow={k.heute} groesse={56} />
              <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <span className={cn("text-base leading-snug", k.heute ? "font-semibold" : "font-medium")}>
                  {k.name}
                  {k.heute && <span className="sr-only"> · heute dran</span>}
                </span>
                {k.gesamt > 0 && (
                  <span className="text-[13px] text-ink-muted">
                    {k.erreicht} von {k.gesamt} Kompetenzschritten
                  </span>
                )}
              </span>
              <ChevronRight className="size-[18px] shrink-0 text-ink-muted" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
