import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, BookOpen, CalendarDays, Check, Video, Wrench } from "lucide-react";

import { titelTeile, type ErledigtEintrag, type LiveAktivitaet, type PraxisAktivitaet } from "@/lib/home-tag";
import { Ring } from "@/components/fortschritts-ring";
import { cn } from "@/lib/utils";

import { MehrMenue } from "./mehr-menue";

// Home v12 (docs/design_handoff_home_v6/design/home-v12-referenz.html;
// Logik und Zustände aus dem Brief v6, SR folgt): die Karten des Bereichs
// "Dein Tag" für die Zustände A-F -- oben die dunkle Fokus-Karte, darunter
// eine schmale helle Leiste. Reine Darstellung -- welcher Zustand gilt,
// entscheidet getDayState().

const PRIMAER_BUTTON =
  "inline-flex min-h-12 items-center gap-2.5 rounded-xl bg-charge-green px-[22px] text-[15px] font-bold text-eco-deep-green outline-none transition-[filter] duration-150 hover:brightness-95 focus-visible:ring-2 focus-visible:ring-charge-green focus-visible:ring-offset-2 focus-visible:ring-offset-eco-deep-green motion-reduce:transition-none";

const LINK_FOKUS = "rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-eco-green";

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

/** Dunkle Fokus-Karte: links Kennzeichnung + großes Element, rechts Inhalt. */
function FokusRahmen({ links, rechts, children }: { links?: ReactNode; rechts?: ReactNode; children: ReactNode }) {
  return (
    <article className="flex flex-wrap items-start gap-x-9 gap-y-5 rounded-[20px] bg-eco-deep-green p-6 text-white md:px-9 md:py-8">
      {links && <div className="flex flex-none flex-col gap-1.5 pt-0.5">{links}</div>}
      <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-2">{children}</div>
      {rechts && <div className="flex-none">{rechts}</div>}
    </article>
  );
}

const ALS_NAECHSTES = <span className="text-[13px] font-semibold text-charge-green">Als Nächstes</span>;
const GROSS = "font-heading text-[48px] leading-none tabular-nums md:text-[64px]";

/** Kurzer Titel (max. 2 Zeilen) + Untertitel aus dem Klammertext. */
function FokusTitel({ titel }: { titel: string }) {
  const teile = titelTeile(titel);
  return (
    <>
      <h3 className="line-clamp-2 text-[20px] leading-tight font-semibold md:text-[24px]">{teile.titel}</h3>
      {teile.untertitel && <p className="text-[15px] text-white/70">{teile.untertitel}</p>}
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
            className="inline-flex items-center gap-2.5 rounded-full bg-white/8 py-1.5 pr-3.5 pl-1.5 text-sm font-medium text-white outline-none transition-[background-color] duration-150 hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-charge-green motion-reduce:transition-none"
          >
            <span aria-hidden="true" className="flex size-6 rounded-full shadow-glow-charge-sm">
              <svg viewBox="0 0 24 24" className="size-6">
                <circle cx="12" cy="12" r="8.5" strokeWidth="3.5" className="fill-eco-deep-green stroke-white/25" />
              </svg>
            </span>
            <span>
              <span className="text-white/70">Stärkt</span> {name}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** A (bevorstehend) und B (läuft gerade). */
export function FokusLive({ live, laeuft, staerkt }: { live: LiveAktivitaet; laeuft: boolean; staerkt?: StaerktKompetenz[] }) {
  const ziel = live.joinLink ?? (live.lessonId ? lektionHref(live.lessonId) : null);
  return (
    <FokusRahmen
      links={
        laeuft ? (
          <>
            <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-lylac-on-dark">
              <span
                aria-hidden="true"
                className="size-[9px] rounded-full bg-lylac-on-dark ring-[5px] ring-lylac-on-dark/25 motion-safe:animate-pulse"
              />
              Läuft gerade
            </span>
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
      <span className="inline-flex items-center gap-2 text-sm text-lylac-on-dark">
        <Video className="size-4 shrink-0" aria-hidden="true" />
        {laeuft ? `Live-Unterricht · seit ${hhmm(live.start)}` : "Live-Unterricht"}
      </span>
      <FokusTitel titel={live.titel} />
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
          {nurSelbstlernen ? <span className="text-[13px] font-semibold text-charge-green">Heute</span> : ALS_NAECHSTES}
          <span className="flex size-12 items-center justify-center rounded-2xl bg-eco-green-on-dark/15 text-eco-green-on-dark md:size-16">
            <BookOpen className="size-6 md:size-8" aria-hidden="true" />
          </span>
        </>
      }
    >
      <span className="text-sm text-eco-green-on-dark">
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
            <span className="text-sm font-semibold text-white/75">Heute gestärkt</span>
            <ul className="flex flex-wrap gap-7">
              {gestaerkt.slice(0, 3).map((k) => (
                <li
                  key={k.id}
                  aria-label={`${k.name}, ${k.prozent} Prozent, heute dran`}
                  className="flex w-24 flex-col items-center gap-2.5 text-center"
                >
                  <Ring prozent={k.prozent} glow dunkel />
                  <span aria-hidden="true" className="text-[13px] leading-snug text-white/75">
                    {k.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )
      }
    >
      <span className="text-[13px] font-semibold text-charge-green">Für heute</span>
      <h3 className="font-heading text-[36px] leading-none font-normal md:text-[48px]">Alles erledigt</h3>
      {naechsterTag && (
        <span className="mt-1 inline-flex items-center gap-2.5 text-[15px] text-white/80">
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
      links={
        <>
          {ALS_NAECHSTES}
          <span className={GROSS}>Heute</span>
        </>
      }
    >
      <span className="inline-flex items-center gap-2 text-sm text-coral">
        <Wrench className="size-4 shrink-0" aria-hidden="true" />
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
    <article className="flex flex-col justify-center gap-2 rounded-[20px] bg-off-white p-6 text-eco-deep-green md:px-9 md:py-8">
      <h3 className="text-[20px] leading-tight font-semibold md:text-[24px]">Heute ist nichts geplant</h3>
      {naechsterTermin && <p className="text-[15px] text-muted-foreground">Nächster Termin: {naechsterTermin}</p>}
    </article>
  );
}

// ---------------------------------------------------------------------------
// Schmale Leisten unter der Fokus-Karte (Home v12)

const LEISTE = "flex flex-wrap items-center gap-[18px] rounded-[18px] bg-off-white px-6 py-5 text-eco-deep-green";
const LEISTE_LINK =
  "outline-none transition-[background-color] duration-150 hover:bg-eco-green/10 focus-visible:ring-2 focus-visible:ring-eco-green motion-reduce:transition-none";

function LeistenIcon({ children }: { children: ReactNode }) {
  return (
    <span className="flex size-11 flex-none items-center justify-center rounded-xl bg-white text-eco-green">
      {children}
    </span>
  );
}

function LeistenText({ kopf, art, titel, zeile }: { kopf: string; art?: string; titel: string; zeile?: string }) {
  return (
    <span className="flex min-w-0 flex-[1_1_240px] flex-col gap-[3px]">
      <span className="text-[13px] text-muted-foreground">
        <span className="font-semibold">{kopf}</span>
        {art && ` · ${art}`}
      </span>
      <span className="text-[17px] leading-snug font-semibold">{titel}</span>
      {zeile && <span className="text-sm text-muted-foreground">{zeile}</span>}
    </span>
  );
}

/**
 * Selbstlernen als Leiste: "Danach · flexibel" (A, E), ausgegraut "Nach dem
 * Unterricht" (B) oder "Noch offen von …" (E, F). Titel = kurzer
 * Lektionstitel (Entscheidung Anna 2026-10-10: nicht "Wiederholung zum
 * Live-Unterricht" wie in der v12-Referenz). Es gibt nur offen/erledigt,
 * keinen Stand "begonnen" -- daher "Noch offen" + "Weiterlernen" statt
 * "Starten".
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
      <LeistenIcon>
        <BookOpen className="size-5" aria-hidden="true" />
      </LeistenIcon>
      <LeistenText kopf={kopf} art="Selbstlernen" titel={titelTeile(lektion.titel).titel} zeile="Noch offen" />
      <span className="text-[15px] font-semibold whitespace-nowrap">
        {gedimmt ? "Nach dem Unterricht" : "Weiterlernen →"}
      </span>
    </>
  );
  // B: bewusst kein Link -- während des Unterrichts keine zweite Aktion.
  // Gedimmt über die Textfarbe (#666, 5.25:1), nicht über Deckkraft.
  return gedimmt ? (
    <div className={cn(LEISTE, "text-muted-foreground")}>{inhalt}</div>
  ) : (
    <Link href={lektionHref(lektion.lessonId)} className={cn(LEISTE, LEISTE_LINK)}>
      {inhalt}
    </Link>
  );
}

/** C: zuletzt erledigte Live-Session mit Weg zu den Unterlagen. */
export function ErledigtLeiste({ erledigt }: { erledigt: ErledigtEintrag[] }) {
  const live = [...erledigt].reverse().find((e) => e.typ === "live");
  if (!live || live.typ !== "live") return null;
  return (
    <div className={LEISTE}>
      <LeistenIcon>
        <Check className="size-5" aria-hidden="true" />
      </LeistenIcon>
      <LeistenText kopf="Erledigt" art={`Live-Unterricht ${hhmm(live.start)}`} titel={titelTeile(live.titel).titel} />
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
  flex: "Wissen festigen",
  praxis: "Praxisaufgabe",
};

/** D: was heute erledigt wurde, mit Häkchen. */
export function HeuteErledigtLeiste({ erledigt }: { erledigt: ErledigtEintrag[] }) {
  return (
    <div className={LEISTE}>
      <LeistenIcon>
        <Check className="size-5" aria-hidden="true" />
      </LeistenIcon>
      <span className="flex min-w-0 flex-[1_1_240px] flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-muted-foreground">Heute erledigt</span>
        <ul className="flex flex-wrap gap-x-5 gap-y-1">
          {erledigt.map((e, i) => (
            <li key={i} className="inline-flex items-center gap-1.5 text-[15px]">
              <Check className="size-4 shrink-0 text-eco-green" aria-hidden="true" />
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
    <p className="rounded-2xl border border-dashed border-border px-5 py-4 text-sm text-muted-foreground">
      {wann}: <span className="font-semibold text-eco-deep-green">{was}</span>
    </p>
  );
}
