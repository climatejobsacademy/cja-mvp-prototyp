import Link from "next/link";
import type { ReactNode } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";

import { datumLang, plusTage, wochentagLang } from "@/lib/date";
import { stundenBereich, type Tagestyp } from "@/lib/stundenplan";
import { cn } from "@/lib/utils";

import { AbweichungsLabel, FlexChip, FlexLeiste, MonatsTags, StundenSpalte, TagSpalte, tagErledigt } from "./plan-bausteine";
import type { TagModell } from "./plan-modell";

// Stundenplan v2 (docs/design_handoff_stundenplan_v2, SR folgt):
// Steuerleiste (Brief 2.3), Woche (2.4), Tag Desktop (2.5) und mobil (2.6),
// Monat (Änderungsliste Anna 2026-10-10, Punkt 11, nur Desktop). Alles
// serverseitig; Navigation über Links mit ?ansicht=…&datum=… (Brief 3).

export type Ansicht = "tag" | "woche" | "monat";

// Punkt 5: Pfeile ohne Rahmen.
const PFEIL =
  "inline-flex size-9 items-center justify-center rounded-full text-ink outline-none transition-[background-color] duration-150 hover:bg-subtle focus-visible:ring-2 focus-visible:ring-brand motion-reduce:transition-none";
// Punkt 5: "Heute" als Textlink (seit dem visuellen Update ohne Unterstreichung).
const HEUTE_LINK =
  "rounded-sm text-sm font-semibold text-ink outline-none hover:text-brand focus-visible:ring-2 focus-visible:ring-brand";
// Rasterhöhe: Desktop passt sich dem Fenster an, damit Woche bzw. Tag ohne
// Scrollen ganz sichtbar sind (Entscheidung Anna 2026-10-10); der Abzug ist
// die Höhe von Kopf, Steuerleiste und Tageskopf. Mobil fest 48 px/Stunde.
const HOEHE_WOCHE = "max(300px, calc(100dvh - 400px))";
// Tagesansicht Desktop (Wunsch Anna 2026-10-10): schmal und lang -- immer
// 07-19 Uhr (bei früheren/späteren Terminen mehr), feste 56 px pro Stunde.
const tagesHoehe = (von: number, bis: number) => `${(bis - von) * 56}px`;
const mobilHoehe = (von: number, bis: number) => `${(bis - von) * 48}px`;

const kurzname = (datum: string) =>
  new Date(`${datum}T00:00:00Z`).toLocaleDateString("de-DE", { weekday: "short", timeZone: "UTC" }).replace(".", "");
const tagZahl = (datum: string) => String(Number(datum.slice(8, 10)));

/**
 * "Heute" als Textlink. Zeigt die Ansicht schon heute, grau und nicht
 * klickbar -- sonst passiert beim Klick sichtbar nichts (Rückmeldung Anna
 * 2026-10-11).
 */
function HeuteLink({ href, className }: { href: string | null; className?: string }) {
  if (!href) {
    return (
      <span aria-disabled="true" title="Du siehst schon heute" className={cn("text-sm font-semibold text-ink-muted/60", className)}>
        Heute
      </span>
    );
  }
  return (
    <Link href={href} className={cn(HEUTE_LINK, className)}>
      Heute
    </Link>
  );
}

/** Brief 2.3: Segmented Control Tag | Woche | Monat. */
function AnsichtUmschalter({ aktiv, href }: { aktiv: Ansicht; href: (a: Ansicht) => string }) {
  const knopf = (a: Ansicht, text: string) => (
    <Link
      href={href(a)}
      aria-current={aktiv === a ? "true" : undefined}
      className={cn(
        "rounded-full px-3.5 py-[7px] text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand",
        aktiv === a ? "bg-white font-semibold text-ink shadow-segment" : "text-ink-muted hover:text-ink"
      )}
    >
      {text}
    </Link>
  );
  return (
    <div role="group" aria-label="Ansicht" className="flex gap-0.5 rounded-full bg-subtle p-1">
      {knopf("tag", "Tag")}
      {knopf("woche", "Woche")}
      {knopf("monat", "Monat")}
    </div>
  );
}

// Entscheidung Anna 2026-10-12: kein "Heute"-Link mehr in der Steuerleiste.
export function Steuerleiste({
  ansicht,
  zurueckHref,
  vorHref,
  zurueckLabel,
  vorLabel,
  titel,
  zusatz,
  umschalterHref,
}: {
  ansicht: Ansicht;
  zurueckHref: string;
  vorHref: string;
  zurueckLabel: string;
  vorLabel: string;
  titel: string;
  /** Rechts neben dem Zeitraum, z. B. das Symbol der Wochenart */
  zusatz: ReactNode;
  umschalterHref: (a: Ansicht) => string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
      <Link href={zurueckHref} aria-label={zurueckLabel} className={PFEIL}>
        <ChevronLeft className="size-5" aria-hidden="true" />
      </Link>
      <Link href={vorHref} aria-label={vorLabel} className={PFEIL}>
        <ChevronRight className="size-5" aria-hidden="true" />
      </Link>
      <h2 className="ml-2 text-xl font-bold" aria-live="polite">
        {titel}
      </h2>
      <span className="ml-2.5 inline-flex items-center gap-2 text-sm text-ink-muted">{zusatz}</span>
      <div className="ml-auto">
        <AnsichtUmschalter aktiv={ansicht} href={umschalterHref} />
      </div>
    </div>
  );
}

/** Kreis mit Datumszahl: nur heute lila hinterlegt (Anna 2026-10-15: der gewählte Tag, z. B. Montag einer neuen Woche, nicht dunkler). */
function DatumsKreis({ datum, heute, klein = false }: { datum: string; heute: boolean; klein?: boolean }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-heading",
        klein ? "size-7 text-[15px]" : "size-8 text-lg",
        heute && "bg-brand text-white"
      )}
    >
      {tagZahl(datum)}
    </span>
  );
}

/** Brief 2.4: Tageskopf, Zeitraster und darunter die Zeile "Flexibel" über Mo–Fr -- ohne Rahmen (Punkt 2). */
export function WochenAnsicht({
  tage,
  haupt,
  jetzt,
  simuliert,
  tagHref,
}: {
  tage: TagModell[];
  haupt: Tagestyp | null;
  jetzt: string;
  simuliert: boolean;
  tagHref: (datum: string) => string;
}) {
  const bloecke = tage.flatMap((t) => t.bloecke);
  const bereich = stundenBereich(bloecke);
  const { von } = bereich;
  // Wunsch Anna 2026-10-11: unter dem letzten Termin nur eine halbe Stunde
  // Luft, damit "Flexibel" näher am Kalender steht.
  const bis = bloecke.length > 0 ? bereich.bis - 0.5 : bereich.bis;
  const raster = "grid grid-cols-[64px_repeat(5,minmax(0,1fr))]";
  const heute = (t: TagModell) => t.heute && "bg-heute-flaeche";
  return (
    <div className="text-ink">
      <div className={raster}>
        <div />
        {tage.map((t) => (
          <div key={t.datum} className={cn("flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-t-xl px-2 pt-2 pb-1.5", heute(t))}>
            <Link
              href={tagHref(t.datum)}
              aria-label={`${datumLang(t.datum)}, Tagesansicht öffnen`}
              className="flex items-center gap-1.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <DatumsKreis datum={t.datum} heute={t.heute} />
              <span className={cn("text-xs font-semibold tracking-[0.06em] uppercase", !t.heute && "text-ink-muted")}>
                {kurzname(t.datum)}
              </span>
            </Link>
            <span className="ml-auto">
              <AbweichungsLabel typ={t.typ} haupt={haupt} />
            </span>
          </div>
        ))}
      </div>

      <div className={raster}>
        <StundenSpalte von={von} bis={bis} hoehe={HOEHE_WOCHE} />
        {tage.map((t) => (
          <TagSpalte key={t.datum} tag={t} von={von} bis={bis} hoehe={HOEHE_WOCHE} gross={false} jetzt={jetzt} simuliert={simuliert} heuteToenen />
        ))}
      </div>
      {/* Anna 2026-10-11: Selbstlernen unter dem Kalender -- der Unterricht steht im Vordergrund. */}
      <div className={raster}>
        <div className="pt-4 pr-2.5 text-right text-[11px] font-semibold tracking-[0.06em] text-ink-muted uppercase">
          Flexibel
        </div>
        {tage.map((t) => (
          <div key={t.datum} className={cn("flex min-w-0 flex-col gap-1.5 px-1.5 pt-2 pb-1.5", heute(t))}>
            {t.chips.map((c) => (
              <FlexChip key={c.id} chip={c} />
            ))}
          </div>
        ))}
      </div>

    </div>
  );
}

/**
 * Punkt 8: Tagesliste ohne Kästchen -- Datum im Kreis + Wochentag, nur heute
 * hinterlegt; der gewählte Tag nur fett. Erledigte Tage mit Häkchen. `quer` =
 * mobiler Streifen.
 */
export function TagesListe({
  tage,
  gewaehlt,
  haupt,
  quer,
  tagHref,
}: {
  tage: TagModell[];
  gewaehlt: string;
  haupt: Tagestyp | null;
  quer: boolean;
  tagHref: (datum: string) => string;
}) {
  return (
    <ul className={cn("flex", quer ? "justify-between gap-1" : "flex-col gap-0.5")}>
      {tage.map((t) => {
        const aktiv = t.datum === gewaehlt;
        const erledigt = tagErledigt(t);
        return (
          <li key={t.datum} className={cn(quer && "min-w-0 flex-1")}>
            <Link
              href={tagHref(t.datum)}
              aria-current={aktiv ? "date" : undefined}
              aria-label={`${datumLang(t.datum)}${t.heute ? ", heute" : ""}${erledigt ? ", alles erledigt" : ""}`}
              className={cn(
                "flex rounded-xl text-ink outline-none hover:bg-subtle focus-visible:ring-2 focus-visible:ring-brand",
                quer ? "flex-col items-center gap-1 py-1.5" : "items-center gap-3 px-2 py-1.5"
              )}
            >
              {quer && (
                <span className={cn("text-[11px] font-semibold tracking-[0.06em] uppercase", !aktiv && "text-ink-muted")}>
                  {kurzname(t.datum)}
                </span>
              )}
              <DatumsKreis datum={t.datum} heute={t.heute} klein={quer} />
              {quer ? (
                <span className="flex h-3 items-center">
                  {erledigt && <Check className="size-3 text-progress" strokeWidth={3} aria-hidden="true" />}
                </span>
              ) : (
                <>
                  <span className={cn("text-sm", aktiv ? "font-bold" : "font-medium")}>{wochentagLang(t.datum)}</span>
                  <AbweichungsLabel typ={t.typ} haupt={haupt} />
                  {erledigt && <Check className="ml-auto size-3.5 text-progress" strokeWidth={3} aria-hidden="true" />}
                </>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Ein Tag: Zeitraster, darunter die Flexibel-Leisten (Punkt 9; unten seit 2026-10-11), ohne Rahmen. */
export function TagesKarte({ tag, jetzt, simuliert, mobil }: { tag: TagModell; jetzt: string; simuliert: boolean; mobil: boolean }) {
  const bereich = stundenBereich(tag.bloecke);
  const { von, bis } = mobil ? bereich : { von: Math.min(7, bereich.von), bis: Math.max(19, bereich.bis) };
  const raster = mobil ? "grid grid-cols-[48px_minmax(0,1fr)]" : "grid grid-cols-[64px_minmax(0,1fr)]";
  const hoehe = mobil ? mobilHoehe(von, bis) : tagesHoehe(von, bis);
  return (
    <div className="flex flex-col gap-3 text-ink">
      <div className={raster}>
        <StundenSpalte von={von} bis={bis} hoehe={hoehe} />
        <TagSpalte tag={tag} von={von} bis={bis} hoehe={hoehe} gross={!mobil} jetzt={jetzt} simuliert={simuliert} />
      </div>
      {tag.chips.length > 0 && (
        <div className={raster}>
          <div className="pt-2.5 pr-2.5 text-right text-[11px] font-semibold tracking-[0.06em] text-ink-muted uppercase">
            {mobil ? "Flex" : "Flexibel"}
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            {tag.chips.map((c) => (
              <FlexLeiste key={c.id} chip={c} gross={!mobil} />
            ))}
          </div>
        </div>
      )}
      {tag.bloecke.length === 0 && tag.chips.length === 0 && (
        <p className="text-center text-sm text-ink-muted">An diesem Tag ist nichts geplant.</p>
      )}
    </div>
  );
}

/** Brief 2.5: Tagesansicht Desktop -- links die Tagesliste der Woche, rechts der Tag. */
export function TagesAnsicht({
  tag,
  tage,
  haupt,
  wochenText,
  jetzt,
  simuliert,
  tagHref,
}: {
  tag: TagModell;
  tage: TagModell[];
  haupt: Tagestyp | null;
  wochenText: string;
  jetzt: string;
  simuliert: boolean;
  tagHref: (datum: string) => string;
}) {
  return (
    <div className="grid items-start gap-10 lg:grid-cols-[200px_minmax(0,1fr)]">
      <aside className="flex flex-col gap-2">
        <span className="px-2 text-[13px] font-semibold text-ink-muted">{wochenText}</span>
        <TagesListe tage={tage} gewaehlt={tag.datum} haupt={haupt} quer={false} tagHref={tagHref} />
      </aside>
      <TagesKarte tag={tag} jetzt={jetzt} simuliert={simuliert} mobil={false} />
    </div>
  );
}

/**
 * Punkt 11: Monatsraster (nur Desktop) -- Mo–Fr breit, Sa/So schmal und
 * grau, links "Woche n". Klick auf einen Tag öffnet die Tagesansicht.
 */
export function MonatsAnsicht({
  wochen,
  monat,
  wocheNr,
  tagHref,
}: {
  /** je Woche 7 Tage Mo–So */
  wochen: TagModell[][];
  /** "2026-10" */
  monat: string;
  wocheNr: (montag: string) => number | null;
  tagHref: (datum: string) => string;
}) {
  const raster = "grid grid-cols-[72px_repeat(5,minmax(0,1fr))_repeat(2,72px)]";
  const kopf = wochen[0] ?? [];
  return (
    <div className="text-ink">
      <div className={raster}>
        <div />
        {kopf.map((t, i) => (
          <div
            key={t.datum}
            className={cn("px-2 pb-2 text-xs font-semibold tracking-[0.06em] uppercase", i < 5 ? "text-ink-muted" : "text-ink-muted/70")}
          >
            {kurzname(t.datum)}
          </div>
        ))}
      </div>
      {wochen.map((woche) => {
        const nr = wocheNr(woche[0].datum);
        return (
          <div key={woche[0].datum} className={cn(raster, "border-t border-line")}>
            <div className="pt-2.5 text-xs font-semibold text-ink-muted">{nr ? `Woche ${nr}` : ""}</div>
            {woche.map((t, i) => {
              const wochenende = i >= 5;
              const fremd = !t.datum.startsWith(monat);
              return (
                <Link
                  key={t.datum}
                  href={tagHref(t.datum)}
                  aria-label={`${datumLang(t.datum)}, Tagesansicht öffnen`}
                  className={cn(
                    "flex min-h-[104px] min-w-0 flex-col gap-1.5 rounded-lg p-1.5 outline-none hover:bg-subtle focus-visible:ring-2 focus-visible:ring-brand",
                    t.heute && "bg-heute-flaeche",
                    fremd && "opacity-50"
                  )}
                >
                  <span className={cn("self-start", wochenende && !t.heute && "text-ink-muted")}>
                    <DatumsKreis datum={t.datum} heute={t.heute} klein />
                  </span>
                  <MonatsTags tag={t} />
                </Link>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/** Brief 2.6: Mobil (< 768 px) -- immer Tagesansicht mit Wochennavigation und Tagesstreifen. */
export function MobilAnsicht({
  tag,
  tage,
  haupt,
  wochenText,
  heuteHref,
  zurueckHref,
  vorHref,
  jetzt,
  simuliert,
  tagHref,
}: {
  tag: TagModell;
  tage: TagModell[];
  haupt: Tagestyp | null;
  wochenText: string;
  /** null = die Ansicht zeigt schon heute */
  heuteHref: string | null;
  zurueckHref: string;
  vorHref: string;
  jetzt: string;
  simuliert: boolean;
  tagHref: (datum: string) => string;
}) {
  return (
    <div className="flex flex-col gap-4 text-ink">
      <div className="flex items-end justify-between">
        <h1 className="font-heading text-[34px] leading-none">Stundenplan</h1>
        <HeuteLink href={heuteHref} />
      </div>
      <div className="flex items-center justify-between text-sm">
        <Link href={zurueckHref} aria-label="Vorherige Woche" className={PFEIL}>
          <ChevronLeft className="size-5" aria-hidden="true" />
        </Link>
        <span className="font-bold">{wochenText}</span>
        <Link href={vorHref} aria-label="Nächste Woche" className={PFEIL}>
          <ChevronRight className="size-5" aria-hidden="true" />
        </Link>
      </div>
      <TagesListe tage={tage} gewaehlt={tag.datum} haupt={haupt} quer tagHref={tagHref} />
      <div className="flex items-center gap-2">
        <h2 className="text-base font-bold">{datumLang(tag.datum)}</h2>
        <AbweichungsLabel typ={tag.typ} haupt={haupt} />
      </div>
      <TagesKarte tag={tag} jetzt={jetzt} simuliert={simuliert} mobil />
    </div>
  );
}

/** Wochen-Zeilen (je 7 Tage) aus einer Tagesliste ab einem Montag. */
export function inWochen(tage: TagModell[], montage: string[]): TagModell[][] {
  return montage.map((m) => {
    const bis = plusTage(m, 6);
    return tage.filter((t) => t.datum >= m && t.datum <= bis);
  });
}
