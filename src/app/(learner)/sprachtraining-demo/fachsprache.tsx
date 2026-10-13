"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, CircleAlert, MessageCircle, PartyPopper, Sparkles } from "lucide-react";

import { Ring } from "@/components/fortschritts-ring";
import { FachText } from "@/components/sprachtraining/fach-text";
import { VorlesenKnopf } from "@/components/sprachtraining/vorlesen";
import { BildKnopf } from "@/components/sprachtraining/bild-knopf";
import { FACHSPRACHE_DES_TAGES as F } from "@/lib/sprachtraining-daten";
import { cn } from "@/lib/utils";

// Fachsprache des Tages (SR-31, Sprachtraining-Demo, nur demo): 5 Minuten zur
// heutigen Lektion, Schritt für Schritt -- Wortkarten mit Vorlesen, kurzes
// Quiz, Sätze für die Arbeit, Abschluss. Farbe wie Selbstlernen (Eco Green,
// Anna 2026-10-12), Lime für "jetzt", Lila für Auswahl. Stand nur auf der Seite.

const FOKUS = "outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2";
const PRIMAER = cn(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-lime px-5 text-[15px] font-bold text-on-lime transition-[filter] hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-45 [&_svg]:size-[17px] motion-reduce:transition-none",
  FOKUS
);
const ZURUECK = cn("inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[15px] font-semibold text-ink-muted hover:text-ink", FOKUS);
const KARTE = "flex flex-col gap-6 rounded-karte bg-card p-5 text-ink shadow-card md:p-7";
const EIN = "animate-in fade-in-0 slide-in-from-bottom-2 duration-300 motion-reduce:animate-none";

const SCHRITTE = ["Wörter", "Quiz", "Sätze"] as const;
type Schritt = 0 | 1 | 2 | 3;

export function FachspracheDesTages({ zurueck }: { zurueck: { href: string; label: string } }) {
  const [schritt, setSchritt] = useState<Schritt>(0);
  return (
    <div className="flex flex-col gap-5">
      <Link href={zurueck.href} className={cn("flex w-fit items-center gap-1 rounded-sm text-sm text-ink-muted hover:text-ink", FOKUS)}>
        <ArrowLeft className="size-4" aria-hidden="true" /> {zurueck.label}
      </Link>
      <div className="flex flex-col gap-2">
        <span className="inline-flex items-center gap-2 text-sm text-ink-muted">
          <MessageCircle className="size-4 text-self" aria-hidden="true" />
          Fachsprache des Tages
        </span>
        <h1 className="font-heading text-[28px] leading-tight text-ink md:text-[36px]">
          <FachText text={F.lektion} />
        </h1>
      </div>

      {/* Fortschritt: erledigt Dunkelgrün, aktuell Lime, kommend hell */}
      <ol className="grid grid-cols-3 gap-2" aria-label={`Schritt ${Math.min(schritt + 1, 3)} von 3`}>
        {SCHRITTE.map((s, i) => (
          <li key={s} className="flex flex-col gap-1.5" aria-current={i === schritt ? "step" : undefined}>
            <span className={cn("h-2 rounded-full", i < schritt ? "bg-ink" : i === schritt ? "bg-lime" : "bg-progress-track")} />
            <span className={cn("text-xs", i === schritt ? "font-bold text-ink" : "text-ink-muted")}>{s}</span>
          </li>
        ))}
      </ol>

      <div key={schritt} className={EIN}>
        {schritt === 0 && <Woerter onFertig={() => setSchritt(1)} />}
        {schritt === 1 && <Quiz onFertig={() => setSchritt(2)} onZurueck={() => setSchritt(0)} />}
        {schritt === 2 && <Saetze onFertig={() => setSchritt(3)} onZurueck={() => setSchritt(1)} />}
        {schritt === 3 && <Geschafft zurueck={zurueck} />}
      </div>
    </div>
  );
}

function Woerter({ onFertig }: { onFertig: () => void }) {
  const [nr, setNr] = useState(0);
  const karte = F.wortkarten[nr];
  const letzte = nr === F.wortkarten.length - 1;
  return (
    <section className={KARTE} aria-labelledby="wort">
      <div key={karte.id} className={cn("flex flex-col gap-5 rounded-zeile bg-self-tint p-5 md:p-6", EIN)}>
        <div className="flex items-center gap-3">
          <h2 id="wort" className="flex-1 font-heading text-[32px] leading-tight md:text-[40px]">
            {karte.wort}
          </h2>
          <BildKnopf id={karte.id} titel={karte.wort} />
          <VorlesenKnopf text={karte.wort} />
        </div>
        <p className="text-[17px] leading-relaxed">{karte.erklaerung}</p>
        <div className="flex items-start gap-3 rounded-xl bg-white p-4">
          <p className="flex-1 text-[15px] leading-relaxed italic">„{karte.beispiel}“</p>
          <VorlesenKnopf text={karte.beispiel} klein />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {nr > 0 && (
          <button type="button" onClick={() => setNr(nr - 1)} className={ZURUECK}>
            <ArrowLeft className="size-4" aria-hidden="true" /> Zurück
          </button>
        )}
        <button type="button" onClick={() => (letzte ? onFertig() : setNr(nr + 1))} className={PRIMAER}>
          {letzte ? "Weiter zum Quiz" : "Nächstes Wort"} <ArrowRight aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

function Quiz({ onFertig, onZurueck }: { onFertig: () => void; onZurueck: () => void }) {
  const [nr, setNr] = useState(0);
  const [wahl, setWahl] = useState<number | null>(null);
  const frage = F.quiz[nr];
  const richtig = wahl === frage.richtig;
  const letzte = nr === F.quiz.length - 1;
  return (
    <section className={KARTE} aria-labelledby="frage">
      <div key={frage.id} className={cn("flex flex-col gap-4 rounded-zeile bg-self-tint p-5 md:p-6", EIN)}>
        <div className="flex items-start gap-3">
          <h2 id="frage" className="flex-1 text-[22px] leading-snug font-semibold md:text-[24px]">
            {frage.frage}
          </h2>
          {frage.bild && <BildKnopf id={frage.bild} titel="Bild zur Frage" />}
        </div>
        <div className="flex flex-col gap-2" role="group" aria-labelledby="frage">
          {frage.antworten.map((a, i) => {
            const gewaehlt = wahl === i;
            return (
              <button
                key={a}
                type="button"
                aria-pressed={gewaehlt}
                disabled={richtig}
                onClick={() => setWahl(i)}
                className={cn(
                  "flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 text-left text-[16px] transition-colors motion-reduce:transition-none",
                  gewaehlt && richtig && "bg-brand font-semibold text-white",
                  gewaehlt && !richtig && "bg-white text-ink ring-2 ring-praxis-text",
                  !gewaehlt && "bg-white text-ink enabled:hover:bg-subtle disabled:opacity-60",
                  FOKUS
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn("flex size-6 flex-none items-center justify-center rounded-full border-2", gewaehlt && richtig ? "border-white bg-white text-brand" : "border-line bg-white")}
                >
                  {gewaehlt && richtig && <Check className="size-3.5" strokeWidth={3} />}
                </span>
                {a}
              </button>
            );
          })}
        </div>
        <div className="min-h-6 text-[15px]" role="status">
          {wahl !== null &&
            (richtig ? (
              <p className="flex items-start gap-2 text-ink">
                <Sparkles className="mt-0.5 size-4 flex-none text-brand" aria-hidden="true" />
                <span>
                  <span className="font-semibold">Richtig!</span> {frage.erklaerung}
                </span>
              </p>
            ) : (
              <p className="flex items-center gap-2 text-ink">
                <CircleAlert className="size-4 flex-none text-praxis-text" aria-hidden="true" /> Nicht ganz – versuch es noch einmal.
              </p>
            ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (nr > 0) {
              setNr(nr - 1);
              setWahl(F.quiz[nr - 1].richtig);
            } else onZurueck();
          }}
          className={ZURUECK}
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Zurück
        </button>
        {richtig && (
          <button
            type="button"
            onClick={() => {
              if (letzte) onFertig();
              else {
                setNr(nr + 1);
                setWahl(null);
              }
            }}
            className={cn(PRIMAER, EIN)}
          >
            {letzte ? "Weiter zu den Sätzen" : "Nächste Frage"} <ArrowRight aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}

function Saetze({ onFertig, onZurueck }: { onFertig: () => void; onZurueck: () => void }) {
  const [gehoert, setGehoert] = useState<Set<number>>(new Set());
  return (
    <section className={KARTE} aria-labelledby="saetze">
      <div className="flex flex-col gap-1">
        <h2 id="saetze" className="text-[22px] leading-snug font-semibold md:text-[24px]">
          So sagst du es bei der Arbeit
        </h2>
        <p className="text-[15px] text-ink-muted">Hör dir jeden Satz an und sprich ihn laut nach.</p>
      </div>
      <ul className="flex flex-col gap-3">
        {F.saetze.map((satz, i) => (
          <li key={satz} className={cn("flex items-center gap-3 rounded-zeile p-4", gehoert.has(i) ? "bg-self-tint" : "bg-subtle")}>
            <span onClickCapture={() => setGehoert((alt) => new Set(alt).add(i))}>
              <VorlesenKnopf text={satz} />
            </span>
            <p className="flex-1 text-[17px] leading-snug">
              <FachText text={satz} />
            </p>
            {gehoert.has(i) && <Check className="size-5 flex-none text-brand" strokeWidth={3} aria-label="angehört" />}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={onZurueck} className={ZURUECK}>
          <ArrowLeft className="size-4" aria-hidden="true" /> Zurück
        </button>
        <button type="button" onClick={onFertig} className={PRIMAER}>
          Fertig <Check aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

function Geschafft({ zurueck }: { zurueck: { href: string; label: string } }) {
  return (
    <section className={cn(KARTE, "items-center py-10 text-center")}>
      <span className="flex size-20 items-center justify-center rounded-full bg-lime text-on-lime shadow-glow-charge">
        <PartyPopper className="size-10" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1.5">
        <h2 className="font-heading text-[36px] leading-none md:text-[44px]">Fachsprache geschafft!</h2>
        <p className="text-[15px] text-ink-muted">
          {F.wortkarten.length} neue Wörter und {F.saetze.length} Sätze – genau die, die du heute im Unterricht brauchst.
        </p>
      </div>
      <div className="flex w-32 flex-col items-center gap-2">
        <Ring prozent={40} glow groesse={80} />
        <span className="text-[13px] font-semibold">Fachsprache Elektrotechnik</span>
      </div>
      <Link href={zurueck.href} className={PRIMAER}>
        {zurueck.label} <ArrowRight aria-hidden="true" />
      </Link>
    </section>
  );
}
