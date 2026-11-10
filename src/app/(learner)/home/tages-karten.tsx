import Link from "next/link";
import type { ReactNode } from "react";
import { kompetenzHref, StaerktPills, type StaerktKompetenz } from "@/components/staerkt-pills";
import { PRAXISAUFGABE_LINK } from "@/lib/schalter";
import { ArrowRight, BookOpen, CalendarDays, Check, FlaskConical, Video, Wrench } from "lucide-react";

import type { ErledigtEintrag, LiveAktivitaet, PraxisAktivitaet } from "@/lib/home-tag";
import { PHASEN } from "@/lib/praxisflow-inhalte";
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
export type { StaerktKompetenz };
export { kompetenzHref };

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
function FokusTrainer({ art, trainer }: { art: "live" | "praxis"; trainer?: TrainerAnzeige | null }) {
  if (!trainer) return null;
  return <TrainerZeile art={art} trainer={trainer} className={cn("mt-1", art === "praxis" ? "text-ink" : "text-white/85")} />;
}

/** A (bevorstehend) und B (läuft gerade). */
export function FokusLive({
  live,
  laeuft,
  staerkt,
  trainer,
  stil,
}: {
  live: LiveAktivitaet;
  laeuft: boolean;
  staerkt?: StaerktKompetenz[];
  trainer?: TrainerAnzeige | null;
  stil?: TitelStil;
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
      {/* Wie demo (Anna 2026-10-12): Kamera-Symbol vor dem Thema, keine eigene Typzeile. */}
      <FokusTitel
        titel={live.titel}
        thema={live.thema}
        icon={<Video className="size-[22px]" />}
        art={laeuft ? `Live-Unterricht, seit ${hhmm(live.start)}` : "Live-Unterricht"}
        stil={stil}
      />
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
  stil,
  etikett,
}: {
  lektion: OffeneLektion & { thema: string | null; festigt: boolean };
  staerkt?: StaerktKompetenz[];
  nurSelbstlernen?: boolean;
  stil?: TitelStil;
  /** Eigene Kennzeichnung, z. B. am Wochenende „Noch offen aus der Woche“ (SR-93) */
  etikett?: string;
}) {
  return (
    <FokusRahmen
      links={
        <>
          {etikett ? <LimePill>{etikett}</LimePill> : nurSelbstlernen ? <LimePill>Heute</LimePill> : ALS_NAECHSTES}
          <span className="flex size-12 items-center justify-center rounded-2xl bg-white/15 text-white md:size-16">
            <BookOpen className="size-6 md:size-8" aria-hidden="true" />
          </span>
        </>
      }
    >
      <span className="text-sm text-white/85">
        {lektion.festigt ? "Selbstlernen · Wissen festigen" : "Selbstlernen · flexibel"}
      </span>
      <FokusTitel titel={lektion.titel} thema={lektion.thema} stil={stil} />
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
  abends = false,
}: {
  naechsterTag: string | null;
  gestaerkt: GestaerkteKompetenz[];
  /** Ab 17 Uhr (SR-93): „Als Nächstes“ wird zum Fokus */
  abends?: boolean;
}) {
  if (abends && naechsterTag) {
    return (
      <FokusRahmen>
        {ALS_NAECHSTES}
        <h3 className="font-heading text-[36px] leading-none font-normal md:text-[48px]">{naechsterTag}</h3>
        <span className="mt-1 inline-flex items-center gap-2.5 text-[15px] text-white/85">
          <Check className="size-[18px] shrink-0" strokeWidth={2.5} aria-hidden="true" />
          Heute ist alles erledigt. Schönen Abend!
        </span>
        <PrimaerAktion href="/schedule?ansicht=woche">Zum Stundenplan</PrimaerAktion>
      </FokusRahmen>
    );
  }
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

/** Phase eines Praxisauftrags in Worten (SR-93). */
function praxisStand(p: PraxisAktivitaet): string {
  if (p.labor) return "Labortag";
  if (p.phase === "abgeschlossen") return p.ergebnis === "angerechnet" ? "Geschafft, angerechnet" : "Geschafft";
  const nr = PHASEN.findIndex((x) => x.id === p.phase);
  return nr >= 0 ? `${PHASEN[nr].name} · Phase ${nr + 1} von ${PHASEN.length}` : "Noch nicht begonnen";
}

/**
 * E: Praxistag (SR-93). Alle Praxisaufträge des Tages mit ihrer Phase, Fokus
 * auf den nächsten offenen; sind alle abgeschlossen, Erfolgsmoment mit dem
 * Ergebnis je Auftrag. Mit Uhrzeit (field_job.start, 0026) groß die
 * Startzeit, sonst "Heute" -- keine erfundene Zeit.
 */
export function FokusPraxis({
  praxis,
  alle,
  alleFertig,
  staerkt,
  trainer,
  stil,
}: {
  praxis: PraxisAktivitaet;
  alle: PraxisAktivitaet[];
  alleFertig: boolean;
  staerkt?: StaerktKompetenz[];
  trainer?: TrainerAnzeige | null;
  stil?: TitelStil;
}) {
  const mehrere = alle.length > 1;
  if (alleFertig) {
    return (
      <FokusRahmen praxis links={<LimePill>Für heute</LimePill>}>
        <h3 className="font-heading text-[36px] leading-none font-normal md:text-[48px]">
          {mehrere ? "Alle Praxisaufträge geschafft" : "Praxisauftrag geschafft"}
        </h3>
        <ul className="mt-1 flex flex-col gap-1.5">
          {alle.map((p) => (
            <li key={p.id} className="flex items-center gap-2 text-[15px]">
              <Check className="size-4 flex-none" strokeWidth={3} aria-hidden="true" />
              <span className="min-w-0">
                <span className="font-semibold">{p.titel}</span> · {praxisStand(p)}
              </span>
            </li>
          ))}
        </ul>
      </FokusRahmen>
    );
  }
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
      {/* Labortag (SR-94): kein Flow, nur Unterlagen. */}
      <span className="inline-flex items-center gap-2 text-sm text-ink">
        {praxis.labor ? <FlaskConical className="size-4 flex-none" aria-hidden="true" /> : <Wrench className="size-4 flex-none" aria-hidden="true" />}
        {praxis.labor
          ? praxis.standort ? `Labortag · ${praxis.standort}` : "Labortag"
          : `${praxis.standort ? `Praxisauftrag · ${praxis.standort}` : "Praxisauftrag"} · ${praxisStand(praxis)}`}
      </span>
      <FokusTitel titel={praxis.titel} stil={stil} aufCoral />
      <FokusTrainer art="praxis" trainer={trainer} />
      <StaerktPills kompetenzen={staerkt} aufCoral />
      {mehrere && (
        <ul aria-label="Alle Praxisaufträge heute" className="mt-1 flex flex-col gap-1 text-[14px]">
          {alle.map((p) => (
            <li key={p.id} className={cn("flex items-center gap-2", p.id === praxis.id && "font-semibold")}>
              {p.phase === "abgeschlossen" ? (
                <Check className="size-4 flex-none" strokeWidth={3} aria-hidden="true" />
              ) : (
                <span aria-hidden="true" className="size-1.5 flex-none rounded-full bg-ink" />
              )}
              <span className="min-w-0">
                {p.titel} · {praxisStand(p)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {PRAXISAUFGABE_LINK && (
        <PrimaerAktion href={`/praxistag/${praxis.fieldJobId}?von=home`}>
          {praxis.labor ? "Unterlagen öffnen" : praxis.phase === "informieren" ? "Praxisauftrag starten" : "Praxisauftrag fortsetzen"}
        </PrimaerAktion>
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
  praxis: "Praxisauftrag",
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
