import Link from "next/link";

import { Ring } from "@/components/fortschritts-ring";
import { cn } from "@/lib/utils";

import { kompetenzHref } from "./tages-karten";

// Home v13 (docs/design_handoff_home_v6/design/home-v13-referenz.html, SR
// folgt): unter "Dein Tag" über die volle Breite das ganze Modul mit
// Fortschritt. Entscheidung Anna 2026-10-12: keine eigene Spalte "Heute
// stärkst du" mehr -- alle Kompetenzen gleichmäßig in einer Reihe, die
// heute gestärkten zuerst und mit Glow. Keine Teilschritte auf Home, Klick führt auf die
// Kompetenzseite.

export type RingKompetenz = {
  id: string;
  name: string;
  /** Erreichte Teilschritte / alle Teilschritte (competency_fulfilment), 0-100 */
  prozent: number;
  /** Wird durch eine heutige Aktivität gestärkt → Glow (Brief 2.4). */
  heute: boolean;
  /** Erreichte bzw. alle Teilschritte -- macht die Prozentzahl nachvollziehbar */
  teilschritteErreicht: number;
  teilschritteGesamt: number;
};

const LINK_FOKUS = "rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-brand";
const ringLabel = (k: RingKompetenz) => `${k.name}, ${k.prozent} Prozent${k.heute ? ", heute dran" : ""}`;

/**
 * Volle Breite unter "Dein Tag": alle Kompetenzen des Moduls mit Ring in
 * einer Reihe -- nachvollziehbar, auch wenn sie heute nicht dran sind. Die
 * heute gestärkten zuerst, mit Glow und fett; sonst Lehrplan-Reihenfolge.
 */
export function ModulFortschritt({ modulNummer, kompetenzen }: { modulNummer: number; kompetenzen: RingKompetenz[] }) {
  const sortiert = [...kompetenzen].sort((a, b) => Number(b.heute) - Number(a.heute));
  return (
    <section aria-labelledby="modul-fortschritt" className="flex flex-col gap-5 rounded-karte bg-card p-7 shadow-card">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="modul-fortschritt" className="text-lg font-bold text-ink">
          Im Modul {modulNummer} stärkst du:
        </h2>
        <Link href="/kompetenzen" className={cn("text-sm font-semibold text-ink hover:text-brand", LINK_FOKUS)}>
          Alle Kompetenzen →
        </Link>
      </div>
      <ul className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
        {sortiert.map((k) => (
          <li key={k.id}>
            <Link
              href={kompetenzHref(k.id)}
              aria-label={ringLabel(k)}
              // Ringe auf einer Linie, Namen oben bündig daneben (Anna 2026-10-12).
              className="flex items-start gap-3.5 rounded-xl text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-4"
            >
              <Ring prozent={k.prozent} glow={k.heute} groesse={48} />
              <span className={cn("pt-1 text-sm leading-snug", k.heute ? "font-semibold" : "font-medium")}>{k.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
