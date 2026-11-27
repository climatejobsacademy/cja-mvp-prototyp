import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { heuteInBerlin, montagDerWoche } from "@/lib/date";
import { wocheParam } from "@/lib/glossar";
import { getGlossarWoche } from "@/lib/queries/fachsprache";
import { getWocheDerPerson } from "@/lib/queries/schedule";
import { zeitraumText } from "@/lib/stundenplan";

import { DruckenKnopf } from "./drucken-knopf";

/**
 * Glossar der Woche (SR-101): alle Fachwörter der veröffentlichten
 * Fachsprache-Einheiten zu den Live-Lektionen einer Stundenplan-Woche,
 * alphabetisch, jedes Wort einmal, mit Erklärung und Beispielsatz, ohne Bilder.
 * Gedruckt bzw. als PDF gespeichert wird über den Browser; Navigation und Knöpfe
 * erscheinen nicht im Druck. Schalter FACHSPRACHE_EINHEIT aus: 404. Es wird
 * nicht erfasst, wer druckt.
 */
export default async function GlossarSeite({
  searchParams,
}: {
  searchParams: Promise<{ woche?: string | string[] }>;
}) {
  const { woche } = await searchParams;
  const montag = montagDerWoche(wocheParam(woche) ?? heuteInBerlin());
  const tage = await getWocheDerPerson(montag);
  const woerter = await getGlossarWoche(tage);
  if (woerter === null) notFound();

  const zeitraum = zeitraumText(montag);
  return (
    <article className="flex flex-col gap-6 text-ink print:gap-4">
      <Link
        href={`/schedule?ansicht=woche&datum=${montag}`}
        className="flex min-h-11 w-fit items-center gap-1 text-sm text-ink-muted outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-brand print:hidden"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Zurück zum Stundenplan
      </Link>
      <header className="flex flex-col gap-2">
        <p className="text-sm text-ink-muted">Fachsprache</p>
        <h1 className="font-heading text-[32px] leading-tight md:text-[40px] print:text-[24pt]">Glossar der Woche</h1>
        <p className="text-[15px] text-ink-muted">{zeitraum}</p>
      </header>
      {woerter.length > 0 && <DruckenKnopf />}
      {woerter.length === 0 ? (
        <p className="text-[15px] text-ink-muted">In dieser Woche gibt es keine Fachwörter.</p>
      ) : (
        <dl className="flex flex-col divide-y divide-line rounded-karte bg-card px-5 shadow-card print:rounded-none print:px-0 print:shadow-none">
          {woerter.map((w) => (
            <div key={w.wort} className="flex flex-col gap-1 py-4 break-inside-avoid print:py-2">
              <dt className="text-[17px] font-bold print:text-[12pt]">{w.wort}</dt>
              <dd className="text-[15px] leading-relaxed print:text-[11pt]">{w.erklaerung}</dd>
              {w.beispiel && <dd className="text-[15px] text-ink-muted italic print:text-[11pt]">„{w.beispiel}“</dd>}
            </div>
          ))}
        </dl>
      )}
    </article>
  );
}
