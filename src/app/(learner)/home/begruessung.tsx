import { FlaskConical } from "lucide-react";

import { ProgrammZeile } from "@/components/programm-zeile";
import { datumKurz, datumLang } from "@/lib/date";

// Home v12 (docs/design_handoff_home_v6, Brief 2.2, SR folgt): Programm,
// "Hallo {Vorname}" und Datum, darüber ggf. der Hinweis auf die simulierte
// Testzeit (?now). Kein Tagestyp-Label mehr (Entscheidung Anna 2026-10-12),
// die Fokus-Karte zeigt die Art schon.

export function TestzeitHinweis({ heute, jetzt }: { heute: string; jetzt: string }) {
  return (
    <p className="-mb-4 inline-flex items-center gap-2 self-start rounded-full bg-brand-tint px-3 py-1 text-[13px] text-ink md:-mb-6">
      <FlaskConical className="size-4 shrink-0 text-brand" aria-hidden="true" />
      Testansicht: simulierte Zeit {datumKurz(heute)}, {jetzt.slice(11, 16)} Uhr
    </p>
  );
}

export function Begruessung({
  vorname,
  programmName,
  heute,
}: {
  vorname: string;
  /** Entscheidung Anna 2026-10-12: Home zeigt, in welchem Programm man ist. */
  programmName: string;
  heute: string;
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <ProgrammZeile name={programmName} />
      <h1 className="font-heading text-[40px] leading-none text-ink md:text-[52px]">
        {vorname ? `Hallo ${vorname}` : "Hallo"}
      </h1>
      <p className="text-sm text-ink-subtle">{datumLang(heute)}</p>
    </section>
  );
}
