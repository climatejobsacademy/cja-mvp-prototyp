import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

import type { ModulStatus } from "@/lib/programm";
import { cn } from "@/lib/utils";

// Programmseite v8 (docs/design_handoff_programm_v8, Brief 2.4, SR folgt):
// kurzes Tracking zum gewählten Modul -- drei Kacheln, Knopf zu den Inhalten,
// Link zur Kompetenzseite. Fehlt eine Zahl, fällt ihre Kachel weg (Brief 4).

const STATUS: Record<ModulStatus, { text: string; klasse: string }> = {
  abgeschlossen: { text: "Abgeschlossen", klasse: "bg-success text-eco-deep-green" },
  aktuell: { text: "Aktuell", klasse: "bg-eco-deep-green text-white" },
  kommend: { text: "Kommt noch", klasse: "bg-off-white text-muted-foreground" },
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
    <section aria-labelledby="tracking-titel" className="flex flex-col gap-5 rounded-[20px] border border-border p-5 md:p-7">
      {/* Rückmeldung Anna 2026-10-11: ohne Überzeile "Modul 1 · Zeitraum" -- steht schon im Pfad. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 id="tracking-titel" className="font-heading text-[28px] leading-[1.1]">
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
        <dl className="grid grid-cols-3 gap-2 sm:gap-3">
          {kacheln.map((k) => (
            <div key={k.label} className="flex min-w-0 flex-col-reverse gap-1 rounded-[14px] bg-off-white px-2.5 py-3 sm:p-[18px]">
              <dt className="text-[11px] leading-tight text-muted-foreground hyphens-auto break-words sm:text-[13px] sm:leading-normal">{k.label}</dt>
              <dd className="font-heading text-[22px] leading-[1.1] whitespace-nowrap tabular-nums sm:text-[30px]">{k.wert}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        {inhalte}
        {kompetenzenHref && (
          <Link
            href={kompetenzenHref}
            className="inline-flex items-center gap-1.5 rounded-sm text-sm font-semibold outline-none hover:text-eco-green focus-visible:ring-2 focus-visible:ring-eco-green"
          >
            Kompetenzen im Modul
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        )}
      </div>
    </section>
  );
}
