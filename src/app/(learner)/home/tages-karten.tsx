import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, BookOpen, CalendarDays, Check, Video, Wrench } from "lucide-react";

import type { ErledigtEintrag, FlexAktivitaet, LiveAktivitaet, PraxisAktivitaet } from "@/lib/home-tag";
import { cn } from "@/lib/utils";

import { Ring } from "./kompetenz-bereich";
import { MehrMenue } from "./mehr-menue";

// Home v6 (docs/design_handoff_home_v6, SR folgt), Brief 2.3 + 3: die
// beiden Karten des Bereichs "Dein Tag" für die Zustände A-F. Reine
// Darstellung -- welcher Zustand gilt, entscheidet getDayState().

const PRIMAER_BUTTON =
  "inline-flex min-h-[52px] items-center gap-2.5 rounded-xl bg-charge-green px-6 text-base font-bold text-eco-deep-green outline-none transition-[filter] duration-150 hover:brightness-95 focus-visible:ring-2 focus-visible:ring-charge-green focus-visible:ring-offset-2 focus-visible:ring-offset-eco-deep-green motion-reduce:transition-none";

const HELLE_KARTE = "flex min-w-0 flex-col gap-2.5 rounded-[20px] bg-off-white p-6 text-eco-deep-green md:p-8";
const HELLE_KARTE_LINK =
  "outline-none transition-[background-color] duration-150 hover:bg-eco-green/10 focus-visible:ring-2 focus-visible:ring-eco-green motion-reduce:transition-none";
const KARTEN_KOPF = "text-[13px] font-semibold text-muted-foreground";

const hhmm = (zeit: string) => zeit.slice(0, 5);
const lektionHref = (lessonId: string) => `/content/${lessonId}?von=home`;

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
      <ArrowRight className="size-[18px]" aria-hidden="true" />
    </>
  );
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
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
    <article className="flex flex-wrap items-center gap-x-11 gap-y-6 rounded-[20px] bg-eco-deep-green p-6 text-white md:px-11 md:py-10">
      {links && <div className="flex flex-none flex-col gap-2">{links}</div>}
      <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-3">{children}</div>
      {rechts && <div className="flex-none">{rechts}</div>}
    </article>
  );
}

const ALS_NAECHSTES = <span className="text-sm font-semibold text-charge-green">Als Nächstes</span>;
const GROSS = "font-heading text-[64px] leading-[0.95] tabular-nums md:text-[96px]";
const FOKUS_TITEL = "text-[22px] leading-tight font-semibold md:text-[28px]";

/** Brief 2.3: "Stärkt: A · B". Ohne Zuordnung Lektion → Kompetenz: nichts. */
function StaerktZeile({ namen }: { namen?: string[] }) {
  if (!namen || namen.length === 0) return null;
  return (
    <p className="text-sm text-white/75">
      Stärkt: <span className="text-white">{namen.join(" · ")}</span>
    </p>
  );
}

/** A (bevorstehend) und B (läuft gerade). */
export function FokusLive({ live, laeuft, staerkt }: { live: LiveAktivitaet; laeuft: boolean; staerkt?: string[] }) {
  const ziel = live.joinLink ?? (live.lessonId ? lektionHref(live.lessonId) : null);
  return (
    <FokusRahmen
      links={
        laeuft ? (
          <>
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-lylac-on-dark">
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
      <span className="inline-flex items-center gap-2 text-[15px] text-lylac-on-dark">
        <Video className="size-[18px] shrink-0" aria-hidden="true" />
        {laeuft ? `Live-Unterricht · seit ${hhmm(live.start)}` : "Live-Unterricht"}
      </span>
      <h3 className={FOKUS_TITEL}>{live.titel}</h3>
      <StaerktZeile namen={staerkt} />
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

/** C: offene Selbstlernlektion als Hauptaktion. */
export function FokusFlex({ lektion, staerkt }: { lektion: FlexAktivitaet; staerkt?: string[] }) {
  return (
    <FokusRahmen
      links={
        <>
          {ALS_NAECHSTES}
          <span className="flex size-16 items-center justify-center rounded-3xl bg-eco-green-on-dark/15 text-eco-green-on-dark md:size-24">
            <BookOpen className="size-8 md:size-10" aria-hidden="true" />
          </span>
        </>
      }
    >
      <span className="text-[15px] text-eco-green-on-dark">Selbstlernen · Wissen festigen</span>
      <h3 className={FOKUS_TITEL}>{lektion.titel}</h3>
      <StaerktZeile namen={staerkt} />
      <PrimaerAktion href={lektionHref(lektion.lessonId)}>Weiterlernen</PrimaerAktion>
    </FokusRahmen>
  );
}

export type GestaerkteKompetenz = { id: string; name: string; prozent: number };

/** D: alles erledigt, Vorschau auf den nächsten geplanten Tag + heute gestärkte Ringe mit Glow. */
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
      <span className="text-sm font-semibold text-charge-green">Für heute</span>
      <h3 className="font-heading text-[40px] leading-none font-normal md:text-[56px]">Alles erledigt</h3>
      {naechsterTag && (
        <span className="mt-1 inline-flex items-center gap-2.5 text-base text-white/80">
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
export function FokusPraxis({ praxis, staerkt }: { praxis: PraxisAktivitaet; staerkt?: string[] }) {
  return (
    <FokusRahmen
      links={
        <>
          {ALS_NAECHSTES}
          <span className={GROSS}>Heute</span>
        </>
      }
    >
      <span className="inline-flex items-center gap-2 text-[15px] text-coral">
        <Wrench className="size-[18px] shrink-0" aria-hidden="true" />
        {praxis.standort ? `Praxisaufgabe · ${praxis.standort}` : "Praxisaufgabe"}
      </span>
      <h3 className={FOKUS_TITEL}>{praxis.titel}</h3>
      <StaerktZeile namen={staerkt} />
      <PrimaerAktion href="/praxisflow-demo">Praxisaufgabe öffnen</PrimaerAktion>
    </FokusRahmen>
  );
}

/** F: heute nichts geplant. */
export function FokusRuhig({ naechsterTermin }: { naechsterTermin: string | null }) {
  return (
    <article className="flex flex-col justify-center gap-2 rounded-[20px] bg-off-white p-6 text-eco-deep-green md:px-11 md:py-10">
      <h3 className={FOKUS_TITEL}>Heute ist nichts geplant</h3>
      {naechsterTermin && <p className="text-[15px] text-muted-foreground">Nächster Termin: {naechsterTermin}</p>}
    </article>
  );
}

/**
 * "Danach · flexibel" (A, E) bzw. ausgegraut "Nach dem Unterricht" (B).
 * Es gibt nur offen/erledigt, keinen Prozentwert -- deshalb kein Balken
 * (Brief 6, Fallback).
 */
export function FlexKarte({ lektion, gedimmt }: { lektion: FlexAktivitaet; gedimmt?: boolean }) {
  const inhalt = (
    <>
      <span className={KARTEN_KOPF}>Danach · flexibel</span>
      <span className="mt-1 inline-flex items-center gap-2 text-[15px] font-medium">
        <BookOpen className={cn("size-[18px] shrink-0", !gedimmt && "text-eco-green")} aria-hidden="true" />
        Selbstlernen · Wissen festigen
      </span>
      <span className="text-[19px] leading-snug font-semibold">{lektion.titel}</span>
      {gedimmt ? (
        <span className="mt-auto pt-3 text-sm">Nach dem Unterricht</span>
      ) : (
        <>
          <span className="text-sm text-muted-foreground">Noch offen</span>
          <span className="mt-auto pt-3 text-[15px] font-semibold">Weiterlernen →</span>
        </>
      )}
    </>
  );
  // B: bewusst kein Link -- während des Unterrichts keine zweite Aktion.
  // Gedimmt über die Textfarbe (#666, 5.25:1), nicht über Deckkraft.
  return gedimmt ? (
    <div className={cn(HELLE_KARTE, "text-muted-foreground")}>{inhalt}</div>
  ) : (
    <Link href={lektionHref(lektion.lessonId)} className={cn(HELLE_KARTE, HELLE_KARTE_LINK)}>
      {inhalt}
    </Link>
  );
}

/** C: zuletzt erledigte Live-Session mit Weg zu den Unterlagen. */
export function ErledigtKarte({ erledigt }: { erledigt: ErledigtEintrag[] }) {
  const live = [...erledigt].reverse().find((e) => e.typ === "live");
  if (!live || live.typ !== "live") return null;
  return (
    <div className={HELLE_KARTE}>
      <span className={KARTEN_KOPF}>Erledigt</span>
      <span className="mt-1 inline-flex items-center gap-2 text-[15px]">
        <Check className="size-[18px] shrink-0 text-eco-green" aria-hidden="true" />
        {hhmm(live.start)} · Live-Unterricht
      </span>
      <span className="text-[19px] leading-snug font-semibold">{live.titel}</span>
      {live.lessonId && (
        <Link
          href={lektionHref(live.lessonId)}
          className="mt-auto self-start rounded-sm pt-3 text-[15px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-eco-green"
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

/** D: Liste von heute mit Häkchen. */
export function HeuteErledigtKarte({ erledigt }: { erledigt: ErledigtEintrag[] }) {
  return (
    <div className={HELLE_KARTE}>
      <span className={KARTEN_KOPF}>Heute erledigt</span>
      <ul className="mt-1 flex flex-col gap-2">
        {erledigt.map((e, i) => (
          <li key={i} className="flex items-start gap-2 text-[15px]">
            <Check className="mt-0.5 size-[18px] shrink-0 text-eco-green" aria-hidden="true" />
            <span>
              {ERLEDIGT_TEXT[e.typ]}
              <span className="sr-only">: {e.titel}</span>
            </span>
          </li>
        ))}
      </ul>
      <Link
        href="/schedule"
        className="mt-auto self-start rounded-sm pt-3 text-[15px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-eco-green"
      >
        Woche ansehen →
      </Link>
    </div>
  );
}
