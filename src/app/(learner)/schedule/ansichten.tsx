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
  "inline-flex size-9 items-center justify-center rounded-full text-eco-deep-green outline-none transition-[background-color] duration-150 hover:bg-off-white focus-visible:ring-2 focus-visible:ring-eco-green motion-reduce:transition-none";
// Punkt 5: "Heute" als unterstrichener Textlink.
const HEUTE_LINK =
  "rounded-sm text-sm font-semibold text-eco-deep-green underline underline-offset-4 outline-none hover:decoration-2 focus-visible:ring-2 focus-visible:ring-eco-green";
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

/** Brief 2.3: Segmented Control Tag | Woche | Monat. */
function AnsichtUmschalter({ aktiv, href }: { aktiv: Ansicht; href: (a: Ansicht) => string }) {
  const knopf = (a: Ansicht, text: string) => (
    <Link
      href={href(a)}
      aria-current={aktiv === a ? "true" : undefined}
      className={cn(
        "rounded-[9px] px-3.5 py-[7px] text-sm outline-none focus-visible:ring-2 focus-visible:ring-eco-green",
        aktiv === a ? "bg-white font-semibold text-eco-deep-green shadow-sm" : "text-muted-foreground hover:text-eco-deep-green"
      )}
    >
      {text}
    </Link>
  );
  return (
    <div role="group" aria-label="Ansicht" className="flex gap-0.5 rounded-xl bg-off-white p-1">
      {knopf("tag", "Tag")}
      {knopf("woche", "Woche")}
      {knopf("monat", "Monat")}
    </div>
  );
}

export function Steuerleiste({
  ansicht,
  heuteHref,
  zurueckHref,
  vorHref,
  zurueckLabel,
  vorLabel,
  titel,
  zusatz,
  umschalterHref,
}: {
  ansicht: Ansicht;
  heuteHref: string;
  zurueckHref: string;
  vorHref: string;
  zurueckLabel: string;
  vorLabel: string;
  titel: string;
  /** Grau rechts neben dem Zeitraum, z. B. "· Woche 2 · Theorie (online)" */
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
      <span className="ml-1.5 text-sm text-muted-foreground">{zusatz}</span>
      <Link href={heuteHref} className={cn(HEUTE_LINK, "ml-4")}>
        Heute
      </Link>
      <div className="ml-auto">
        <AnsichtUmschalter aktiv={ansicht} href={umschalterHref} />
      </div>
    </div>
  );
}

/** Kreis mit Datumszahl: heute dunkel hinterlegt. */
function DatumsKreis({ datum, heute, gewaehlt = false, klein = false }: { datum: string; heute: boolean; gewaehlt?: boolean; klein?: boolean }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-heading",
        klein ? "size-7 text-[15px]" : "size-8 text-lg",
        heute ? "bg-eco-deep-green text-white" : gewaehlt ? "bg-heute-flaeche ring-2 ring-eco-deep-green" : ""
      )}
    >
      {tagZahl(datum)}
    </span>
  );
}

/** Brief 2.4: Tageskopf, Zeile "Flexibel" und Zeitraster über Mo–Fr -- ohne Rahmen (Punkt 2). */
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
  const { von, bis } = stundenBereich(tage.flatMap((t) => t.bloecke));
  const raster = "grid grid-cols-[64px_repeat(5,minmax(0,1fr))]";
  const heute = (t: TagModell) => t.heute && "bg-heute-flaeche";
  return (
    <div className="text-eco-deep-green">
      <div className={raster}>
        <div />
        {tage.map((t) => (
          <div key={t.datum} className={cn("flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-t-xl px-2 pt-2 pb-1.5", heute(t))}>
            <Link
              href={tagHref(t.datum)}
              aria-label={`${datumLang(t.datum)}, Tagesansicht öffnen`}
              className="flex items-center gap-1.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-eco-green"
            >
              <DatumsKreis datum={t.datum} heute={t.heute} />
              <span className={cn("text-xs font-semibold tracking-[0.06em] uppercase", !t.heute && "text-muted-foreground")}>
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
        <div className="pt-2.5 pr-2.5 text-right text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
          Flexibel
        </div>
        {tage.map((t) => (
          <div key={t.datum} className={cn("flex min-w-0 flex-col gap-1 px-1.5 pt-1.5 pb-3", heute(t))}>
            {t.chips.map((c) => (
              <FlexChip key={c.id} chip={c} />
            ))}
          </div>
        ))}
      </div>

      <div className={raster}>
        <StundenSpalte von={von} bis={bis} hoehe={HOEHE_WOCHE} />
        {tage.map((t) => (
          <TagSpalte key={t.datum} tag={t} von={von} bis={bis} hoehe={HOEHE_WOCHE} gross={false} jetzt={jetzt} simuliert={simuliert} heuteToenen />
        ))}
      </div>
    </div>
  );
}

/**
 * Punkt 8: Tagesliste ohne Kästchen -- Datum im Kreis + Wochentag, heute
 * hinterlegt, erledigte Tage mit Häkchen. `quer` = mobiler Streifen.
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
                "flex rounded-xl text-eco-deep-green outline-none hover:bg-off-white focus-visible:ring-2 focus-visible:ring-eco-green",
                quer ? "flex-col items-center gap-1 py-1.5" : "items-center gap-3 px-2 py-1.5",
                aktiv && !quer && "bg-off-white"
              )}
            >
              {quer && (
                <span className={cn("text-[11px] font-semibold tracking-[0.06em] uppercase", !aktiv && "text-muted-foreground")}>
                  {kurzname(t.datum)}
                </span>
              )}
              <DatumsKreis datum={t.datum} heute={t.heute} gewaehlt={aktiv} klein={quer} />
              {quer ? (
                <span className="flex h-3 items-center">
                  {erledigt && <Check className="size-3 text-eco-green" strokeWidth={3} aria-hidden="true" />}
                </span>
              ) : (
                <>
                  <span className={cn("text-sm", aktiv ? "font-bold" : "font-medium")}>{wochentagLang(t.datum)}</span>
                  <AbweichungsLabel typ={t.typ} haupt={haupt} />
                  {erledigt && <Check className="ml-auto size-3.5 text-eco-green" strokeWidth={3} aria-hidden="true" />}
                </>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Ein Tag: Flexibel-Leisten (Punkt 9) + Zeitraster, ohne Rahmen. */
export function TagesKarte({ tag, jetzt, simuliert, mobil }: { tag: TagModell; jetzt: string; simuliert: boolean; mobil: boolean }) {
  const bereich = stundenBereich(tag.bloecke);
  const { von, bis } = mobil ? bereich : { von: Math.min(7, bereich.von), bis: Math.max(19, bereich.bis) };
  const raster = mobil ? "grid grid-cols-[48px_minmax(0,1fr)]" : "grid grid-cols-[64px_minmax(0,1fr)]";
  const hoehe = mobil ? mobilHoehe(von, bis) : tagesHoehe(von, bis);
  return (
    <div className="flex flex-col gap-3 text-eco-deep-green">
      {tag.chips.length > 0 && (
        <div className={raster}>
          <div className="pt-2.5 pr-2.5 text-right text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
            {mobil ? "Flex" : "Flexibel"}
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            {tag.chips.map((c) => (
              <FlexLeiste key={c.id} chip={c} gross={!mobil} />
            ))}
          </div>
        </div>
      )}
      <div className={raster}>
        <StundenSpalte von={von} bis={bis} hoehe={hoehe} />
        <TagSpalte tag={tag} von={von} bis={bis} hoehe={hoehe} gross={!mobil} jetzt={jetzt} simuliert={simuliert} />
      </div>
      {tag.bloecke.length === 0 && tag.chips.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">An diesem Tag ist nichts geplant.</p>
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
        <span className="px-2 text-[13px] font-semibold text-muted-foreground">{wochenText}</span>
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
    <div className="text-eco-deep-green">
      <div className={raster}>
        <div />
        {kopf.map((t, i) => (
          <div
            key={t.datum}
            className={cn("px-2 pb-2 text-xs font-semibold tracking-[0.06em] uppercase", i < 5 ? "text-muted-foreground" : "text-muted-foreground/70")}
          >
            {kurzname(t.datum)}
          </div>
        ))}
      </div>
      {wochen.map((woche) => {
        const nr = wocheNr(woche[0].datum);
        return (
          <div key={woche[0].datum} className={cn(raster, "border-t border-raster-linie")}>
            <div className="pt-2.5 text-xs font-semibold text-muted-foreground">{nr ? `Woche ${nr}` : ""}</div>
            {woche.map((t, i) => {
              const wochenende = i >= 5;
              const fremd = !t.datum.startsWith(monat);
              return (
                <Link
                  key={t.datum}
                  href={tagHref(t.datum)}
                  aria-label={`${datumLang(t.datum)}, Tagesansicht öffnen`}
                  className={cn(
                    "flex min-h-[104px] min-w-0 flex-col gap-1.5 rounded-lg p-1.5 outline-none hover:bg-off-white focus-visible:ring-2 focus-visible:ring-eco-green",
                    t.heute && "bg-heute-flaeche",
                    fremd && "opacity-50"
                  )}
                >
                  <span className={cn("self-start", wochenende && !t.heute && "text-muted-foreground")}>
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
  heuteHref: string;
  zurueckHref: string;
  vorHref: string;
  jetzt: string;
  simuliert: boolean;
  tagHref: (datum: string) => string;
}) {
  return (
    <div className="flex flex-col gap-4 text-eco-deep-green">
      <div className="flex items-end justify-between">
        <h1 className="font-heading text-[34px] leading-none">Stundenplan</h1>
        <Link href={heuteHref} className={HEUTE_LINK}>
          Heute
        </Link>
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
