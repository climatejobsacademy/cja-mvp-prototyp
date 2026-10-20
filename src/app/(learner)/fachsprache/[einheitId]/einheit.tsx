"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, CircleAlert, MessageCircle, PartyPopper, RotateCcw, Sparkles } from "lucide-react";

import { KartenBild } from "@/components/fachsprache/karten-bild";
import { VorlesenKnopf } from "@/components/fachsprache/vorlesen";
import { ENTWURF_BANNER } from "@/lib/fachsprache";
import type { SeitenEinheit } from "@/lib/fachsprache-laden";
import { erklaerungSichtbar, quizSchritt, quizStart, weiterMoeglich, weiterText, type QuizAktion, type QuizZustand } from "@/lib/fachsprache-quiz";
import { cn } from "@/lib/utils";

// Fachsprache-Einheit (Stufe 2, Migration 0051, SR-84), Oberfläche nach dem
// Muster der Sprachtraining-Demo: Wörter, Quiz, Sätze, schlichter Abschluss.
// Der Zustand lebt nur im Browser-State dieser Seite: nichts wird gespeichert
// oder gezählt, kein Ergebnis, kein Ring, keine competency_evidence (Regel 6,
// docs/decisions.md 2026-10-16). Das Quiz ist freiwillig und beliebig oft
// wiederholbar. Tastatur, Focus-Ringe, Ziele ab 44 px, motion-reduce.

const FOKUS = "outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2";
const PRIMAER = cn(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-lime px-5 text-[15px] font-bold text-on-lime transition-[filter] hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-45 [&_svg]:size-[17px] motion-reduce:transition-none",
  FOKUS
);
const ZURUECK = cn("inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[15px] font-semibold text-ink-muted hover:text-ink", FOKUS);
const KARTE = "flex flex-col gap-6 rounded-karte bg-card p-5 text-ink shadow-card md:p-7";
const EIN = "animate-in fade-in-0 slide-in-from-bottom-2 duration-300 motion-reduce:animate-none";

type Ziel = { href: string; label: string };
type Schritt = "woerter" | "quiz" | "saetze" | "fertig";

const SCHRITT_LABEL: Record<Exclude<Schritt, "fertig">, string> = { woerter: "Wörter", quiz: "Quiz", saetze: "Sätze" };

export function FachspracheEinheit({ einheit, zurueck }: { einheit: SeitenEinheit; zurueck: Ziel }) {
  const schritte: Exclude<Schritt, "fertig">[] = ["woerter", "quiz", ...(einheit.saetze.length > 0 ? (["saetze"] as const) : [])];
  const [schritt, setSchritt] = useState<Schritt>("woerter");
  // Quiz-Zustand bleibt beim Wechsel zwischen den Schritten erhalten, "Wiederholen" setzt ihn zurück.
  const [quiz, quizAktion] = useReducer(
    (z: QuizZustand, a: QuizAktion) => quizSchritt(z, a, einheit.quiz),
    undefined,
    quizStart
  );

  // Beim Schrittwechsel springt der Fokus auf die Überschrift des neuen Schritts.
  const kopf = useRef<HTMLHeadingElement>(null);
  const erster = useRef(true);
  useEffect(() => {
    if (erster.current) {
      erster.current = false;
      return;
    }
    kopf.current?.focus();
  }, [schritt]);

  const nr = schritt === "fertig" ? schritte.length : schritte.indexOf(schritt);
  const danach = (von: Exclude<Schritt, "fertig">): Schritt => schritte[schritte.indexOf(von) + 1] ?? "fertig";
  const davor = (von: Exclude<Schritt, "fertig">): Schritt | null => schritte[schritte.indexOf(von) - 1] ?? null;

  return (
    <div className="flex flex-col gap-5">
      <Link href={zurueck.href} className={cn("flex min-h-11 w-fit items-center gap-1 rounded-sm text-sm text-ink-muted hover:text-ink", FOKUS)}>
        <ArrowLeft className="size-4" aria-hidden="true" /> {zurueck.label}
      </Link>

      {einheit.entwurf && (
        <div role="note" className="rounded-zeile bg-subtle px-4 py-3 text-[15px] text-ink ring-1 ring-line">
          <p className="font-semibold">{ENTWURF_BANNER}</p>
          {einheit.bilderOhneLink > 0 && (
            <p className="text-ink-muted">
              {einheit.bilderOhneLink === 1 ? "1 Bild ist nicht lesbar und wird nicht gezeigt." : `${einheit.bilderOhneLink} Bilder sind nicht lesbar und werden nicht gezeigt.`}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <span className="inline-flex items-center gap-2 text-sm text-ink-muted">
          <MessageCircle className="size-4 text-self" aria-hidden="true" />
          Fachsprache{einheit.dauerMinuten ? ` · ${einheit.dauerMinuten} Min` : ""}
        </span>
        <h1 className="font-heading text-[28px] leading-tight text-ink md:text-[36px]">{einheit.titel}</h1>
      </div>

      <ol className={cn("grid gap-2", schritte.length === 3 ? "grid-cols-3" : "grid-cols-2")} aria-label={`Schritt ${Math.min(nr + 1, schritte.length)} von ${schritte.length}`}>
        {schritte.map((s, i) => (
          <li key={s} className="flex flex-col gap-1.5" aria-current={i === nr ? "step" : undefined}>
            <span className={cn("h-2 rounded-full", i < nr ? "bg-ink" : i === nr ? "bg-lime" : "bg-progress-track")} />
            <span className={cn("text-xs", i === nr ? "font-bold text-ink" : "text-ink-muted")}>{SCHRITT_LABEL[s]}</span>
          </li>
        ))}
      </ol>

      <div key={schritt} className={EIN}>
        {schritt === "woerter" && <Woerter einheit={einheit} kopf={kopf} onFertig={() => setSchritt(danach("woerter"))} />}
        {schritt === "quiz" && (
          <Quiz
            einheit={einheit}
            kopf={kopf}
            zustand={quiz}
            aktion={quizAktion}
            onFertig={() => setSchritt(danach("quiz"))}
            onZurueck={() => setSchritt(davor("quiz") ?? "woerter")}
          />
        )}
        {schritt === "saetze" && (
          <Saetze
            einheit={einheit}
            kopf={kopf}
            onFertig={() => setSchritt("fertig")}
            onZurueck={() => setSchritt(davor("saetze") ?? "quiz")}
          />
        )}
        {schritt === "fertig" && (
          <Geschafft
            kopf={kopf}
            zurueck={zurueck}
            onQuizNochmal={() => {
              quizAktion({ typ: "wiederholen" });
              setSchritt("quiz");
            }}
          />
        )}
      </div>
    </div>
  );
}

type KopfRef = React.RefObject<HTMLHeadingElement | null>;

function Woerter({ einheit, kopf, onFertig }: { einheit: SeitenEinheit; kopf: KopfRef; onFertig: () => void }) {
  const [nr, setNr] = useState(0);
  const karte = einheit.wortkarten[nr];
  const anzahl = einheit.wortkarten.length;
  const letzte = nr === anzahl - 1;
  return (
    <section className={KARTE} aria-labelledby="wort">
      <div key={nr} className={cn("flex flex-col gap-5 rounded-zeile bg-self-tint p-5 md:p-6", EIN)}>
        <p className="text-sm text-ink-muted" aria-live="polite">
          Wort {nr + 1} von {anzahl}
        </p>
        <div className="flex items-center gap-3">
          <h2 id="wort" ref={nr === 0 ? kopf : undefined} tabIndex={-1} className="flex-1 font-heading text-[32px] leading-tight outline-none md:text-[40px]">
            {karte.wort}
          </h2>
          <VorlesenKnopf text={karte.wort} label={`Wort vorlesen: ${karte.wort}`} />
        </div>
        {karte.bild && <KartenBild bild={karte.bild} />}
        <p className="text-[17px] leading-relaxed">{karte.erklaerung}</p>
        <div className="flex items-start gap-3 rounded-xl bg-white p-4">
          <p className="flex-1 text-[15px] leading-relaxed italic">„{karte.beispiel}“</p>
          <VorlesenKnopf text={karte.beispiel} label="Beispiel vorlesen" />
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

function Quiz({
  einheit,
  kopf,
  zustand,
  aktion,
  onFertig,
  onZurueck,
}: {
  einheit: SeitenEinheit;
  kopf: KopfRef;
  zustand: QuizZustand;
  aktion: (a: QuizAktion) => void;
  onFertig: () => void;
  onZurueck: () => void;
}) {
  const anzahl = einheit.quiz.length;
  const hatSaetze = einheit.saetze.length > 0;
  // Nach der letzten richtigen Antwort und "Weiter" ist das Quiz fertig: weiter zum nächsten Schritt.
  // Der Zustand bleibt erhalten, damit "Zurück" aus den Sätzen an derselben Stelle landet.
  const frage = einheit.quiz[Math.min(zustand.nr, anzahl - 1)];
  const gruppe = `frage-${zustand.nr}`;
  const letzteFrage = zustand.nr === anzahl - 1 && (zustand.status === "richtig" || zustand.fertig);
  const weiterKnopf = letzteFrage ? (hatSaetze ? "Weiter zu den Sätzen" : "Fertig") : weiterText(zustand, anzahl);
  return (
    <section className={KARTE} aria-labelledby={gruppe}>
      <div key={zustand.nr} className={cn("flex flex-col gap-4 rounded-zeile bg-self-tint p-5 md:p-6", EIN)}>
        <p className="text-sm text-ink-muted" aria-live="polite">
          Frage {zustand.nr + 1} von {anzahl}
        </p>
        <h2 id={gruppe} ref={kopf} tabIndex={-1} className="text-[22px] leading-snug font-semibold outline-none md:text-[24px]">
          {frage.frage}
        </h2>
        {frage.bild && <KartenBild bild={frage.bild} />}
        <div role="radiogroup" aria-labelledby={gruppe} className="flex flex-col gap-2">
          {frage.antworten.map((a, i) => {
            const gewaehlt = zustand.wahl === i;
            const richtig = zustand.status === "richtig" && gewaehlt;
            return (
              <label
                key={i}
                className={cn(
                  "flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-left text-[16px] transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand has-[:focus-visible]:ring-offset-2 motion-reduce:transition-none",
                  richtig ? "bg-brand font-semibold text-white" : gewaehlt ? "bg-white text-ink ring-2 ring-brand" : "bg-white text-ink hover:bg-subtle",
                  zustand.status === "richtig" && !gewaehlt && "cursor-default opacity-60"
                )}
              >
                <input
                  type="radio"
                  name={gruppe}
                  checked={gewaehlt}
                  disabled={zustand.status === "richtig"}
                  onChange={() => aktion({ typ: "waehlen", antwort: i })}
                  className="peer sr-only"
                />
                <span
                  aria-hidden="true"
                  className={cn("flex size-6 flex-none items-center justify-center rounded-full border-2", richtig ? "border-white bg-white text-brand" : "border-line bg-white")}
                >
                  {richtig && <Check className="size-3.5" strokeWidth={3} />}
                </span>
                {a}
              </label>
            );
          })}
        </div>
        <div className="min-h-6 text-[15px]" role="status" aria-live="polite">
          {zustand.status === "falsch" && (
            <p className="flex items-center gap-2 text-ink">
              <CircleAlert className="size-4 flex-none text-praxis-text" aria-hidden="true" /> Nicht ganz – versuch es noch einmal.
            </p>
          )}
          {erklaerungSichtbar(zustand) && (
            <p className="flex items-start gap-2 text-ink">
              <Sparkles className="mt-0.5 size-4 flex-none text-brand" aria-hidden="true" />
              <span>
                <span className="font-semibold">Richtig!</span> {frage.erklaerung}
              </span>
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => (zustand.nr > 0 ? aktion({ typ: "zurueck" }) : onZurueck())} className={ZURUECK}>
          <ArrowLeft className="size-4" aria-hidden="true" /> Zurück
        </button>
        <button
          type="button"
          disabled={!zustand.fertig && !weiterMoeglich(zustand)}
          onClick={() => {
            // Schon fertig (z. B. zurück aus den Sätzen): einfach weiter.
            if (zustand.fertig) return onFertig();
            const naechster = quizSchritt(zustand, { typ: "weiter" }, einheit.quiz);
            aktion({ typ: "weiter" });
            if (naechster.fertig) onFertig();
          }}
          className={PRIMAER}
        >
          {weiterKnopf} <ArrowRight aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

function Saetze({ einheit, kopf, onFertig, onZurueck }: { einheit: SeitenEinheit; kopf: KopfRef; onFertig: () => void; onZurueck: () => void }) {
  return (
    <section className={KARTE} aria-labelledby="saetze">
      <div className="flex flex-col gap-1">
        <h2 id="saetze" ref={kopf} tabIndex={-1} className="text-[22px] leading-snug font-semibold outline-none md:text-[24px]">
          So sagst du es bei der Arbeit
        </h2>
        <p className="text-[15px] text-ink-muted">Hör dir jeden Satz an und sprich ihn laut nach.</p>
      </div>
      <ul className="flex flex-col gap-3">
        {einheit.saetze.map((satz, i) => (
          <li key={i} className="flex items-center gap-3 rounded-zeile bg-subtle p-4">
            <VorlesenKnopf text={satz} label={`Satz ${i + 1} vorlesen`} />
            <p className="flex-1 text-[17px] leading-snug">{satz}</p>
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

function Geschafft({ kopf, zurueck, onQuizNochmal }: { kopf: KopfRef; zurueck: Ziel; onQuizNochmal: () => void }) {
  return (
    <section className={cn(KARTE, "items-center py-10 text-center")} aria-labelledby="geschafft">
      <span className="flex size-20 items-center justify-center rounded-full bg-lime text-on-lime shadow-glow-charge" aria-hidden="true">
        <PartyPopper className="size-10" />
      </span>
      <h2 id="geschafft" ref={kopf} tabIndex={-1} className="font-heading text-[36px] leading-none outline-none md:text-[44px]">
        Geschafft!
      </h2>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={onQuizNochmal} className={cn(ZURUECK, "border border-line")}>
          <RotateCcw className="size-4" aria-hidden="true" /> Quiz wiederholen
        </button>
        <Link href={zurueck.href} className={PRIMAER}>
          {zurueck.label} <ArrowRight aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
