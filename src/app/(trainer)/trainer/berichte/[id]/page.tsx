import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { datumKurz, zeitpunktInBerlin } from "@/lib/date";
import { berichtStand, STAND_TEXT } from "@/lib/praxisbericht";
import { getPraxisbericht } from "@/lib/queries/trainer-berichte";
import { requireCurrentTrainer } from "@/lib/queries/trainer-bereich";
import { cn } from "@/lib/utils";

import { STAND_FARBE } from "../stand-farbe";
import { PruefFormular } from "./pruef-formular";

// Ein Praxisbericht (SR-82, Paket G3): was die Person eingereicht hat, welche
// Teilschritte er belegt, bisherige Entscheidungen und Freigeben/Zurückgeben.

const KARTE = "rounded-karte bg-white p-4 shadow-card md:p-5";

export default async function Bericht({ params }: { params: Promise<{ id: string }> }) {
  const trainer = await requireCurrentTrainer();
  const { id } = await params;
  const bericht = await getPraxisbericht(id, trainer.personId);
  if (!bericht) notFound();
  const stand = berichtStand(bericht.aktuell);

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/trainer/berichte"
        className="flex min-h-11 items-center gap-1 self-start rounded-lg text-sm text-ink-muted outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-brand"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Alle Praxisberichte
      </Link>
      <PageHeader title={bericht.name} />

      <section className="rounded-karte border-l-[3px] border-l-praxis bg-praxis-tint p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold text-ink">{bericht.titel}</h2>
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", STAND_FARBE[stand])}>{STAND_TEXT[stand]}</span>
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          {[bericht.datum && datumKurz(bericht.datum), bericht.standort, `eingereicht ${zeitpunktInBerlin(bericht.eingereichtAm)}`]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </section>

      <section className={KARTE} aria-labelledby="durchfuehrung">
        <h2 id="durchfuehrung" className="text-sm font-semibold text-ink">
          Durchführung
        </h2>
        <p className="mt-1 text-sm text-ink">
          {bericht.ergebnis === "problem" ? "Problem gemeldet" : bericht.ergebnis === "erledigt" ? "Erledigt" : "Nicht bestätigt"}
        </p>
        {bericht.problemBeschreibung && <p className="mt-1 text-sm whitespace-pre-line text-ink-muted">{bericht.problemBeschreibung}</p>}
        {bericht.text && <p className="mt-3 text-sm whitespace-pre-line text-ink">{bericht.text}</p>}
      </section>

      {bericht.antworten.length > 0 && (
        <section className={KARTE} aria-labelledby="reflexion">
          <h2 id="reflexion" className="text-sm font-semibold text-ink">
            Reflexion
          </h2>
          <dl className="mt-2 flex flex-col gap-3">
            {bericht.antworten.map((a, i) => (
              <div key={i}>
                <dt className="text-xs text-ink-muted">{a.frage}</dt>
                <dd className="text-sm font-semibold text-ink">{a.antwort}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {bericht.teilschritte.length > 0 && (
        <section className={KARTE} aria-labelledby="teilschritte">
          <h2 id="teilschritte" className="text-sm font-semibold text-ink">
            Belegt diese Teilschritte
          </h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-ink">
            {bericht.teilschritte.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-muted">Sie zählen für die Kompetenzen, sobald der Bericht freigegeben ist.</p>
        </section>
      )}

      <PruefFormular captureId={bericht.id} aktuell={bericht.aktuell} />

      {bericht.verlauf.length > 0 && (
        <section className={KARTE} aria-labelledby="verlauf">
          <h2 id="verlauf" className="text-sm font-semibold text-ink">
            Verlauf
          </h2>
          <ol className="mt-2 flex flex-col gap-2">
            {bericht.verlauf.map((v) => (
              <li key={v.id} className={cn("text-sm", v.storniert ? "text-ink-subtle line-through" : "text-ink")}>
                {v.entscheidung === "verified" ? "Freigegeben" : "Zurückgegeben"} am {zeitpunktInBerlin(v.am)}
                {v.vonMir && " (von dir)"}
                {v.storniert && <span className="sr-only"> (korrigiert)</span>}
                {v.kommentar && <span className="block text-xs text-ink-muted no-underline">„{v.kommentar}“</span>}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
