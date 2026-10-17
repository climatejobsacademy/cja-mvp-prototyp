"use client";

/* eslint-disable @next/next/no-img-element -- Medien kommen über die eigene
   Route aus dem privaten Paket (Session-Cookie); next/image würde sie über
   den Bild-Optimierer ohne Session laden. */

import { useEffect, useImperativeHandle, useRef, useState, useTransition, type ReactNode, type RefObject } from "react";
import { ArrowLeft, ArrowRight, Check, Pause, PartyPopper, ThumbsDown, ThumbsUp, Volume2, X } from "lucide-react";

import { schrittBilder, schrittFrage, type Baustein, type Lernkurs, type Schritt, type TextKnoten } from "@/lib/lernkurs";
import { cn } from "@/lib/utils";

import { markLessonComplete } from "./actions";

// Native Selbstlern-Ansicht (SR-85): zeigt einen Lernkurs (eigenes Format,
// src/lib/lernkurs.ts) Schritt für Schritt im Plattform-Design statt im
// SCORM-Fenster. Farben wie die Fachsprache: Selbstlernen Eco Green, Lime
// für "jetzt" und den Hauptknopf, Dunkelgrün für Fortschritt. Fragen:
// auswählen, "Prüfen"; falsch -> neu wählen, richtig -> Erklärung, dann
// weiter. Der Stand der Schritte lebt nur auf der Seite; gespeichert wird
// nur der Abschluss der Lektion (markLessonComplete -> unit_progress), sobald
// das letzte Kapitel abgeschlossen ist -- einmal je Seitenaufruf, nicht bei
// schon abgeschlossener Lektion.

const FOKUS = "outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2";
const PRIMAER = cn(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-lime px-5 text-[15px] font-bold text-on-lime transition-[filter] hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-45 [&_svg]:size-[17px] motion-reduce:transition-none",
  FOKUS
);
const ZURUECK = cn("inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[15px] font-semibold text-ink-muted hover:text-ink disabled:invisible", FOKUS);
const EIN = "animate-in fade-in-0 slide-in-from-bottom-2 duration-300 motion-reduce:animate-none";
const FLAECHE = "flex flex-col gap-5 rounded-zeile bg-self-tint p-5 md:p-6";

type Medium = (schluessel: string) => string;

export function NativeLektion({ lessonId, kurs, done }: { lessonId: string; kurs: Lernkurs; done: boolean }) {
  const [kap, setKap] = useState(0);
  const [schritt, setSchritt] = useState(0);
  const [geloest, setGeloest] = useState<Set<string>>(new Set());
  const [geschafft, setGeschafft] = useState<Set<number>>(new Set());
  const [ansicht, setAnsicht] = useState<"schritt" | "kapitel-geschafft" | "geschafft">("schritt");
  const [abschlussFehler, setAbschlussFehler] = useState(false);
  const [speichert, startTransition] = useTransition();
  const abgeschlossenRef = useRef(done);
  const oben = useRef<HTMLDivElement>(null);
  const pruefRef = useRef<Pruefer | null>(null);

  const medium: Medium = (schluessel) => `/content/${lessonId}/medium?pfad=${encodeURIComponent(schluessel)}`;
  const kapitel = kurs.kapitel[kap];
  const aktuell = kapitel.schritte[schritt];
  const frageOffen = schrittFrage(aktuell) !== null && !geloest.has(aktuell.id);
  const gesamt = kurs.kapitel.reduce((s, k) => s + k.schritte.length, 0);
  // Prozent: abgeschlossene Kapitel plus Schritte im aktuellen Kapitel.
  const erledigt = kurs.kapitel.reduce((s, k, i) => s + (geschafft.has(i) ? k.schritte.length : 0), 0);
  const prozent =
    ansicht === "geschafft" ? 100 : Math.min(100, Math.round(((erledigt + (geschafft.has(kap) ? 0 : schritt)) / gesamt) * 100));
  const letzterKap = kap === kurs.kapitel.length - 1;

  function nachOben() {
    oben.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /** Lektion abschließen (SR-85, Regel 6: Nachweis nur über unit_progress) -- höchstens einmal. */
  function abschliessen() {
    if (abgeschlossenRef.current) return;
    abgeschlossenRef.current = true;
    setAbschlussFehler(false);
    startTransition(async () => {
      const ergebnis = await markLessonComplete(lessonId);
      if (!ergebnis.ok) {
        abgeschlossenRef.current = false;
        setAbschlussFehler(true);
      }
    });
  }

  function weiter() {
    // Frage noch nicht richtig beantwortet: der Knopf prüft erst.
    if (frageOffen) {
      pruefRef.current?.pruefen();
      return;
    }
    if (schritt < kapitel.schritte.length - 1) setSchritt(schritt + 1);
    else {
      setGeschafft((alt) => new Set(alt).add(kap));
      if (!letzterKap) setAnsicht("kapitel-geschafft");
      else {
        setAnsicht("geschafft");
        abschliessen();
      }
    }
    nachOben();
  }

  function zurueck() {
    if (schritt > 0) setSchritt(schritt - 1);
    else if (kap > 0) {
      setKap(kap - 1);
      setSchritt(kurs.kapitel[kap - 1].schritte.length - 1);
    }
    nachOben();
  }

  function zuKapitel(i: number) {
    setKap(i);
    setSchritt(0);
    setAnsicht("schritt");
    nachOben();
  }

  const loesen = (id: string) => setGeloest((alt) => new Set(alt).add(id));

  // Bilder der nächsten drei Schritte schon im Hintergrund laden; beim
  // Weiterblättern abbrechen (src leeren bricht den Ladevorgang ab).
  useEffect(() => {
    const alle = kurs.kapitel.flatMap((k) => k.schritte);
    const start = kurs.kapitel.slice(0, kap).reduce((s, k) => s + k.schritte.length, 0) + schritt;
    const bilder = alle.slice(start + 1, start + 4).flatMap(schrittBilder).map((schluessel) => {
      const img = new Image();
      img.src = `/content/${lessonId}/medium?pfad=${encodeURIComponent(schluessel)}`;
      return img;
    });
    return () => {
      for (const img of bilder) img.src = "";
    };
  }, [kurs, kap, schritt, lessonId]);

  return (
    <div ref={oben} className="flex scroll-mt-24 flex-col gap-5">
      {/* Fortschritt: Kapitel-Leiste (erledigt Dunkelgrün, aktuell Lime) + Prozent */}
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="min-w-0 truncate font-semibold text-ink">
            Kapitel {kap + 1} von {kurs.kapitel.length} · {kapitel.titel}
          </span>
          <span className="shrink-0 text-ink-muted tabular-nums">{prozent} %</span>
        </div>
        <ol className="flex gap-1" aria-label={`Kapitel ${kap + 1} von ${kurs.kapitel.length}`}>
          {kurs.kapitel.map((k, i) => {
            const fertig = geschafft.has(i);
            return (
              <li key={k.id} className="flex-1">
                <button
                  type="button"
                  onClick={() => zuKapitel(i)}
                  aria-current={i === kap ? "step" : undefined}
                  aria-label={`Kapitel ${i + 1}: ${k.titel}${fertig ? " (geschafft)" : ""}`}
                  title={k.titel}
                  className={cn("block h-2 w-full rounded-full", fertig ? "bg-progress" : i === kap ? "bg-lime" : "bg-progress-track", FOKUS)}
                />
              </li>
            );
          })}
        </ol>
      </div>

      {ansicht === "geschafft" ? (
        <Geschafft titel={kurs.titel} kapitel={kurs.kapitel.length} fehler={abschlussFehler} speichert={speichert} onNochmal={abschliessen} />
      ) : ansicht === "kapitel-geschafft" ? (
        <section className={cn("flex flex-col items-center gap-5 rounded-karte bg-card px-5 py-10 text-center text-ink shadow-card", EIN)} aria-live="polite">
          <span className="flex size-16 items-center justify-center rounded-full bg-lime text-on-lime shadow-glow-charge">
            <Check className="size-8" strokeWidth={3} aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1.5">
            <h2 className="font-heading text-[32px] leading-none md:text-[40px]">Kapitel geschafft!</h2>
            <p className="text-[15px] text-ink-muted">Als Nächstes: {kurs.kapitel[kap + 1].titel}</p>
          </div>
          <button type="button" onClick={() => zuKapitel(kap + 1)} className={PRIMAER}>
            Weiter <ArrowRight aria-hidden="true" />
          </button>
        </section>
      ) : (
        <section className="flex flex-col gap-6 rounded-karte bg-card p-5 text-ink shadow-card md:p-7" aria-label={`Schritt ${schritt + 1} von ${kapitel.schritte.length}`}>
          <div key={aktuell.id} className={EIN}>
            <SchrittAnzeige s={aktuell} medium={medium} geloest={geloest.has(aktuell.id)} onGeloest={() => loesen(aktuell.id)} pruefRef={pruefRef} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={zurueck} disabled={kap === 0 && schritt === 0} className={ZURUECK}>
              <ArrowLeft className="size-4" aria-hidden="true" /> Zurück
            </button>
            <span className="text-xs text-ink-muted tabular-nums">
              {schritt + 1} / {kapitel.schritte.length}
            </span>
            <button type="button" onClick={weiter} className={PRIMAER}>
              {frageOffen ? "Prüfen" : schritt < kapitel.schritte.length - 1 ? "Weiter" : letzterKap ? "Abschließen" : "Kapitel abschließen"}{" "}
              <ArrowRight aria-hidden="true" />
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Schritte und Bausteine

type FrageProps = { medium: Medium; geloest: boolean; onGeloest: () => void; pruefRef: RefObject<Pruefer | null> };

/**
 * Ein Schritt: Vorlesen als Knopf oben rechts, die übrigen Bausteine der
 * Reihe nach. Mit Überschrift-Baustein als Titelkarte auf grüner Fläche.
 */
function SchrittAnzeige({ s, ...fp }: { s: Schritt } & FrageProps) {
  const audio = s.bausteine.find((b) => b.art === "audio");
  const titelkarte = s.bausteine.some((b) => b.art === "ueberschrift");
  const inhalt = s.bausteine.filter((b) => b.art !== "audio");
  return (
    <div className={titelkarte ? cn(FLAECHE, "items-center py-10 text-center") : "flex flex-col gap-5"}>
      {audio && <AudioKnopf src={fp.medium(audio.quelle)} className="self-end" />}
      {inhalt.map((b, i) => (
        <BausteinAnzeige key={i} b={b} schrittId={s.id} {...fp} />
      ))}
    </div>
  );
}

function BausteinAnzeige({ b, schrittId, ...fp }: { b: Baustein; schrittId: string } & FrageProps) {
  const { medium } = fp;
  switch (b.art) {
    case "ueberschrift":
      return <h2 className="font-heading text-[30px] leading-tight md:text-[38px]">{b.text}</h2>;
    case "text":
      return <HtmlInhalt knoten={b.inhalt} />;
    case "bild":
      return <Bild src={medium(b.quelle)} alt={b.beschreibung} />;
    case "audio":
      return <AudioKnopf src={medium(b.quelle)} />;
    case "video":
      return (
        <video
          controls
          preload="metadata"
          playsInline
          poster={b.vorschau ? medium(b.vorschau) : undefined}
          src={medium(b.quelle)}
          className="w-full rounded-xl bg-ink"
        />
      );
    case "frage":
      return <Frage b={b} schrittId={schrittId} {...fp} />;
    case "hotspot":
      return <Hotspot b={b} medium={medium} />;
  }
}

/** Antworten in fester, aber gemischter Reihenfolge (Quellen legen die richtige oft zuerst ab). */
function gemischt<T>(liste: T[], samen: string): T[] {
  let h = 0;
  for (const z of samen) h = (h * 31 + z.charCodeAt(0)) | 0;
  return liste
    .map((wert, i) => ({ wert, r: Math.sin(h + i * 997) }))
    .sort((a, b) => a.r - b.r)
    .map((x) => x.wert);
}

type Option = { i: number; richtig: boolean; label: string; inhalt: ReactNode };
type Pruefer = { pruefen: () => "richtig" | "falsch" | "leer" };

function Frage({ b, schrittId, ...fp }: { b: Extract<Baustein, { art: "frage" }>; schrittId: string } & FrageProps) {
  const { medium } = fp;
  const roh: Option[] = b.antworten.map((a, i) => ({
    i,
    richtig: a.richtig,
    label: a.text,
    inhalt: a.bild ? (
      <img src={medium(a.bild)} alt="" className="h-full w-full object-contain" />
    ) : (
      <>
        {a.symbol === "daumen-hoch" && <ThumbsUp className="size-5" aria-hidden="true" />}
        {a.symbol === "daumen-runter" && <ThumbsDown className="size-5" aria-hidden="true" />}
        {a.text}
      </>
    ),
  }));
  const optionen = b.mischen ? gemischt(roh, schrittId) : roh;
  const layout = b.darstellung === "bilder" ? "raster" : b.darstellung;
  return <Quiz frage={b.frage} hinweis={b.hinweis} optionen={optionen} layout={layout} erklaerung={b.rueckmeldung} {...fp} />;
}

/**
 * Fragen: auswählen, dann "Prüfen". Falsch: die falsch gewählte Antwort ist
 * markiert, neu wählen (die richtige wird nicht verraten). Richtig:
 * Erklärung, nächstes "Weiter" geht zum nächsten Schritt. Mehrere richtige
 * Antworten: ankreuzen statt wählen.
 */
function Quiz({
  frage,
  hinweis,
  optionen,
  layout,
  erklaerung,
  geloest,
  onGeloest,
  pruefRef,
}: {
  frage: string;
  hinweis: string | null;
  optionen: Option[];
  layout: "liste" | "paar" | "raster";
  erklaerung: TextKnoten[];
} & FrageProps) {
  const richtige = new Set(optionen.filter((o) => o.richtig).map((o) => o.i));
  const mehrfach = richtige.size > 1;
  const [wahl, setWahl] = useState<Set<number>>(geloest ? richtige : new Set());
  const [stand, setStand] = useState<"offen" | "leer" | "falsch" | "richtig">(geloest ? "richtig" : "offen");
  const [meldung, setMeldung] = useState<Meldung>(LOB[0]);
  const fertig = stand === "richtig";

  useImperativeHandle(pruefRef, () => ({
    pruefen() {
      if (wahl.size === 0) {
        setStand("leer");
        return "leer";
      }
      const ok = wahl.size === richtige.size && [...wahl].every((i) => richtige.has(i));
      const liste = ok ? LOB : NOCHMAL;
      setMeldung(liste[Math.floor(Math.random() * liste.length)]);
      setStand(ok ? "richtig" : "falsch");
      if (ok) onGeloest();
      return ok ? "richtig" : "falsch";
    },
  }));

  function waehlen(i: number) {
    setWahl((alt) => {
      if (!mehrfach) return new Set([i]);
      const neu = new Set(alt);
      if (neu.has(i)) neu.delete(i);
      else neu.add(i);
      return neu;
    });
    setStand("offen");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        {(hinweis || mehrfach) && <span className="text-sm font-semibold text-ink-muted">{mehrfach ? "Mehrere Antworten sind richtig." : hinweis}</span>}
        <h2 className="text-[20px] leading-snug font-semibold md:text-[22px]">{frage}</h2>
      </div>
      <div
        role="group"
        aria-label={frage}
        className={cn(
          layout === "liste" && "flex flex-col gap-2",
          layout === "paar" && "flex gap-3",
          layout === "raster" && cn("grid grid-cols-2 gap-3", optionen.length % 3 === 0 && "sm:grid-cols-3")
        )}
      >
        {optionen.map((o) => {
          const gewaehlt = wahl.has(o.i);
          const istRichtig = fertig && o.richtig;
          const istFalsch = stand === "falsch" && gewaehlt && !o.richtig;
          const zeichen = istFalsch ? <X className="size-3.5" strokeWidth={3} /> : gewaehlt || istRichtig ? <Check className="size-3.5" strokeWidth={3} /> : null;
          if (layout === "raster") {
            return (
              <button
                key={o.i}
                type="button"
                aria-pressed={gewaehlt}
                aria-label={o.label}
                disabled={fertig}
                onClick={() => waehlen(o.i)}
                className={cn(
                  "relative flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-white p-2 ring-1 ring-line transition-shadow motion-reduce:transition-none",
                  !fertig && gewaehlt && !istFalsch && "ring-4 ring-brand",
                  !fertig && !gewaehlt && "hover:ring-2 hover:ring-self",
                  istRichtig && "ring-4 ring-brand",
                  istFalsch && "ring-4 ring-praxis-text",
                  fertig && !istRichtig && "opacity-50",
                  FOKUS
                )}
              >
                {o.inhalt}
                {zeichen && (
                  <span aria-hidden="true" className={cn("absolute top-2 right-2 flex size-6 items-center justify-center rounded-full text-white", istFalsch ? "bg-praxis-text" : "bg-brand")}>
                    {zeichen}
                  </span>
                )}
              </button>
            );
          }
          return (
            <button
              key={o.i}
              type="button"
              aria-pressed={gewaehlt}
              disabled={fertig}
              onClick={() => waehlen(o.i)}
              className={cn(
                "flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 text-left text-[16px] transition-colors motion-reduce:transition-none",
                layout === "paar" && "min-h-14 flex-1 justify-center font-semibold",
                !fertig && gewaehlt && !istFalsch && "bg-brand-tint font-semibold text-ink ring-2 ring-brand",
                !fertig && !gewaehlt && "bg-subtle text-ink hover:bg-self-tint",
                istRichtig && "bg-brand font-semibold text-white",
                istFalsch && "bg-white text-ink ring-2 ring-praxis-text",
                fertig && !istRichtig && "bg-subtle text-ink opacity-60",
                FOKUS
              )}
            >
              {layout === "liste" && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-6 flex-none items-center justify-center border-2",
                    mehrfach ? "rounded-md" : "rounded-full",
                    istRichtig ? "border-white bg-white text-brand" : istFalsch ? "border-praxis-text bg-white text-praxis-text" : gewaehlt ? "border-brand bg-white text-brand" : "border-line bg-white"
                  )}
                >
                  {zeichen}
                </span>
              )}
              {o.inhalt}
            </button>
          );
        })}
      </div>
      <div role="status" aria-live="polite">
        {stand === "leer" && <p className={cn("text-[15px] text-ink-muted", EIN)}>Wähle zuerst eine Antwort.</p>}
        {stand === "falsch" && (
          <Rueckmeldung meldung={meldung} richtig={false}>
            {mehrfach ? "Prüf deine Auswahl noch einmal und klick dann wieder auf „Prüfen“." : "Wähle eine andere Antwort und klick dann wieder auf „Prüfen“."}
          </Rueckmeldung>
        )}
        {fertig && (
          <Rueckmeldung meldung={meldung} richtig>
            {erklaerung.length > 0 && <HtmlInhalt knoten={erklaerung} klein />}
          </Rueckmeldung>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rückmeldung mit bewegtem Emoji: richtig -> Emoji hüpft, kleines
// Emoji-Konfetti; falsch -> Emoji wackelt. Bewegung über die Web Animations
// API, nicht bei "weniger Bewegung".

type Meldung = { emoji: string; text: string };
const LOB: Meldung[] = [
  { emoji: "🥳", text: "Sehr gut!" },
  { emoji: "🤩", text: "Super!" },
  { emoji: "💪", text: "Richtig so!" },
  { emoji: "⚡", text: "Stark!" },
  { emoji: "🎯", text: "Genau!" },
];
const NOCHMAL: Meldung[] = [
  { emoji: "🤔", text: "Fast!" },
  { emoji: "🧐", text: "Versuch’s nochmal!" },
  { emoji: "💡", text: "Noch nicht ganz." },
];
const KONFETTI = ["🎉", "⭐", "⚡", "✨", "🎉", "⭐"];

function Rueckmeldung({ meldung, richtig, children }: { meldung: Meldung; richtig: boolean; children?: ReactNode }) {
  const kasten = useRef<HTMLDivElement>(null);
  const emoji = useRef<HTMLSpanElement>(null);
  const teile = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const ruhig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Auf kleinen Bildschirmen liegt die Rückmeldung unter den Antworten: hinscrollen.
    kasten.current?.scrollIntoView({ block: "nearest", behavior: ruhig ? "auto" : "smooth" });
    if (ruhig) return;
    const animationen: Animation[] = [];
    if (emoji.current) {
      animationen.push(
        emoji.current.animate(
          richtig
            ? [
                { transform: "scale(0.2) rotate(-20deg)", opacity: 0 },
                { transform: "scale(1.35) rotate(10deg)", opacity: 1, offset: 0.45 },
                { transform: "scale(0.9) rotate(-6deg)", offset: 0.7 },
                { transform: "scale(1) rotate(0deg)" },
              ]
            : [
                { transform: "translateX(0)" },
                { transform: "translateX(-8px) rotate(-8deg)" },
                { transform: "translateX(8px) rotate(8deg)" },
                { transform: "translateX(-5px) rotate(-4deg)" },
                { transform: "translateX(0)" },
              ],
          { duration: richtig ? 650 : 450, easing: "ease-out" }
        )
      );
    }
    teile.current.forEach((teil, i) => {
      if (!teil) return;
      const winkel = (-150 + i * 24) * (Math.PI / 180);
      const weite = 70 + (i % 3) * 18;
      animationen.push(
        teil.animate(
          [
            { transform: "translate(0, 0) scale(0.4)", opacity: 0 },
            { transform: `translate(${Math.cos(winkel) * weite * 0.6}px, ${Math.sin(winkel) * weite * 0.6}px) scale(1.1)`, opacity: 1, offset: 0.4 },
            { transform: `translate(${Math.cos(winkel) * weite}px, ${Math.sin(winkel) * weite + 20}px) scale(0.8)`, opacity: 0 },
          ],
          { duration: 900, delay: 80 + i * 30, easing: "cubic-bezier(.2,.7,.3,1)", fill: "both" }
        )
      );
    });
    return () => animationen.forEach((a) => a.cancel());
  }, [meldung, richtig]);

  return (
    <div
      ref={kasten}
      className={cn(
        "relative mt-1 flex scroll-mb-24 items-start gap-4 rounded-zeile p-4 text-ink animate-in fade-in-0 slide-in-from-bottom-4 zoom-in-95 duration-300 motion-reduce:animate-none md:p-5",
        richtig ? "bg-self-tint" : "bg-subtle"
      )}
    >
      <span className="relative flex size-14 flex-none items-center justify-center">
        <span ref={emoji} className="text-[44px] leading-none" aria-hidden="true">
          {meldung.emoji}
        </span>
        {richtig &&
          KONFETTI.map((k, i) => (
            <span
              key={i}
              ref={(el) => {
                teile.current[i] = el;
              }}
              className="pointer-events-none absolute text-lg opacity-0"
              aria-hidden="true"
            >
              {k}
            </span>
          ))}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1 pt-1">
        <span className="text-[19px] font-bold">{meldung.text}</span>
        <div className="text-[15px] text-ink">{children}</div>
      </div>
    </div>
  );
}

function Hotspot({ b, medium }: { b: Extract<Baustein, { art: "hotspot" }>; medium: Medium }) {
  const [offen, setOffen] = useState<number | null>(null);
  const [gesehen, setGesehen] = useState<Set<number>>(new Set());
  return (
    <div className="flex flex-col gap-4">
      {b.titel && <h2 className="text-[20px] leading-snug font-semibold md:text-[22px]">{b.titel}</h2>}
      <p className="text-sm text-ink-muted">Tippe auf die Punkte im Bild.</p>
      {/* Rahmen genau so groß wie das Bild (höchstens 26rem hoch), damit die Punkte stimmen. */}
      <div className="relative mx-auto w-fit max-w-full overflow-hidden rounded-xl bg-white">
        <img src={medium(b.bild)} alt={b.titel ?? ""} className="block max-h-[26rem] w-auto max-w-full" />
        {b.punkte.map((p, i) => (
          <button
            key={i}
            type="button"
            aria-pressed={offen === i}
            aria-label={`Punkt ${i + 1}`}
            onClick={() => {
              setOffen(i);
              setGesehen((alt) => new Set(alt).add(i));
            }}
            style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
            className={cn(
              "absolute flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-sm font-bold shadow-card ring-2 ring-white transition-transform hover:scale-110 motion-reduce:transition-none",
              offen === i ? "scale-110 bg-brand text-white" : gesehen.has(i) ? "bg-progress text-white" : "bg-lime text-on-lime",
              FOKUS
            )}
          >
            {i + 1}
          </button>
        ))}
      </div>
      <div className="min-h-6" aria-live="polite">
        {offen !== null && (
          <div key={offen} className={cn("flex gap-3 rounded-xl bg-self-tint p-4", EIN)}>
            <span className="flex size-6 flex-none items-center justify-center rounded-full bg-brand text-xs font-bold text-white">{offen + 1}</span>
            <div className="min-w-0 flex-1">
              <HtmlInhalt knoten={b.punkte[offen].inhalt} klein />
            </div>
            <button type="button" onClick={() => setOffen(null)} aria-label="Schließen" className={cn("flex size-8 flex-none items-center justify-center rounded-full hover:bg-white", FOKUS)}>
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Geschafft({
  titel,
  kapitel,
  fehler,
  speichert,
  onNochmal,
}: {
  titel: string;
  kapitel: number;
  fehler: boolean;
  speichert: boolean;
  onNochmal: () => void;
}) {
  return (
    <section className={cn("flex flex-col items-center gap-5 rounded-karte bg-card px-5 py-10 text-center text-ink shadow-card", EIN)} aria-live="polite">
      <span className="flex size-20 items-center justify-center rounded-full bg-lime text-on-lime shadow-glow-charge">
        <PartyPopper className="size-10" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1.5">
        <h2 className="font-heading text-[36px] leading-none md:text-[44px]">Geschafft!</h2>
        <p className="text-[15px] text-ink-muted">
          {titel} – alle {kapitel} Kapitel abgeschlossen.
        </p>
      </div>
      {fehler && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-[15px] text-ink">Der Abschluss konnte nicht gespeichert werden.</p>
          <button type="button" onClick={onNochmal} disabled={speichert} className={PRIMAER}>
            Nochmal speichern
          </button>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Kleine Helfer

/** Einheitlicher Bildrahmen: gleiche Höhe, kleine Bilder werden vergrößert. */
function Bild({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-xl bg-white p-2 ring-1 ring-line">
      <img src={src} alt={alt} className="h-full w-full object-contain" />
    </div>
  );
}

const HTML_KLASSE: Record<string, string> = {
  h1: "font-heading text-[28px] leading-tight md:text-[32px]",
  h2: "text-[20px] leading-snug font-semibold md:text-[22px]",
  h3: "text-[17px] leading-snug font-semibold",
  p: "leading-relaxed",
  ul: "list-disc space-y-1 pl-5 leading-relaxed",
  ol: "list-decimal space-y-1 pl-5 leading-relaxed",
  strong: "font-semibold",
};

function HtmlInhalt({ knoten, klein }: { knoten: TextKnoten[]; klein?: boolean }) {
  return <div className={cn("flex flex-col gap-3 text-ink", klein ? "text-[15px]" : "text-[17px]")}>{knotenZeigen(knoten)}</div>;
}

function knotenZeigen(knoten: TextKnoten[]): ReactNode[] {
  return knoten.map((k, i) => {
    if (typeof k === "string") return k;
    if (k.tag === "br") return <br key={i} />;
    const Tag = k.tag;
    return (
      <Tag key={i} className={HTML_KLASSE[k.tag]}>
        {knotenZeigen(k.kinder)}
      </Tag>
    );
  });
}

/** Eingesprochener Text (Audio aus der Quelle); es spielt immer nur eines. */
let laufendesAudio: HTMLAudioElement | null = null;

function AudioKnopf({ src, className }: { src: string; className?: string }) {
  const [spielt, setSpielt] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(
    () => () => {
      audio.current?.pause();
    },
    []
  );

  return (
    <button
      type="button"
      onClick={() => {
        if (!audio.current) {
          audio.current = new Audio(src);
          audio.current.addEventListener("ended", () => setSpielt(false));
          audio.current.addEventListener("pause", () => setSpielt(false));
          audio.current.addEventListener("play", () => setSpielt(true));
        }
        if (spielt) audio.current.pause();
        else {
          if (laufendesAudio && laufendesAudio !== audio.current) laufendesAudio.pause();
          laufendesAudio = audio.current;
          void audio.current.play();
        }
      }}
      aria-label={spielt ? "Vorlesen anhalten" : "Vorlesen"}
      title={spielt ? "Anhalten" : "Vorlesen"}
      className={cn(
        "inline-flex size-10 flex-none items-center justify-center rounded-full bg-white text-self shadow-card outline-none hover:bg-subtle focus-visible:ring-2 focus-visible:ring-brand",
        spielt && "bg-self text-white hover:bg-self",
        className
      )}
    >
      {spielt ? <Pause className="size-5" aria-hidden="true" /> : <Volume2 className="size-5" aria-hidden="true" />}
    </button>
  );
}
