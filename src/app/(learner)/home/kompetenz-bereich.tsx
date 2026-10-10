import Link from "next/link";

import type { AktuellesModul } from "@/lib/queries/home-modul";
import { Ring, type RingGroesse } from "@/components/fortschritts-ring";
import { cn } from "@/lib/utils";

import { kompetenzHref } from "./tages-karten";

// Home v13 (docs/design_handoff_home_v6/design/home-v13-referenz.html, SR
// folgt), Variante C (Entscheidung Anna 2026-10-10): rechts neben "Dein Tag"
// nur die heute gestärkten Kompetenzen, darunter über die volle Breite das
// ganze Modul mit Fortschritt -- heute im Blick und trotzdem vollständig
// nachvollziehbar. Keine Teilschritte auf Home, Klick führt auf die
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

const LINK_FOKUS = "rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-eco-green";
const ringLabel = (k: RingKompetenz) => `${k.name}, ${k.prozent} Prozent${k.heute ? ", heute dran" : ""}`;

/**
 * Rechte Spalte neben "Dein Tag": die heute gestärkten Kompetenzen groß
 * (1 → 84 px, 2 → je 64 px, höchstens 2). Gibt es heute keine, die zuletzt
 * geübte als "Zuletzt dran" ohne Glow. Die Seite blendet die Spalte aus,
 * wenn es beides nicht gibt.
 * Entscheidung Anna 2026-10-10 (Option 1): das Panel ist nur so hoch wie
 * sein Inhalt (kein leerer Rahmen) und nennt je Kompetenz die erreichten
 * Teilschritte.
 */
export function HeuteSpalte({
  modul,
  programmName,
  kompetenzen,
  zuletzt,
}: {
  modul: AktuellesModul;
  programmName: string;
  /** Heute gestärkte Kompetenzen des Moduls */
  kompetenzen: RingKompetenz[];
  /** Ersatz, wenn heute keine: zuletzt geübte Kompetenz */
  zuletzt: RingKompetenz | null;
}) {
  const gross = kompetenzen.length > 0 ? kompetenzen.slice(0, 2) : zuletzt ? [zuletzt] : [];
  const groesse: RingGroesse = gross.length === 1 ? 84 : 64;
  const mehr = kompetenzen.length - gross.length;
  return (
    <aside aria-labelledby="heute-kompetenzen" className="flex min-w-0 flex-col gap-4 self-start">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="heute-kompetenzen" className="text-xl font-bold text-eco-deep-green">
          {kompetenzen.length > 0 ? "Heute stärkst du" : "Zuletzt dran"}
        </h2>
        <Link href="/kompetenzen" className={cn("text-sm text-muted-foreground hover:text-eco-deep-green", LINK_FOKUS)}>
          Alle →
        </Link>
      </div>
      <div className="flex flex-col gap-[22px] rounded-[20px] border border-border p-7 text-eco-deep-green">
        <div className="flex flex-col gap-1">
          {programmName.trim() && (
            <span className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              {programmName}
            </span>
          )}
          <span className="font-heading text-2xl leading-tight">Modul {modul.nummer}</span>
        </div>
        <ul className="flex flex-col gap-4">
          {gross.map((k) => (
            <li key={k.id}>
              <Link
                href={kompetenzHref(k.id)}
                aria-label={ringLabel(k)}
                className="flex items-center gap-[18px] rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-eco-green focus-visible:ring-offset-4"
              >
                <Ring prozent={k.prozent} glow={k.heute} groesse={groesse} />
                <span className="flex flex-col gap-1">
                  <span className={cn("leading-snug font-semibold", groesse === 84 ? "text-[17px]" : "text-[15px]")}>
                    {k.name}
                  </span>
                  {k.teilschritteGesamt > 0 && (
                    <span className="text-[13px] text-muted-foreground">
                      {k.teilschritteErreicht} von {k.teilschritteGesamt} Teilschritten erreicht
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {mehr > 0 && (
          <p className="text-[13px] text-muted-foreground">
            + {mehr} weitere heute, siehe Fortschritt unten
          </p>
        )}
      </div>
    </aside>
  );
}

/**
 * Volle Breite unter "Dein Tag": alle Kompetenzen des Moduls mit Ring und
 * Prozentzahl -- nachvollziehbar, auch wenn sie heute nicht dran sind.
 * Heute gestärkte zuerst, mit Glow und fett; sonst Lehrplan-Reihenfolge.
 */
export function ModulFortschritt({ modul, kompetenzen }: { modul: AktuellesModul; kompetenzen: RingKompetenz[] }) {
  const sortiert = [...kompetenzen].sort((a, b) => Number(b.heute) - Number(a.heute));
  return (
    <section aria-labelledby="modul-fortschritt" className="flex flex-col gap-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="modul-fortschritt" className="text-xl font-bold text-eco-deep-green">
          Dein Fortschritt in Modul {modul.nummer}
        </h2>
        <Link href="/kompetenzen" className={cn("text-sm text-muted-foreground hover:text-eco-deep-green", LINK_FOKUS)}>
          Alle Kompetenzen →
        </Link>
      </div>
      <ul className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
        {sortiert.map((k) => (
          <li key={k.id}>
            <Link
              href={kompetenzHref(k.id)}
              aria-label={ringLabel(k)}
              className="flex items-center gap-3.5 rounded-xl text-eco-deep-green outline-none focus-visible:ring-2 focus-visible:ring-eco-green focus-visible:ring-offset-4"
            >
              <Ring prozent={k.prozent} glow={k.heute} groesse={48} />
              <span className={cn("text-sm leading-snug", k.heute ? "font-semibold" : "font-medium")}>{k.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
