import Link from "next/link";

import type { ModulMitZeitraum } from "@/lib/queries/modul";
import { Ring } from "@/components/fortschritts-ring";
import { cn } from "@/lib/utils";

import { kompetenzHref } from "./tages-karten";

// Home v13 (docs/design_handoff_home_v6/design/home-v13-referenz.html;
// SR-73), Stand demo (Entscheidung Anna 2026-10-12): keine rechte Spalte
// "Heute stärkst du" mehr -- unter "Dein Tag" über die volle Breite das ganze
// Modul mit Fortschritt, heute gestärkte Kompetenzen zuerst mit Glow. Keine
// Teilschritte auf Home, Klick führt auf die Kompetenzseite. Modul und seine
// Kompetenzen aus der Modul-Ebene (0028, modul_competency), Überzeile wie
// "Modul I" statt einer gezählten Nummer.

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
/** "Im Modul I stärkst du:"; beim Abschluss "Bei Prüfungsvorbereitung stärkst du:". */
const ueberschrift = (m: ModulMitZeitraum) =>
  m.ueberzeile.startsWith("Modul") ? `Im ${m.ueberzeile} stärkst du:` : `Bei ${m.name} stärkst du:`;
const ringLabel = (k: RingKompetenz) => `${k.name}, ${k.prozent} Prozent${k.heute ? ", heute dran" : ""}`;

/**
 * Volle Breite unter "Dein Tag": alle Kompetenzen des Moduls mit Ring und
 * Prozentzahl -- nachvollziehbar, auch wenn sie heute nicht dran sind.
 * Heute gestärkte zuerst, mit Glow und fett; sonst Lehrplan-Reihenfolge.
 */
export function ModulFortschritt({ modul, kompetenzen }: { modul: ModulMitZeitraum; kompetenzen: RingKompetenz[] }) {
  const sortiert = [...kompetenzen].sort((a, b) => Number(b.heute) - Number(a.heute));
  return (
    <section aria-labelledby="modul-fortschritt" className="flex flex-col gap-5 rounded-karte bg-card p-7 shadow-card">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="modul-fortschritt" className="text-lg font-bold text-ink">
          {ueberschrift(modul)}
        </h2>
        <Link href="/kompetenzen" className={cn("text-sm font-semibold text-ink hover:text-brand", LINK_FOKUS)}>
          Alle Kompetenzen →
        </Link>
      </div>
      {/* Bis zum Import (modul_competency leer): ruhiger Hinweis statt leerer Liste. */}
      {sortiert.length === 0 && (
        <p className="text-sm text-ink-muted">Die Kompetenzen dieses Moduls werden gerade hinterlegt.</p>
      )}
      <ul className="grid grid-cols-1 gap-x-8 gap-y-5 empty:hidden sm:grid-cols-2 lg:grid-cols-4">
        {sortiert.map((k) => (
          <li key={k.id}>
            <Link
              href={kompetenzHref(k.id)}
              aria-label={ringLabel(k)}
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
