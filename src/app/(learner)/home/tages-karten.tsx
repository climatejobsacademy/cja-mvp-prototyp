import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, BookOpen, CalendarDays, Check, Video, Wrench } from "lucide-react";

import type { ErledigtEintrag, LiveAktivitaet, PraxisAktivitaet } from "@/lib/home-tag";
import type { TrainerAnzeige } from "@/lib/queries/trainer";
import { Ring } from "@/components/fortschritts-ring";
import { TrainerZeile } from "@/components/trainer-zeile";
import { cn } from "@/lib/utils";

import { MehrMenue } from "./mehr-menue";

// Home v12 (docs/design_handoff_home_v6/design/home-v12-referenz.html;
// Logik und Zustände aus dem Brief v6; SR-73): die Karten des Bereichs
// "Dein Tag" für die Zustände A-F -- oben die Fokus-Karte (Anker), darunter
// eine schmale helle Leiste. Reine Darstellung -- welcher Zustand gilt,
// entscheidet getDayState().

// Visuelles Update (docs/ux/visual-update, 2026-10-11): die Fokus-Karte ist
// der Anker der Seite -- Live/Selbstlernen/Erledigt im Lila-Verlauf, Praxis im
// Coral-Verlauf; Buttons darauf in Lime.
const PRIMAER_BUTTON =
  "inline-flex min-h-12 items-center gap-2.5 rounded-full bg-lime px-[22px] text-[15px] font-bold text-on-lime outline-none transition-[filter] duration-150 hover:brightness-95 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand motion-reduce:transition-none";

const LINK_FOKUS = "rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-brand";

const hhmm = (zeit: string) => zeit.slice(0, 5);
const lektionHref = (lessonId: string) => `/content/${lessonId}?von=home`;

export type OffeneLektion = {
  titel: string;
  lessonId: string;
  /** "in Bearbeitung" (0029/Nr. 9): "Weiterlernen" statt "Starten" */
  begonnen: boolean;
};
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
        "flex flex-wrap items-start gap-x-9 gap-y-5 rounded-karte p-6 text-white md:px-9 md:py-8",
        praxis ? "bg-anchor-praxis shadow-anchor-praxis" : "bg-anchor-brand shadow-anchor-brand"
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
      <span aria-hidden="true" className={cn("size-1.5 rounded-full bg-on-lime", puls && "motion-safe:animate-pulse")} />
      {children}
    </span>
  );
}

const ALS_NAECHSTES = <LimePill>Als Nächstes</LimePill>;
const GROSS = "font-heading text-[48px] leading-none tabular-nums md:text-[64px]";

/** Titel (max. 2 Zeilen) + Thema der Lektion (lesson.thema, 0029) als Untertitel. */
function FokusTitel({ titel, thema }: { titel: string; thema?: string | null }) {
  return (
    <>
      <h3 className="line-clamp-2 text-[20px] leading-tight font-semibold md:text-[24px]">{titel}</h3>
      {thema && <p className="text-[15px] text-white/85">{thema}</p>}
    </>
  );
}

/** "Live mit …" / "Praxis mit …" mit Foto (SR-78); ohne eingetragene Person nichts. */
function FokusTrainer({ art, trainer }: { art: "live" | "praxis"; trainer?: TrainerAnzeige | null }) {
  if (!trainer) return null;
  return <TrainerZeile art={art} trainer={trainer} className="mt-1 text-white/85" />;
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
            className="inline-flex items-center gap-2.5 rounded-full bg-white/15 py-1.5 pr-3.5 pl-1.5 text-sm font-medium text-white outline-none transition-[background-color] duration-150 hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white motion-reduce:transition-none"
          >
            <span aria-hidden="true" className="flex size-6 rounded-full shadow-glow-charge-sm">
              <svg viewBox="0 0 24 24" className="size-6">
                <circle cx="12" cy="12" r="8.5" strokeWidth="3.5" className="fill-transparent stroke-white/40" />
              </svg>
            </span>
            <span>
              <span className="text-white/85">Stärkt</span> {name}
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
  trainer,
}: {
  live: LiveAktivitaet;
  laeuft: boolean;
  staerkt?: StaerktKompetenz[];
  trainer?: TrainerAnzeige | null;
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
      <span className="inline-flex items-center gap-2 text-sm text-white/85">
        <AnkerIcon>
          <Video className="size-4" aria-hidden="true" />
        </AnkerIcon>
        {laeuft ? `Live-Unterricht · seit ${hhmm(live.start)}` : "Live-Unterricht"}
      </span>
      <FokusTitel titel={live.titel} thema={live.thema} />
      <FokusTrainer art="live" trainer={trainer} />
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
 * "Wissen festigen" nur, wenn die Lektion zu einer Live-Lektion gehört
 * (lesson.live_lektion_id, 0029/Nr. 8) -- nicht mehr über gleichen Titel.
 */
export function FokusFlex({
  lektion,
  staerkt,
  nurSelbstlernen,
}: {
  lektion: OffeneLektion & { thema: string | null; festigt: boolean };
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
        {lektion.festigt ? "Selbstlernen · Wissen festigen" : "Selbstlernen · flexibel"}
      </span>
      <FokusTitel titel={lektion.titel} thema={lektion.thema} />
      <StaerktPills kompetenzen={staerkt} />
      <PrimaerAktion href={lektionHref(lektion.lessonId)}>{lektion.begonnen ? "Weiterlernen" : "Starten"}</PrimaerAktion>
    </FokusRahmen>
  );
}

/**
 * D: alles erledigt, Vorschau auf den nächsten geplanten Tag. Die heute
 * gestärkten Ringe nur, wenn es keine Kompetenz-Spalte gibt (sonst stehen
 * sie dort schon unter "Heute dran").
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
 * E: Praxistag. Mit Uhrzeit (field_job.start, 0026) groß die Startzeit,
 * sonst "Heute" -- keine erfundene Zeit. Der Button führt in den echten
 * Praxistag (/praxistag/…), nicht in die Demo-Seite.
 */
export function FokusPraxis({
  praxis,
  staerkt,
  trainer,
}: {
  praxis: PraxisAktivitaet;
  staerkt?: StaerktKompetenz[];
  trainer?: TrainerAnzeige | null;
}) {
  return (
    <FokusRahmen
      praxis
      links={
        <>
          {ALS_NAECHSTES}
          <span className={GROSS}>{praxis.start ? hhmm(praxis.start) : "Heute"}</span>
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
      <FokusTrainer art="praxis" trainer={trainer} />
      <StaerktPills kompetenzen={staerkt} />
      <PrimaerAktion href={`/praxistag/${praxis.fieldJobId}?von=home`}>Praxisaufgabe öffnen</PrimaerAktion>
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

// Leisten: Selbstlernen auf heller Grün-Fläche, alles andere neutral weiß.
const LEISTE = "flex flex-wrap items-center gap-[18px] rounded-zeile px-6 py-5 text-ink";
const LEISTE_NEUTRAL = "bg-card shadow-card";
const LEISTE_SELBST = "bg-self-tint";
const LEISTE_LINK =
  "outline-none transition-[box-shadow] duration-150 hover:shadow-card focus-visible:ring-2 focus-visible:ring-brand motion-reduce:transition-none";

function LeistenIcon({ children, selbst }: { children: ReactNode; selbst?: boolean }) {
  return (
    <span
      className={cn(
        "flex size-11 flex-none items-center justify-center rounded-xl",
        selbst ? "bg-white text-self" : "bg-subtle text-progress"
      )}
    >
      {children}
    </span>
  );
}

/** Typ-Icon auf einer Anker-Fläche: weiß in halbtransparenter Kachel. */
function AnkerIcon({ children }: { children: ReactNode }) {
  return (
    <span aria-hidden="true" className="flex size-7 flex-none items-center justify-center rounded-lg bg-white/15 text-white">
      {children}
    </span>
  );
}

function LeistenText({ kopf, art, titel, zeile }: { kopf: string; art?: string; titel: string; zeile?: string }) {
  return (
    <span className="flex min-w-0 flex-[1_1_240px] flex-col gap-[3px]">
      <span className="text-[13px] text-ink-subtle">
        <span className="font-semibold">{kopf}</span>
        {art && ` · ${art}`}
      </span>
      <span className="text-[17px] leading-snug font-semibold">{titel}</span>
      {zeile && <span className="text-sm text-ink-muted">{zeile}</span>}
    </span>
  );
}

/**
 * Selbstlernen als Leiste: "Danach · flexibel" (A, E), ausgegraut "Nach dem
 * Unterricht" (B) oder "Noch offen von …" (E, F). Titel = Lektionstitel
 * ohne Klammer (Entscheidung Anna 2026-10-10: nicht "Wiederholung zum
 * Live-Unterricht" wie in der v12-Referenz). Mit Stand "in Bearbeitung"
 * (0029/Nr. 9) "Begonnen" + "Weiterlernen", sonst "Noch offen" + "Starten".
 */
export function FlexLeiste({
  lektion,
  kopf = "Danach · flexibel",
  gedimmt,
}: {
  lektion: OffeneLektion;
  kopf?: string;
  gedimmt?: boolean;
}) {
  const inhalt = (
    <>
      <LeistenIcon selbst>
        <BookOpen className="size-5" aria-hidden="true" />
      </LeistenIcon>
      <LeistenText kopf={kopf} art="Selbstlernen" titel={lektion.titel} zeile={lektion.begonnen ? "Begonnen" : "Noch offen"} />
      <span className="text-[15px] font-semibold whitespace-nowrap">
        {gedimmt ? "Nach dem Unterricht" : lektion.begonnen ? "Weiterlernen →" : "Starten →"}
      </span>
    </>
  );
  // B: bewusst kein Link -- während des Unterrichts keine zweite Aktion.
  // Gedimmt über die Textfarbe (--ink-muted), nicht über Deckkraft.
  return gedimmt ? (
    <div className={cn(LEISTE, LEISTE_SELBST, "text-ink-muted")}>{inhalt}</div>
  ) : (
    <Link href={lektionHref(lektion.lessonId)} className={cn(LEISTE, LEISTE_SELBST, LEISTE_LINK)}>
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
      <LeistenText kopf="Erledigt" art={`Live-Unterricht ${hhmm(live.start)}`} titel={live.titel} />
      {live.lessonId && (
        <Link
          href={lektionHref(live.lessonId)}
          className={cn("text-[15px] font-semibold whitespace-nowrap", LINK_FOKUS)}
        >
          Unterlagen ansehen →
        </Link>
      )}
    </div>
  );
}

const ERLEDIGT_TEXT: Record<ErledigtEintrag["typ"], string> = {
  live: "Live-Unterricht",
  flex: "Selbstlernen",
  praxis: "Praxisaufgabe",
};

/** D: was heute erledigt wurde, mit Häkchen. */
export function HeuteErledigtLeiste({ erledigt }: { erledigt: ErledigtEintrag[] }) {
  return (
    <div className={cn(LEISTE, LEISTE_NEUTRAL)}>
      <LeistenIcon>
        <Check className="size-5" aria-hidden="true" />
      </LeistenIcon>
      <span className="flex min-w-0 flex-[1_1_240px] flex-col gap-1.5">
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
      <Link href="/schedule?ansicht=woche" className={cn("text-[15px] font-semibold whitespace-nowrap", LINK_FOKUS)}>
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
