import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

import type { ModulStatus } from "@/lib/programm";
import { cn } from "@/lib/utils";

// Programmseite (docs/design_handoff_programm_v8, Brief 2.4; SR-14):
// kurzes Tracking zum gewählten Modul -- drei Kacheln, Knopf zu den Inhalten,
// Link zur Kompetenzseite. Fehlt eine Zahl, fällt ihre Kachel weg (Brief 4).

const STATUS: Record<ModulStatus, { text: string; klasse: string }> = {
  abgeschlossen: { text: "Abgeschlossen", klasse: "bg-subtle text-progress" },
  aktuell: { text: "Aktuell", klasse: "bg-lime text-on-lime" },
  kommend: { text: "Kommt noch", klasse: "bg-subtle text-ink-muted" },
};

export type Kachel = { wert: string; label: string };

export function TrackingKarte({
  ueberzeile,
  zeitraum,
  name,
  status,
  kacheln,
  inhalte,
  kompetenzenHref,
}: {
  ueberzeile: string;
  zeitraum: string | null;
  name: string;
  status: ModulStatus;
  kacheln: Kachel[];
  /** Knopf "Inhalte des Moduls" mit Seitenpanel (InhaltePanel) */
  inhalte: ReactNode;
  kompetenzenHref: string | null;
}) {
  return (
    <section aria-labelledby="tracking-titel" className="flex flex-col gap-5 rounded-karte bg-card p-5 shadow-card md:p-7">
      {/* Rückmeldung Anna 2026-10-11: ohne Überzeile "Modul 1 · Zeitraum" -- steht schon im Pfad. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 id="tracking-titel" className="text-[22px] leading-tight font-bold md:text-[24px]">
          <span className="sr-only">
            {ueberzeile}
            {zeitraum && `, ${zeitraum}`}:{" "}
          </span>
          {name}
        </h2>
        <span className={cn("rounded-full px-[9px] py-[3px] text-xs font-semibold", STATUS[status].klasse)}>{STATUS[status].text}</span>
      </div>

      {kacheln.length > 0 && (
        // Mobil (Brief 2.6) ebenfalls drei nebeneinander, nur kompakter.
        <dl className="grid grid-cols-3 divide-x divide-line border-t border-line pt-5">
          {kacheln.map((k) => (
            // Gleichmäßig (Anna 2026-10-12): jede Zahl mittig in ihrer Spalte.
            <div key={k.label} className="flex min-w-0 flex-col-reverse items-center gap-1 px-2.5 text-center sm:px-6">
              <dt className="text-[11px] leading-tight text-ink-subtle hyphens-auto break-words sm:text-[13px] sm:leading-normal">{k.label}</dt>
              <dd className="font-heading text-[26px] leading-[1.1] whitespace-nowrap tabular-nums sm:text-[36px]">{k.wert}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        {inhalte}
        {kompetenzenHref && (
          <Link
            href={kompetenzenHref}
            className="inline-flex items-center gap-1.5 rounded-sm text-sm font-semibold text-ink outline-none hover:text-brand focus-visible:ring-2 focus-visible:ring-brand"
          >
            Kompetenzen im Modul
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        )}
      </div>
    </section>
  );
}
