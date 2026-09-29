"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, ChevronLeft, ChevronRight, FileText, Video, Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SegmentProgress } from "@/components/segment-progress";
import { UnitProgressBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import type { ContentType } from "@/lib/database.types";
import type { ProgrammUebersicht, TagesAgenda, WochenTag } from "@/lib/queries/schedule";

// Typen laut Handoff-Wording (Live-Termin · Selbstlernmodul); "repository"
// und Kurs-Einträge sind dort nicht vorgesehen und bekommen ihr Icon ohne
// eigenes Typ-Label.
const TYP: Record<ContentType | "kurs", { icon: typeof BookOpen; label: string | null; flaeche: string }> = {
  live: { icon: Video, label: "Live-Termin", flaeche: "bg-lylac/20" },
  scorm: { icon: BookOpen, label: "Selbstlernmodul", flaeche: "bg-eco-green/15" },
  repository: { icon: FileText, label: null, flaeche: "bg-muted" },
  kurs: { icon: BookOpen, label: null, flaeche: "bg-muted" },
};
// Praxistag: helle Coral-Fläche (Coral nur als Fläche, Icon bleibt Deep Green).
const PRAXIS_FLAECHE = "bg-coral/25";

// Interaktions-Regeln (Handoff 2a).
const FOKUS =
  "outline-none focus-visible:ring-2 focus-visible:ring-eco-green focus-visible:ring-offset-2";
const KLICKBARE_KARTE = cn(
  "rounded-xl border border-border shadow-sm transition-[background-color,box-shadow] duration-150 hover:bg-eco-green/10 hover:shadow-md motion-reduce:transition-none",
  FOKUS
);
const CONTAINER = "rounded-xl border border-border";

const TAB_TRIGGER =
  "h-11 flex-none rounded-full border-0 px-5 text-[15px] text-muted-foreground hover:bg-eco-green/10 hover:text-eco-deep-green after:hidden data-active:bg-eco-deep-green data-active:text-white data-active:hover:bg-eco-deep-green data-active:hover:text-white group-data-[variant=default]/tabs-list:data-active:shadow-none";

const ROEMISCH = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

const PFEIL =
  "size-11 rounded-full text-muted-foreground hover:bg-eco-green/10 hover:text-eco-deep-green [&_svg]:size-5";

/** Karten-Inhalt: Icon-Kachel · Titel + Meta · Badge · Chevron (nur mit Ziel). */
function EintragInhalt({
  icon: Icon,
  flaeche,
  titel,
  meta,
  rechts,
  mitPfeil,
}: {
  icon: typeof BookOpen;
  flaeche: string;
  titel: string;
  meta: string | null;
  rechts?: React.ReactNode;
  mitPfeil: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-4">
      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-[10px]", flaeche)}>
        <Icon className="size-5 text-eco-deep-green" aria-hidden="true" />
      </span>
      {/* Badge bricht mobil unter den Text. */}
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-0 grow basis-60">
          <p className="text-[15px] font-semibold text-eco-deep-green">{titel}</p>
          {meta && <p className="text-[13px] text-muted-foreground">{meta}</p>}
        </div>
        {rechts}
      </div>
      {mitPfeil && <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />}
    </div>
  );
}

export function ScheduleTabs({
  selectedDate,
  tag,
  woche,
  programm,
}: {
  selectedDate: string;
  tag: TagesAgenda;
  woche: WochenTag[];
  programm: ProgrammUebersicht;
}) {
  const router = useRouter();
  const [tab, setTab] = useState("tag");
  const todayStr = new Date().toISOString().slice(0, 10);
  // Meta-Zeile je Phase: Module nummeriert wie auf der Programm-Seite (/content).
  const phasenLabel = new Map(
    programm.phasen.map((phase) => [
      phase.id,
      phase.typ === "module"
        ? `Modul ${ROEMISCH[programm.phasen.filter((p) => p.typ === "module").indexOf(phase)] ?? ""}`.trim()
        : phase.typ === "kurs"
          ? "Kurs"
          : "Praxisaufgabe",
    ])
  );

  function gotoDate(datum: string) {
    router.push(`/schedule?datum=${datum}`);
  }

  return (
    <Tabs value={tab} onValueChange={setTab} className="gap-5">
      {/* TODO(design): "Programm" kollidiert begrifflich mit "Programm" in der Kopfleiste (Handoff, offener Punkt 4). */}
      <TabsList className="h-auto gap-1 bg-transparent p-0">
        <TabsTrigger value="tag" className={cn(TAB_TRIGGER, FOKUS)}>Tag</TabsTrigger>
        <TabsTrigger value="woche" className={cn(TAB_TRIGGER, FOKUS)}>Woche</TabsTrigger>
        <TabsTrigger value="programm" className={cn(TAB_TRIGGER, FOKUS)}>Programm</TabsTrigger>
      </TabsList>

      <TabsContent value="tag" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" className={cn(PFEIL, FOKUS)} aria-label="Vorheriger Tag" onClick={() => gotoDate(addDays(selectedDate, -1))}>
            <ChevronLeft aria-hidden="true" />
          </Button>
          <p className="text-[15px] font-semibold text-eco-deep-green">{formatUeberschrift(selectedDate)}</p>
          <Button variant="ghost" size="icon" className={cn(PFEIL, FOKUS)} aria-label="Nächster Tag" onClick={() => gotoDate(addDays(selectedDate, 1))}>
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>

        {tag.feld.length === 0 && tag.theorie.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">Für diesen Tag ist nichts geplant.</p>
        )}

        {tag.feld.map((eintrag) => (
          <Link key={eintrag.scheduleEntryId} href={`/praxistag/${eintrag.fieldJobId}`} className={KLICKBARE_KARTE}>
            <EintragInhalt icon={Wrench} flaeche={PRAXIS_FLAECHE} titel={eintrag.titel} meta="Praxistag" mitPfeil />
          </Link>
        ))}

        {tag.theorie.map((eintrag) => {
          const { icon, label, flaeche } = TYP[eintrag.contentType];
          const zeit = eintrag.liveSession
            ? `${formatTime(eintrag.liveSession.start)}–${formatTime(eintrag.liveSession.ende)}`
            : null;
          const meta = [label, zeit].filter(Boolean).join(" · ") || null;
          const liveJetzt =
            eintrag.liveSession &&
            isNow(eintrag.liveSession.datum, eintrag.liveSession.start, eintrag.liveSession.ende);
          const joinLink = liveJetzt ? eintrag.liveSession?.joinLink ?? null : null;
          // Kein Button in einer klickbaren Karte: solange "Jetzt beitreten"
          // sichtbar ist, ist die Karte ein Container.
          const klickbar = eintrag.lessonId !== null && !joinLink;

          const rechts = joinLink ? (
            <a
              href={joinLink}
              target="_blank"
              rel="noreferrer"
              className={cn(
                "inline-flex h-11 items-center justify-center rounded-lg bg-eco-deep-green px-4 text-[15px] font-medium text-white hover:bg-eco-deep-green/90",
                FOKUS
              )}
            >
              Jetzt beitreten
            </a>
          ) : (
            eintrag.unitProgressStatus && <UnitProgressBadge status={eintrag.unitProgressStatus} />
          );

          return klickbar ? (
            <Link key={eintrag.scheduleEntryId} href={`/content/${eintrag.lessonId}`} className={KLICKBARE_KARTE}>
              <EintragInhalt icon={icon} flaeche={flaeche} titel={eintrag.titel} meta={meta} rechts={rechts} mitPfeil />
            </Link>
          ) : (
            <div key={eintrag.scheduleEntryId} className={CONTAINER}>
              <EintragInhalt icon={icon} flaeche={flaeche} titel={eintrag.titel} meta={meta} rechts={rechts} mitPfeil={false} />
            </div>
          );
        })}
      </TabsContent>

      <TabsContent value="woche" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" className={cn(PFEIL, FOKUS)} aria-label="Vorherige Woche" onClick={() => gotoDate(addDays(selectedDate, -7))}>
            <ChevronLeft aria-hidden="true" />
          </Button>
          <p className="text-[15px] font-semibold text-eco-deep-green">
            {woche.length > 0 && `${formatKurz(woche[0].datum)} – ${formatKurz(woche[woche.length - 1].datum)}`}
          </p>
          <Button variant="ghost" size="icon" className={cn(PFEIL, FOKUS)} aria-label="Nächste Woche" onClick={() => gotoDate(addDays(selectedDate, 7))}>
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-7">
          {woche.map((t) => {
            const gesamt = t.abgeschlosseneEintraege + t.offeneEintraege;
            const TypIcon = t.art === "feld" ? Wrench : BookOpen;
            return (
              <button
                key={t.datum}
                onClick={() => {
                  gotoDate(t.datum);
                  setTab("tag");
                }}
                className={cn(
                  KLICKBARE_KARTE,
                  "flex min-h-11 flex-col gap-1 p-3 text-left",
                  t.art === "frei" && "border-border/50",
                  t.datum === todayStr && "border-eco-green bg-charge-green/20"
                )}
              >
                <span className="text-xs font-semibold text-eco-deep-green">{formatWochentag(t.datum)}</span>
                <span className="text-sm font-medium text-eco-deep-green">{formatKurz(t.datum)}</span>
                {t.art !== "frei" ? (
                  <span className="flex items-center gap-1 text-[13px] text-muted-foreground">
                    <TypIcon className="size-3.5" aria-hidden="true" />
                    {t.art === "feld" ? "Praxis" : "Theorie"}
                  </span>
                ) : (
                  <span className="text-[13px] text-muted-foreground">frei</span>
                )}
                {t.art === "theorie" && gesamt > 0 && (
                  <>
                    <SegmentProgress
                      className="mt-1"
                      value={t.abgeschlosseneEintraege}
                      max={gesamt}
                      label={`${t.abgeschlosseneEintraege} von ${gesamt} Einträgen abgeschlossen`}
                    />
                    {/* K2: Zähltext bleibt sichtbar. */}
                    <span className="text-[13px] text-muted-foreground tabular-nums" aria-hidden="true">
                      {t.abgeschlosseneEintraege}/{gesamt} abgeschlossen
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </TabsContent>

      <TabsContent value="programm" className="flex flex-col gap-3">
        {programm.startDatum && (
          <p className="text-[13px] text-muted-foreground">
            {formatKurz(programm.startDatum)}
            {programm.endDatum ? ` – ${formatKurz(programm.endDatum)}` : ""}
          </p>
        )}
        <ol className="flex flex-col gap-3">
          {programm.phasen.map((phase) => (
            <li key={phase.id}>
              {/* Gleicher Aufbau wie der Modulkopf auf der Programm-Seite (/content). */}
              <Link href={`/content#${phase.contentAnchor}`} className={cn(KLICKBARE_KARTE, "flex min-h-14 items-center gap-3 px-4 py-3")}>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[13px] text-muted-foreground">{phasenLabel.get(phase.id)}</span>
                  <span className="text-[15px] font-semibold text-eco-deep-green">{phase.name}</span>
                </span>
                {phase.typ === "module" && phase.hatTheorie && (
                  <BookOpen className="size-[18px] shrink-0 text-muted-foreground" aria-label="Theorie" />
                )}
                {phase.typ === "module" && phase.hatPraxis && (
                  <Wrench className="size-[18px] shrink-0 text-muted-foreground" aria-label="Praxis" />
                )}
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            </li>
          ))}
          {programm.phasen.length === 0 && (
            <p className="text-sm text-muted-foreground">Keine Phasen hinterlegt.</p>
          )}
        </ol>
      </TabsContent>
    </Tabs>
  );
}

function formatTime(t: string): string {
  return t.slice(0, 5);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatWochentag(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00Z`)
    .toLocaleDateString("de-DE", { weekday: "short", timeZone: "UTC" })
    .replace(".", "");
}

/** Überschrift: "Di, 29. September" */
function formatUeberschrift(dateStr: string): string {
  if (!dateStr) return "";
  const tagMonat = new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
  return `${formatWochentag(dateStr)}, ${tagMonat}`;
}

/** Kurzform: "30.09." */
function formatKurz(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  });
}

function isNow(datum: string, start: string, ende: string): boolean {
  const now = new Date();
  const startDt = new Date(`${datum}T${start}`);
  const endDt = new Date(`${datum}T${ende}`);
  return now >= startDt && now <= endDt;
}
