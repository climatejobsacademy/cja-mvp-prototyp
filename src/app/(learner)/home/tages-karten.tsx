import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, BookOpen, CalendarDays, Check, Video, Wrench } from "lucide-react";

import { titelTeile, type ErledigtEintrag, type LiveAktivitaet, type PraxisAktivitaet } from "@/lib/home-tag";
import { Ring } from "@/components/fortschritts-ring";
import { cn } from "@/lib/utils";

import { MehrMenue } from "./mehr-menue";

// Home v12 (docs/design_handoff_home_v6/design/home-v12-referenz.html;
// Logik und Zustände aus dem Brief v6, SR folgt): die Karten des Bereichs
// "Dein Tag" für die Zustände A-F -- oben die Fokus-Karte (Anker), darunter
// eine schmale helle Leiste. Reine Darstellung -- welcher Zustand gilt,
// entscheidet getDayState().

// Visuelles Update (docs/ux/visual-update, 2026-10-11): die Fokus-Karte ist
// der Anker der Seite -- Live/Selbstlernen/Erledigt im Lila-Verlauf, Praxis im
// Coral-Verlauf; Buttons darauf in Lime.
const PRIMAER_BUTTON =
  "inline-flex min-h-11 items-center gap-2 rounded-full bg-lime px-5 text-[15px] font-bold text-on-lime outline-none transition-[filter] duration-150 hover:brightness-95 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand motion-reduce:transition-none";

const LINK_FOKUS = "rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-brand";

const hhmm = (zeit: string) => zeit.slice(0, 5);
const lektionHref = (lessonId: string) => `/content/${lessonId}?von=home`;

export type OffeneLektion = { titel: string; lessonId: string };
export type GestaerkteKompetenz = { id: string; name: string; prozent: number };
export type StaerktKompetenz = { id: string; name: string };

/** Kompetenzseite v1, Brief 3: Links öffnen die Seite mit der Kompetenz ausgewählt. */
export const kompetenzHref = (id: string) => `/kompetenzen?kompetenz=${id}`;

function PrimaerAktion({
  href,
  extern,
  mehr,
  children,
}: {
  href: string;
  extern?: boolean;
  /** Optional rechts daneben, z. B. das "⋯"-Menü */
  mehr?: ReactNode;
  children: ReactNode;
}) {
  const inhalt = (
    <>
      {children}
      <ArrowRight className="size-[17px]" aria-hidden="true" />
    </>
  );
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {extern ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className={PRIMAER_BUTTON}>
          {inhalt}
          <span className="sr-only">(öffnet in neuem Tab)</span>
        </a>
      ) : (
        <Link href={href} className={PRIMAER_BUTTON}>
          {inhalt}
        </Link>
      )}
      {mehr}
    </div>
  );
}

/** Fokus-Karte (Anker): links Kennzeichnung + großes Element, rechts Inhalt. */
function FokusRahmen({
  links,
  rechts,
  praxis,
  children,
}: {
  links?: ReactNode;
  rechts?: ReactNode;
  praxis?: boolean;
  children: ReactNode;
}) {
  return (
    <article
      className={cn(
        "flex flex-wrap items-start gap-x-7 gap-y-4 rounded-karte p-6 text-white md:px-7 md:py-7",
        praxis ? "bg-anchor-praxis shadow-anchor-praxis" : "bg-anchor-brand shadow-anchor-brand",
      )}
    >
      {links && <div className="flex flex-none flex-col gap-1.5 pt-0.5">{links}</div>}
      <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-2">{children}</div>
      {rechts && <div className="flex-none">{rechts}</div>}
    </article>
  );
}

/** Lime-Pill "jetzt/aktuell" mit dunklem Punkt (Brief, Farbregel 4). */
function LimePill({ children, puls }: { children: ReactNode; puls?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-lime px-2.5 py-0.5 text-xs font-semibold text-on-lime">
      <span
        aria-hidden="true"
        className={cn("size-1.5 rounded-full bg-on-lime", puls && "motion-safe:animate-pulse")}
      />
      {children}
    </span>
  );
}

const ALS_NAECHSTES = <LimePill>Als Nächstes</LimePill>;
const GROSS = "font-heading text-[44px] leading-none tabular-nums md:text-[56px]";

/** Kurzer Titel (max. 2 Zeilen) + Untertitel aus dem Klammertext. */
// Titel-Stil der Fokus-Karte, auch für "Wissen festigen" rechts daneben.
const KARTEN_TITEL = "text-[20px] leading-tight font-semibold md:text-[22px]";

/**
 * Optional ein Typ-Icon direkt vor dem Titel statt einer eigenen Zeile
 * "Live-Unterricht" (Entscheidung Anna 2026-10-12); `art` liest der
 * Screenreader mit.
 */
function FokusTitel({ titel, icon, art }: { titel: string; icon?: ReactNode; art?: string }) {
  const teile = titelTeile(titel);
  return (
    <>
      <h3 className={cn("flex items-center gap-2.5", KARTEN_TITEL)}>
        {icon && (
          <span aria-hidden="true" className="flex flex-none text-white/85">
            {icon}
          </span>
        )}
        <span className="line-clamp-2">
          {art && <span className="sr-only">{art}: </span>}
          {teile.titel}
        </span>
      </h3>
      {teile.untertitel && <p className="text-[15px] text-white/85">{teile.untertitel}</p>}
    </>
  );
}

/**
 * "Stärkt"-Pills (Home v12): je gestärkter Kompetenz eine Pill mit
 * Mini-Ring und kleinem Glow, Klick führt auf die Kompetenzseite. Ohne
 * Zuordnung Lektion → Kompetenz: nichts.
 */
function StaerktPills({ kompetenzen }: { kompetenzen?: StaerktKompetenz[] }) {
  if (!kompetenzen || kompetenzen.length === 0) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {kompetenzen.map(({ id, name }) => (
        <li key={id}>
          <Link
            href={kompetenzHref(id)}
            className="inline-flex items-center gap-2 rounded-full bg-white/15 py-1 pr-3 pl-1 text-[13px] text-white outline-none transition-[background-color] duration-150 hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white motion-reduce:transition-none"
          >
            <span aria-hidden="true" className="flex size-5 rounded-full shadow-glow-charge-sm">
              <svg viewBox="0 0 20 20" className="size-5">
                <circle cx="10" cy="10" r="7" strokeWidth="3" className="fill-transparent stroke-white/40" />
              </svg>
            </span>
            <span>
              <span className="text-white/85">Stärkt</span> <span className="font-semibold">{name}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** A (bevorstehend) und B (läuft gerade). */
export function FokusLive({
  live,
  laeuft,
  staerkt,
}: {
  live: LiveAktivitaet;
  laeuft: boolean;
  staerkt?: StaerktKompetenz[];
}) {
  const ziel = live.joinLink ?? (live.lessonId ? lektionHref(live.lessonId) : null);
  return (
    <FokusRahmen
      links={
        laeuft ? (
          <>
            <LimePill puls>Läuft gerade</LimePill>
            <span className={GROSS}>Jetzt</span>
          </>
        ) : (
          <>
            {ALS_NAECHSTES}
            <span className={GROSS}>{hhmm(live.start)}</span>
          </>
        )
      }
    >
      <FokusTitel titel={live.titel} icon={<Video className="size-[22px]" />} art="Live-Unterricht" />
      <StaerktPills kompetenzen={staerkt} />
      {ziel && (
        <PrimaerAktion
          href={ziel}
          extern={!!live.joinLink}
          mehr={live.lessonId && <MehrMenue lessonId={live.lessonId} />}
        >
          {laeuft ? "Jetzt beitreten" : "Zum Live-Unterricht"}
        </PrimaerAktion>
      )}
    </FokusRahmen>
  );
}

/**
 * C: offene Selbstlernlektion als Hauptaktion. `nurSelbstlernen` = heute gab
 * es keinen Live-Unterricht (v13-Stresstest): "Heute" statt "Als Nächstes".
 */
export function FokusFlex({
  lektion,
  staerkt,
  nurSelbstlernen,
}: {
  lektion: OffeneLektion;
  staerkt?: StaerktKompetenz[];
  nurSelbstlernen?: boolean;
}) {
  return (
    <FokusRahmen
      links={
        <>
          {nurSelbstlernen ? <LimePill>Heute</LimePill> : ALS_NAECHSTES}
          <span className="flex size-12 items-center justify-center rounded-2xl bg-white/15 text-white md:size-16">
            <BookOpen className="size-6 md:size-8" aria-hidden="true" />
          </span>
        </>
      }
    >
      <span className="text-sm text-white/85">
        {nurSelbstlernen ? "Selbstlernen · flexibel" : "Selbstlernen · Wissen festigen"}
      </span>
      <FokusTitel titel={lektion.titel} />
      <StaerktPills kompetenzen={staerkt} />
      <PrimaerAktion href={lektionHref(lektion.lessonId)}>Weiterlernen</PrimaerAktion>
    </FokusRahmen>
  );
}

/**
 * D: alles erledigt, Vorschau auf den nächsten geplanten Tag. Die heute
 * gestärkten Ringe nur, wenn es keinen Modul-Fortschritt gibt (sonst stehen
 * sie dort schon unter "Heute stärkst du").
 */
export function FokusErledigt({
  naechsterTag,
  gestaerkt,
}: {
  naechsterTag: string | null;
  gestaerkt: GestaerkteKompetenz[];
}) {
  return (
    <FokusRahmen
      rechts={
        gestaerkt.length > 0 && (
          <div className="flex flex-col gap-3">
            <span className="text-sm font-semibold text-white/85">Heute gestärkt</span>
            <ul className="flex flex-wrap gap-7">
              {gestaerkt.slice(0, 3).map((k) => (
                <li
                  key={k.id}
                  aria-label={`${k.name}, ${k.prozent} Prozent, heute dran`}
                  className="flex w-24 flex-col items-center gap-2.5 text-center"
                >
                  <Ring prozent={k.prozent} glow dunkel />
                  <span aria-hidden="true" className="text-[13px] leading-snug text-white/85">
                    {k.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )
      }
    >
      <LimePill>Für heute</LimePill>
      <h3 className="font-heading text-[36px] leading-none font-normal md:text-[48px]">Alles erledigt</h3>
      {naechsterTag && (
        <span className="mt-1 inline-flex items-center gap-2.5 text-[15px] text-white/85">
          <CalendarDays className="size-[18px] shrink-0" aria-hidden="true" />
          {naechsterTag}
        </span>
      )}
    </FokusRahmen>
  );
}

/**
 * E: Praxistag. Field Jobs haben keine Uhrzeit (Analyse, Datenprüfung) --
 * deshalb groß "Heute" statt einer erfundenen Zeit. Der Button führt laut
 * Entscheidung vom 2026-10-09 in die Demo-Seite /praxisflow-demo.
 */
export function FokusPraxis({ praxis, staerkt }: { praxis: PraxisAktivitaet; staerkt?: StaerktKompetenz[] }) {
  return (
    <FokusRahmen
      praxis
      links={
        <>
          {ALS_NAECHSTES}
          <span className={GROSS}>Heute</span>
        </>
      }
    >
      <span className="inline-flex items-center gap-2 text-sm text-white/85">
        <AnkerIcon>
          <Wrench className="size-4" aria-hidden="true" />
        </AnkerIcon>
        {praxis.standort ? `Praxisaufgabe · ${praxis.standort}` : "Praxisaufgabe"}
      </span>
      <FokusTitel titel={praxis.titel} />
      <StaerktPills kompetenzen={staerkt} />
      <PrimaerAktion href="/praxisflow-demo">Praxisaufgabe öffnen</PrimaerAktion>
    </FokusRahmen>
  );
}

/**
 * F: heute nichts geplant. Eine offene Lektion von früher steht als Leiste
 * darunter (FlexLeiste mit kopf "Noch offen …").
 */
export function FokusRuhig({ naechsterTermin }: { naechsterTermin: string | null }) {
  return (
    <article className="flex flex-col justify-center gap-2 rounded-karte bg-card p-6 text-ink shadow-card md:px-9 md:py-8">
      <h3 className="text-[20px] leading-tight font-semibold md:text-[24px]">Heute ist nichts geplant</h3>
      {naechsterTermin && <p className="text-[15px] text-ink-muted">Nächster Termin: {naechsterTermin}</p>}
    </article>
  );
}

// ---------------------------------------------------------------------------
// Schmale Leisten unter der Fokus-Karte (Home v12)

// Ab 960 px rechts neben der Fokus-Karte (Entscheidung Anna 2026-10-12):
// dann untereinander und so hoch wie die Karte, die Aktion unten.
const LEISTE =
  "flex flex-wrap items-center gap-[18px] rounded-zeile px-6 py-5 text-ink min-[960px]:flex-1 min-[960px]:flex-col min-[960px]:flex-nowrap min-[960px]:items-start min-[960px]:py-6";
// Aktion als graue Pill (Annas Skizze 2026-10-12).
const LEISTE_AKTION =
  "inline-flex items-center rounded-full bg-subtle px-4 py-2 text-sm font-semibold whitespace-nowrap min-[960px]:mt-auto";
const LEISTE_NEUTRAL = "bg-card shadow-card";
const LEISTE_LINK =
  "outline-none transition-[box-shadow] duration-150 hover:shadow-card focus-visible:ring-2 focus-visible:ring-brand motion-reduce:transition-none";

function LeistenIcon({ children }: { children: ReactNode }) {
  return (
    <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-subtle text-progress">
      {children}
    </span>
  );
}

/** Typ-Icon auf einer Anker-Fläche: schlicht, ohne Kachel (Annas Skizze 2026-10-12). */
function AnkerIcon({ children }: { children: ReactNode }) {
  return (
    <span aria-hidden="true" className="flex flex-none text-white/85">
      {children}
    </span>
  );
}

function LeistenText({ kopf, art, titel, zeile }: { kopf: string; art?: string; titel: string; zeile?: string }) {
  return (
    <span className="flex min-w-0 flex-[1_1_240px] flex-col gap-[3px] min-[960px]:flex-none">
      <span className="text-[13px] text-ink-subtle">
        <span className="font-semibold">{kopf}</span>
        {art && ` · ${art}`}
      </span>
      <span className="text-base leading-snug font-semibold">{titel}</span>
      {zeile && <span className="text-sm text-ink-muted">{zeile}</span>}
    </span>
  );
}

/**
 * Selbstlernen rechts neben der Fokus-Karte, als knapper Aufruf
 * (Entscheidung Anna 2026-10-12): "Wissen festigen" bzw. "Nachholen" im
 * Titel-Stil der Karte,
 * klein wann + Lektion, unten der Knopf. Neutral statt Lila, damit nur die
 * Fokus-Karte farbig ist: weiße Karte wie "Im Modul … stärkst du" (Wahl
 * Anna 2026-10-12).
 * Keine "Stärkt"-Pills hier, die stehen schon auf der Karte.
 * Auch während des Unterrichts (B) aktiv mit "Jetzt festigen" --
 * Entscheidung Anna 2026-10-12, statt ausgegraut "Nach dem Unterricht".
 */
export function FlexLeiste({
  lektion,
  kopf,
}: {
  lektion: OffeneLektion;
  /** Gesetzt = Lektion von einem früheren Tag ("Noch offen von …"). */
  kopf?: string;
}) {
  const nachholen = !!kopf;
  const inhalt = (
    <>
      <span className="flex flex-col gap-2">
        <span className={cn("flex items-center gap-2.5 text-ink", KARTEN_TITEL)}>
          {/* Selbstlernen-Zeichen wie überall: Buch in Eco Green. */}
          <BookOpen className="size-[22px] flex-none text-self" aria-hidden="true" />
          {nachholen ? "Nachholen" : "Wissen festigen"}
        </span>
        <span className="line-clamp-2 text-[15px] text-ink-muted">
          {kopf ?? "Flexibel"} · {titelTeile(lektion.titel).titel}
        </span>
      </span>
      <span
        className={cn(
          // Leichter Knopf (Entscheidung Anna 2026-10-12): Grau statt Dunkel.
          "mt-auto inline-flex min-h-11 items-center gap-2 self-start rounded-full bg-subtle px-5 text-[15px] font-semibold text-ink",
        )}
      >
        {nachholen ? "Jetzt nachholen" : "Jetzt festigen"}
        <ArrowRight className="size-[17px]" aria-hidden="true" />
      </span>
    </>
  );
  const rahmen = cn(
    "flex flex-col gap-5 rounded-karte p-6 min-[960px]:flex-1 md:px-7 md:py-7",
    "bg-card shadow-card",
  );
  return (
    <Link href={lektionHref(lektion.lessonId)} className={cn(rahmen, LEISTE_LINK)}>
      {inhalt}
    </Link>
  );
}

/** C: zuletzt erledigte Live-Session mit Weg zu den Unterlagen. */
export function ErledigtLeiste({ erledigt }: { erledigt: ErledigtEintrag[] }) {
  const live = [...erledigt].reverse().find((e) => e.typ === "live");
  if (!live || live.typ !== "live") return null;
  return (
    <div className={cn(LEISTE, LEISTE_NEUTRAL)}>
      <LeistenIcon>
        <Check className="size-5" aria-hidden="true" />
      </LeistenIcon>
      <LeistenText kopf="Erledigt" art={`Live-Unterricht ${hhmm(live.start)}`} titel={titelTeile(live.titel).titel} />
      {live.lessonId && (
        <Link href={lektionHref(live.lessonId)} className={cn(LEISTE_AKTION, LINK_FOKUS)}>
          Unterlagen ansehen →
        </Link>
      )}
    </div>
  );
}

const ERLEDIGT_TEXT: Record<ErledigtEintrag["typ"], string> = {
  live: "Live-Unterricht",
  flex: "Wissen festigen",
  praxis: "Praxisaufgabe",
};

/** D: was heute erledigt wurde, mit Häkchen. */
export function HeuteErledigtLeiste({ erledigt }: { erledigt: ErledigtEintrag[] }) {
  return (
    <div className={cn(LEISTE, LEISTE_NEUTRAL)}>
      <LeistenIcon>
        <Check className="size-5" aria-hidden="true" />
      </LeistenIcon>
      <span className="flex min-w-0 flex-[1_1_240px] flex-col gap-1.5 min-[960px]:flex-none">
        <span className="text-[13px] font-semibold text-ink-subtle">Heute erledigt</span>
        <ul className="flex flex-wrap gap-x-5 gap-y-1">
          {erledigt.map((e, i) => (
            <li key={i} className="inline-flex items-center gap-1.5 text-[15px]">
              <Check className="size-4 shrink-0 text-progress" aria-hidden="true" />
              {ERLEDIGT_TEXT[e.typ]}
              <span className="sr-only">: {e.titel}</span>
            </li>
          ))}
        </ul>
      </span>
      <Link href="/schedule?ansicht=woche" className={cn(LEISTE_AKTION, LINK_FOKUS)}>
        Woche ansehen →
      </Link>
    </div>
  );
}

/** Home v13: dezente Zeile mit dem nächsten geplanten Tag, wenn sonst nichts unter der Fokus-Karte steht. */
export function NaechsterTagZeile({ wann, was }: { wann: string; was: string }) {
  return (
    <p className="rounded-zeile border border-dashed border-line px-5 py-4 text-sm text-ink-muted">
      {wann}: <span className="font-semibold text-ink">{was}</span>
    </p>
  );
}
