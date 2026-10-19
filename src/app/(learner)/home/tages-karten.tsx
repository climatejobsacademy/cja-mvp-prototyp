import Link from "next/link";
import type { ReactNode } from "react";
import { PRAXISAUFGABE_LINK } from "@/lib/schalter";
import { ArrowRight, BookOpen, CalendarDays, Check, Video, Wrench } from "lucide-react";

import type { ErledigtEintrag, LiveAktivitaet, PraxisAktivitaet } from "@/lib/home-tag";
import type { TrainerAnzeige } from "@/lib/queries/trainer";
import { Ring } from "@/components/fortschritts-ring";
import { ModulZeichen } from "@/components/modul-zeichen";
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
  "inline-flex min-h-11 items-center gap-2 rounded-full bg-lime px-5 text-[15px] font-bold text-on-lime outline-none transition-[filter] duration-150 hover:brightness-95 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand motion-reduce:transition-none";

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
        "flex flex-wrap items-start gap-x-7 gap-y-4 rounded-karte p-6 md:px-7 md:py-7",
        // Praxis im Marken-Coral mit dunkler Schrift (Anna 2026-10-12, Weiß auf Coral nur 1.93:1).
        praxis ? "bg-anchor-praxis text-ink shadow-anchor-praxis" : "bg-anchor-brand text-white shadow-anchor-brand"
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
const GROSS = "font-heading text-[44px] leading-none tabular-nums md:text-[56px]";

/**
 * Titel einer Lektion (Entscheidung Anna 2026-10-12, auf allen Seiten
 * gleich): klein das Modul ("Modul I · Grundlagen Elektrotechnik", aus der
 * Modul-Ebene), groß das Thema der Lektion (lesson.thema, sonst der Titel).
 * Optional ein Typ-Icon direkt vor dem Thema; `art` liest der Screenreader mit.
 */
export type TitelStil = { modul: { ueberzeile: string; name: string } | null };

const KARTEN_TITEL = "text-[20px] leading-tight font-semibold md:text-[22px]";

function FokusTitel({
  titel,
  thema,
  icon,
  art,
  stil,
  aufCoral,
}: {
  titel: string;
  thema?: string | null;
  icon?: ReactNode;
  art?: string;
  stil?: TitelStil;
  /** Praxis-Karte (helles Coral): dunkle Schrift */
  aufCoral?: boolean;
}) {
  return (
    <>
      {stil?.modul && (
        <ModulZeichen hell={!aufCoral} aufCoral={aufCoral} ueberzeile={stil.modul.ueberzeile} name={stil.modul.name} />
      )}
      <h3 className={cn("flex items-center gap-2.5", KARTEN_TITEL)}>
        {icon && (
          <span aria-hidden="true" className={cn("flex flex-none", aufCoral ? "text-ink" : "text-white/85")}>
            {icon}
          </span>
        )}
        <span className="line-clamp-2">
          {art && <span className="sr-only">{art}: </span>}
          {thema ?? titel}
        </span>
      </h3>
    </>
  );
}

/** "Live mit …" / "Praxis mit …" mit Foto (SR-78); ohne eingetragene Person nichts. */
function FokusTrainer({
  art,
  trainer,
  aufCoral,
}: {
  art: "live" | "praxis";
  trainer?: TrainerAnzeige | null;
  aufCoral?: boolean;
}) {
  if (!trainer) return null;
  return (
    <TrainerZeile
      art={art}
      trainer={trainer}
      className={cn("mt-1", art === "praxis" || aufCoral ? "text-ink" : "text-white/85")}
    />
  );
}

/**
 * "Stärkt"-Pills (Home v12): je gestärkter Kompetenz eine Pill mit
 * Mini-Ring und kleinem Glow, Klick führt auf die Kompetenzseite. Ohne
 * Zuordnung Lektion → Kompetenz: nichts.
 */
function StaerktPills({ kompetenzen, aufCoral }: { kompetenzen?: StaerktKompetenz[]; aufCoral?: boolean }) {
  if (!kompetenzen || kompetenzen.length === 0) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {kompetenzen.map(({ id, name }) => (
        <li key={id}>
          <Link
            href={kompetenzHref(id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-[13px] outline-none transition-[background-color] duration-150 focus-visible:ring-2 motion-reduce:transition-none",
              aufCoral
                ? "bg-white/45 text-ink hover:bg-white/65 focus-visible:ring-ink"
                : "bg-white/15 text-white hover:bg-white/25 focus-visible:ring-white"
            )}
          >
            <span aria-hidden="true" className="flex size-5 rounded-full shadow-glow-charge-sm">
              <svg viewBox="0 0 20 20" className="size-5">
                <circle cx="10" cy="10" r="7" strokeWidth="3" className={cn("fill-transparent", aufCoral ? "stroke-ink/30" : "stroke-white/40")} />
              </svg>
            </span>
            <span>
              <span className={aufCoral ? "text-ink" : "text-white/85"}>Stärkt</span>{" "}
              <span className="font-semibold">{name}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// An einem Praxistag sind alle Fokus-Karten in Coral, nicht nur die
// Praxistag-Karte selbst (Anna 2026-10-19): Prop `praxis`.

/** A (bevorstehend) und B (läuft gerade). */
export function FokusLive({
  live,
  laeuft,
  staerkt,
  trainer,
  stil,
  praxis,
}: {
  live: LiveAktivitaet;
  laeuft: boolean;
  staerkt?: StaerktKompetenz[];
  trainer?: TrainerAnzeige | null;
  stil?: TitelStil;
  /** Heute ist ein Praxistag: Karte in Coral */
  praxis?: boolean;
}) {
  const ziel = live.joinLink ?? (live.lessonId ? lektionHref(live.lessonId) : null);
  return (
    <FokusRahmen
      praxis={praxis}
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
      {/* Wie demo (Anna 2026-10-12): Kamera-Symbol vor dem Thema, keine eigene Typzeile. */}
      <FokusTitel
        titel={live.titel}
        thema={live.thema}
        icon={<Video className="size-[22px]" />}
        art={laeuft ? `Live-Unterricht, seit ${hhmm(live.start)}` : "Live-Unterricht"}
        stil={stil}
        aufCoral={praxis}
      />
      <FokusTrainer art="live" trainer={trainer} aufCoral={praxis} />
      <StaerktPills kompetenzen={staerkt} aufCoral={praxis} />
      {ziel && (
        <PrimaerAktion
          href={ziel}
          extern={!!live.joinLink}
          mehr={live.lessonId && <MehrMenue lessonId={live.lessonId} aufCoral={praxis} />}
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
  stil,
  praxis,
}: {
  lektion: OffeneLektion & { thema: string | null; festigt: boolean };
  staerkt?: StaerktKompetenz[];
  nurSelbstlernen?: boolean;
  stil?: TitelStil;
  /** Heute ist ein Praxistag: Karte in Coral */
  praxis?: boolean;
}) {
  return (
    <FokusRahmen
      praxis={praxis}
      links={
        <>
          {nurSelbstlernen ? <LimePill>Heute</LimePill> : ALS_NAECHSTES}
          <span
            className={cn(
              "flex size-12 items-center justify-center rounded-2xl md:size-16",
              praxis ? "bg-white/45 text-ink" : "bg-white/15 text-white"
            )}
          >
            <BookOpen className="size-6 md:size-8" aria-hidden="true" />
          </span>
        </>
      }
    >
      <span className={cn("text-sm", praxis ? "text-ink/80" : "text-white/85")}>
        {lektion.festigt ? "Selbstlernen · Wissen festigen" : "Selbstlernen · flexibel"}
      </span>
      <FokusTitel titel={lektion.titel} thema={lektion.thema} stil={stil} aufCoral={praxis} />
      <StaerktPills kompetenzen={staerkt} aufCoral={praxis} />
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
  praxis,
}: {
  naechsterTag: string | null;
  gestaerkt: GestaerkteKompetenz[];
  praxis?: boolean;
}) {
  const leise = praxis ? "text-ink/80" : "text-white/85";
  return (
    <FokusRahmen
      praxis={praxis}
      rechts={
        gestaerkt.length > 0 && (
          <div className="flex flex-col gap-3">
            <span className={cn("text-sm font-semibold", leise)}>Heute gestärkt</span>
            <ul className="flex flex-wrap gap-7">
              {gestaerkt.slice(0, 3).map((k) => (
                <li
                  key={k.id}
                  aria-label={`${k.name}, ${k.prozent} Prozent, heute dran`}
                  className="flex w-24 flex-col items-center gap-2.5 text-center"
                >
                  <Ring prozent={k.prozent} glow dunkel={!praxis} />
                  <span aria-hidden="true" className={cn("text-[13px] leading-snug", leise)}>
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
        <span className={cn("mt-1 inline-flex items-center gap-2.5 text-[15px]", leise)}>
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
  stil,
}: {
  praxis: PraxisAktivitaet;
  staerkt?: StaerktKompetenz[];
  trainer?: TrainerAnzeige | null;
  stil?: TitelStil;
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
      <span className="inline-flex items-center gap-2 text-sm text-ink">
        <Wrench className="size-4 flex-none" aria-hidden="true" />
        {praxis.standort ? `Praxisaufgabe · ${praxis.standort}` : "Praxisaufgabe"}
      </span>
      <FokusTitel titel={praxis.titel} stil={stil} aufCoral />
      <FokusTrainer art="praxis" trainer={trainer} />
      <StaerktPills kompetenzen={staerkt} aufCoral />
      {PRAXISAUFGABE_LINK && (
        <PrimaerAktion href={`/praxistag/${praxis.fieldJobId}?von=home`}>Praxisaufgabe öffnen</PrimaerAktion>
      )}
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
// Kästchen rechts neben der Fokus-Karte (Entscheidung Anna 2026-10-12)

const LEISTE_LINK =
  "outline-none transition-[box-shadow] duration-150 hover:shadow-card focus-visible:ring-2 focus-visible:ring-brand motion-reduce:transition-none";

// Kompaktes Kästchen, gleiches Prinzip für alle: Symbol, kurzer Titel, eine
// Zeile darunter, Pfeil; das ganze Kästchen ist der Link. Mehrere teilen sich
// die Höhe der Fokus-Karte.
const KAESTCHEN =
  "flex items-center gap-3 rounded-karte bg-card px-5 py-4 text-ink shadow-card min-[960px]:min-h-0 min-[960px]:flex-1";

/**
 * Selbstlernen rechts neben der Fokus-Karte: kompaktes weißes Kästchen
 * "Wissen festigen" bzw. "Nachholen" mit dem Titel der Lektion -- auch
 * während des Unterrichts (B) anklickbar. "Wissen festigen" nur, wenn die
 * Lektion zu einer Live-Lektion gehört (live_lektion_id, 0029); sonst
 * "Selbstlernen". Zeile darunter: Starten bzw. Weiterlernen (Stand
 * "in Bearbeitung", 0029/Nr. 9).
 */
export function FlexLeiste({
  lektion,
  kopf,
  festigt = true,
}: {
  lektion: OffeneLektion;
  /** Gesetzt = Lektion von einem früheren Tag ("Noch offen von …"). */
  kopf?: string;
  /** Gehört zu einer Live-Lektion ("Wissen festigen") */
  festigt?: boolean;
}) {
  const titel = kopf ? "Nachholen" : festigt ? "Wissen festigen" : "Selbstlernen";
  return (
    <Link href={lektionHref(lektion.lessonId)} className={cn(KAESTCHEN, LEISTE_LINK)}>
      <BookOpen className="size-[22px] flex-none text-self" aria-hidden="true" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[17px] font-semibold">{titel}</span>
        <span className="line-clamp-2 text-sm text-ink-muted">
          {kopf ? `${kopf} · ` : ""}
          {lektion.titel}
          <span className="sr-only">. {lektion.begonnen ? "Weiterlernen" : "Starten"}</span>
        </span>
      </span>
      <ArrowRight className="size-[17px] flex-none text-ink-muted" aria-hidden="true" />
    </Link>
  );
}

/** C: zuletzt erledigte Live-Session mit Weg zu den Unterlagen. */
export function ErledigtLeiste({ erledigt }: { erledigt: ErledigtEintrag[] }) {
  const live = [...erledigt].reverse().find((e) => e.typ === "live");
  if (!live || live.typ !== "live" || !live.lessonId) return null;
  return (
    <Link href={lektionHref(live.lessonId)} className={cn(KAESTCHEN, LEISTE_LINK)}>
      <Check className="size-[22px] flex-none text-progress" strokeWidth={2.5} aria-hidden="true" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[17px] font-semibold">Unterlagen ansehen</span>
        <span className="line-clamp-1 text-sm text-ink-muted">
          <span className="sr-only">Erledigt: Live-Unterricht {hhmm(live.start)}, </span>
          {live.titel}
        </span>
      </span>
      <ArrowRight className="size-[17px] flex-none text-ink-muted" aria-hidden="true" />
    </Link>
  );
}

const ERLEDIGT_TEXT: Record<ErledigtEintrag["typ"], string> = {
  live: "Live-Unterricht",
  flex: "Wissen festigen",
  praxis: "Praxisaufgabe",
};

/** D: was heute erledigt wurde, mit Weg zur Woche. */
export function HeuteErledigtLeiste({ erledigt }: { erledigt: ErledigtEintrag[] }) {
  return (
    <Link href="/schedule?ansicht=woche" className={cn(KAESTCHEN, LEISTE_LINK)}>
      <Check className="size-[22px] flex-none text-progress" strokeWidth={2.5} aria-hidden="true" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[17px] font-semibold">Heute erledigt</span>
        <span className="line-clamp-1 text-sm text-ink-muted">
          {erledigt.map((e) => ERLEDIGT_TEXT[e.typ]).join(" · ")}
        </span>
      </span>
      <ArrowRight className="size-[17px] flex-none text-ink-muted" aria-hidden="true" />
    </Link>
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
