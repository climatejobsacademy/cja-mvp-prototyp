import Link from "next/link";
import { ArrowLeft, FlaskConical, Link2 } from "lucide-react";

import { FOKUS } from "@/components/praxisflow/stile";
import { TrainerZeile } from "@/components/trainer-zeile";
import { datumLang } from "@/lib/date";
import type { LabortagDaten } from "@/lib/queries/labortag";
import { cn } from "@/lib/utils";

import { DateiVorschau } from "./praxisflow-dateien";

/**
 * Labortag (SR-94): kein Praxisflow, nur lesen. Kopf mit Tag, Uhrzeit, Ort
 * und Trainer:in wie beim Praxisauftrag, darunter die Unterlagen der Aufgabe
 * (SR-68) direkt in der Vorschau; Links öffnen im neuen Tab.
 */
export function LabortagSeite({ daten, zurueck }: { daten: LabortagDaten; zurueck: { href: string; label: string } }) {
  const zeit = daten.start && daten.ende ? `${daten.start.slice(0, 5)} – ${daten.ende.slice(0, 5)} Uhr` : "ganztägig";
  const { dateien, links } = daten.unterlagen;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Link href={zurueck.href} className={cn("inline-flex w-fit items-center gap-1 rounded-sm text-sm text-ink-muted hover:text-ink", FOKUS)}>
          <ArrowLeft className="size-4" aria-hidden="true" /> {zurueck.label}
        </Link>
        <span className="text-sm text-ink-muted">Labortag · {daten.titel}</span>
      </div>
      <section className="flex flex-col gap-2 rounded-karte border-l-[3px] border-l-praxis bg-praxis-tint p-4 text-ink shadow-card md:px-6">
        <span className="inline-flex items-center gap-2 text-sm font-semibold">
          <FlaskConical className="size-4 shrink-0 text-praxis-text" aria-hidden="true" />
          Labortag
        </span>
        <h1 className="text-[22px] leading-tight font-semibold md:text-[26px]">{daten.titel}</h1>
        <p className="text-[15px]">
          {datumLang(daten.datum)} · {zeit}
          {daten.standort ? ` · ${daten.standort}` : ""}
        </p>
        {daten.trainer && <TrainerZeile art="praxis" trainer={daten.trainer} zweite={daten.trainer2} />}
        {daten.beschreibung && <p className="text-[15px]">{daten.beschreibung}</p>}
      </section>
      <section aria-labelledby="labortag-unterlagen" className="flex flex-col gap-3">
        <h2 id="labortag-unterlagen" className="text-base font-bold text-ink">
          Unterlagen
        </h2>
        {dateien.length === 0 && links.length === 0 ? (
          <p className="rounded-zeile bg-subtle p-4 text-[15px] text-ink-muted">Für diesen Labortag sind noch keine Unterlagen hinterlegt.</p>
        ) : (
          <>
            {dateien.length > 0 && <DateiVorschau dateien={dateien} />}
            {links.length > 0 && (
              <ul className="flex flex-col gap-2">
                {links.map((l) => (
                  <li key={l.id} className="flex items-center gap-3 rounded-zeile bg-subtle px-4 py-2.5 text-[15px] text-ink">
                    <Link2 className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className={cn("min-w-0 flex-1 truncate underline-offset-2 hover:underline", FOKUS)}>
                      {l.titel}
                      <span className="sr-only"> (externer Link, öffnet in neuem Tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </div>
  );
}
