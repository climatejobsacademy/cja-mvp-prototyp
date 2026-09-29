"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, ChevronLeft, ChevronRight, FileText, Video, Wrench } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge, StepTypBadge, UnitProgressBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import type { ContentType } from "@/lib/database.types";
import type { ProgrammUebersicht, TagesAgenda, WochenTag } from "@/lib/queries/schedule";

const FORMAT_ICON: Record<ContentType | "kurs", typeof BookOpen> = {
  scorm: BookOpen,
  live: Video,
  repository: FileText,
  kurs: BookOpen,
};

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

  function gotoDate(datum: string) {
    router.push(`/schedule?datum=${datum}`);
  }

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="h-auto gap-1 bg-transparent p-0">
        <TabsTrigger value="tag" className={TAB_TRIGGER}>Tag</TabsTrigger>
        <TabsTrigger value="woche" className={TAB_TRIGGER}>Woche</TabsTrigger>
        <TabsTrigger value="programm" className={TAB_TRIGGER}>Programm</TabsTrigger>
      </TabsList>

      <TabsContent value="tag" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon-sm" onClick={() => gotoDate(addDays(selectedDate, -1))}>
            <ChevronLeft />
          </Button>
          <p className="text-sm font-medium text-eco-deep-green">{formatDate(selectedDate)}</p>
          <Button variant="ghost" size="icon-sm" onClick={() => gotoDate(addDays(selectedDate, 1))}>
            <ChevronRight />
          </Button>
        </div>

        {tag.feld.length === 0 && tag.theorie.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Für diesen Tag ist nichts geplant.
          </p>
        )}

        {tag.feld.map((eintrag) => (
          <Link key={eintrag.scheduleEntryId} href={`/praxistag/${eintrag.fieldJobId}`}>
            <Card className={cn(KLICKBAR, "border-eco-green/30 hover:ring-gray-300")}>
              <CardContent className="flex items-center gap-3 py-1">
                <Wrench className="size-5 shrink-0 text-eco-green" aria-hidden="true" />
                <div className="flex-1">
                  <p className="font-medium text-eco-deep-green">{eintrag.titel}</p>
                  {eintrag.beschreibung && (
                    <p className="text-sm text-muted-foreground">{eintrag.beschreibung}</p>
                  )}
                  <StatusBadge label="Praxistag" icon={Wrench} variant="outline" className="mt-1" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}

        {tag.theorie.map((eintrag) => {
          const Icon = FORMAT_ICON[eintrag.contentType];
          const liveJetzt = eintrag.liveSession && isNow(eintrag.liveSession.datum, eintrag.liveSession.start, eintrag.liveSession.ende);
          const beitretenSichtbar = Boolean(liveJetzt && eintrag.liveSession?.joinLink);
          // Karte führt zur Lektion -- außer solange "Jetzt beitreten" (selbst
          // ein Link) sichtbar ist, sonst wäre es ein Link im Link.
          const klickbar = eintrag.lessonId !== null && !beitretenSichtbar;
          const card = (
            <Card className={klickbar ? cn(KLICKBAR, "hover:ring-gray-300") : undefined}>
              <CardContent className="flex items-center gap-3 py-1">
                <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="flex-1">
                  <p className="font-medium text-eco-deep-green">{eintrag.titel}</p>
                  {eintrag.liveSession && (
                    <p className="text-xs text-muted-foreground">
                      {formatTime(eintrag.liveSession.start)}–{formatTime(eintrag.liveSession.ende)} Uhr
                    </p>
                  )}
                </div>
                {beitretenSichtbar && eintrag.liveSession?.joinLink ? (
                  <a
                    href={eintrag.liveSession.joinLink}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonVariants({ size: "sm" })}
                  >
                    Jetzt beitreten
                  </a>
                ) : (
                  eintrag.unitProgressStatus && <UnitProgressBadge status={eintrag.unitProgressStatus} />
                )}
              </CardContent>
            </Card>
          );
          return klickbar ? (
            <Link key={eintrag.scheduleEntryId} href={`/content/${eintrag.lessonId}`}>
              {card}
            </Link>
          ) : (
            <Fragment key={eintrag.scheduleEntryId}>{card}</Fragment>
          );
        })}
      </TabsContent>

      <TabsContent value="woche" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon-sm" onClick={() => gotoDate(addDays(selectedDate, -7))}>
            <ChevronLeft />
          </Button>
          <p className="text-sm font-medium text-eco-deep-green">
            {woche.length > 0 && `${formatDayMonth(woche[0].datum)} – ${formatDayMonth(woche[woche.length - 1].datum)}`}
          </p>
          <Button variant="ghost" size="icon-sm" onClick={() => gotoDate(addDays(selectedDate, 7))}>
            <ChevronRight />
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-7">
          {woche.map((tag) => {
            const gesamt = tag.abgeschlosseneEintraege + tag.offeneEintraege;
            const prozent = gesamt > 0 ? Math.round((tag.abgeschlosseneEintraege / gesamt) * 100) : 0;
            return (
              <button
                key={tag.datum}
                onClick={() => {
                  gotoDate(tag.datum);
                  setTab("tag");
                }}
                className={cn(
                  "rounded-lg border p-3 text-left hover:border-gray-300",
                  KLICKBAR,
                  tag.art === "frei" ? "border-border/50" : "border-border",
                  tag.datum === todayStr && "border-eco-green bg-eco-green/5"
                )}
              >
                <p className="text-xs font-semibold text-eco-deep-green">{formatWeekday(tag.datum)}</p>
                <p className="text-sm font-medium text-eco-deep-green">{formatDayMonth(tag.datum)}</p>
                {tag.art === "feld" && (
                  <StepTypBadge typ="praktisch" className="mt-1" />
                )}
                {tag.art === "theorie" && (
                  <>
                    <StepTypBadge typ="theoretisch" className="mt-1" />
                    <Progress
                      value={prozent}
                      aria-label={`${formatWeekday(tag.datum)} ${formatDayMonth(tag.datum)}: ${prozent}% abgeschlossen`}
                      className="mt-2"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      {tag.abgeschlosseneEintraege}/{gesamt} erledigt
                    </p>
                  </>
                )}
                {tag.art === "frei" && <p className="mt-1 text-xs text-muted-foreground">frei</p>}
              </button>
            );
          })}
        </div>
      </TabsContent>

      <TabsContent value="programm" className="flex flex-col gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {formatDate(programm.startDatum)}
            {programm.endDatum ? ` – ${formatDate(programm.endDatum)}` : ""}
          </p>
        </div>
        <ol className="flex flex-col gap-2">
          {programm.phasen.map((phase) => (
            <li key={phase.id}>
              <Link
                href={`/content#${phase.contentAnchor}`}
                className={cn("flex items-center gap-3 rounded-lg border border-border p-3 hover:border-gray-300", KLICKBAR)}
              >
                <span className="flex-1 text-sm text-eco-deep-green">{phase.name}</span>
                {phase.typ === "module" && phase.hatTheorie && (
                  <BookOpen className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                )}
                {phase.typ === "module" && phase.hatPraxis && (
                  <Wrench className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                )}
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

// Einheitliche Tabs mit Marken-Tokens: aktiv = gefüllte Pill in Eco Deep
// Green, inaktiv = nur Text. Überschreibt die shadcn-Defaults (Hintergrund,
// Rand, Schatten, Unterstrich) per tailwind-merge.
const TAB_TRIGGER =
  "h-auto flex-none rounded-full border-0 px-4 py-1.5 text-muted-foreground hover:text-eco-deep-green after:hidden data-active:bg-eco-deep-green data-active:text-white data-active:hover:text-white group-data-[variant=default]/tabs-list:data-active:shadow-none";

// Klickbare Karten/Kacheln, die zu einer anderen Ansicht führen: dezenter
// Schatten, beim Hover stärker.
const KLICKBAR = "cursor-pointer shadow-sm transition-all duration-150 hover:bg-eco-green/10 hover:shadow-md";

function formatTime(t: string): string {
  return t.slice(0, 5);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function formatWeekday(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("de-DE", { weekday: "short" });
}

function formatDayMonth(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
}

function isNow(datum: string, start: string, ende: string): boolean {
  const now = new Date();
  const startDt = new Date(`${datum}T${start}`);
  const endDt = new Date(`${datum}T${ende}`);
  return now >= startDt && now <= endDt;
}
