"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, ChevronLeft, ChevronRight, FileText, Video, Wrench } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UnitProgressBadge } from "@/components/status-badge";
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

  function gotoDate(datum: string) {
    router.push(`/schedule?datum=${datum}`);
  }

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="tag">Tag</TabsTrigger>
        <TabsTrigger value="woche">Woche</TabsTrigger>
        <TabsTrigger value="programm">Programm</TabsTrigger>
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
            <Card className="border-eco-green/30 transition-colors hover:border-eco-green">
              <CardContent className="flex items-center gap-3 py-1">
                <Wrench className="size-5 shrink-0 text-eco-green" aria-hidden="true" />
                <div className="flex-1">
                  <p className="font-medium text-eco-deep-green">{eintrag.titel}</p>
                  {eintrag.beschreibung && (
                    <p className="text-sm text-muted-foreground">{eintrag.beschreibung}</p>
                  )}
                  <Badge variant="outline" className="mt-1">
                    Praxistag
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}

        {tag.theorie.map((eintrag) => {
          const Icon = FORMAT_ICON[eintrag.contentType];
          const liveJetzt = eintrag.liveSession && isNow(eintrag.liveSession.datum, eintrag.liveSession.start, eintrag.liveSession.ende);
          return (
            <Card key={eintrag.scheduleEntryId}>
              <CardContent className="flex items-center gap-3 py-1">
                <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="flex-1">
                  <p className="font-medium text-eco-deep-green">{eintrag.titel}</p>
                  {eintrag.liveSession && (
                    <p className="text-xs text-muted-foreground">
                      {eintrag.liveSession.start}–{eintrag.liveSession.ende} Uhr
                    </p>
                  )}
                </div>
                {liveJetzt && eintrag.liveSession?.joinLink ? (
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
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
          {woche.map((tag) => (
            <button
              key={tag.datum}
              onClick={() => {
                gotoDate(tag.datum);
                setTab("tag");
              }}
              className="rounded-lg border border-border p-3 text-left transition-colors hover:border-eco-green"
            >
              <p className="text-xs text-muted-foreground">{formatWeekday(tag.datum)}</p>
              <p className="text-sm font-medium text-eco-deep-green">{formatDayMonth(tag.datum)}</p>
              {tag.art === "feld" && (
                <Badge variant="outline" className="mt-1 gap-1">
                  <Wrench className="size-3" /> Praxistag
                </Badge>
              )}
              {tag.art === "theorie" && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {tag.abgeschlosseneEintraege}/{tag.abgeschlosseneEintraege + tag.offeneEintraege} erledigt
                </p>
              )}
              {tag.art === "frei" && <p className="mt-1 text-xs text-muted-foreground">frei</p>}
            </button>
          ))}
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
          {programm.phasen.map((phase, i) => (
            <li key={phase.id}>
              <Link
                href={phase.typ === "module" ? `/content#modul-${phase.id}` : `/content#kurs-${phase.id}`}
                className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:border-eco-green"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium text-secondary-foreground">
                  {i + 1}
                </span>
                <span className="text-sm text-eco-deep-green">{phase.name}</span>
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
