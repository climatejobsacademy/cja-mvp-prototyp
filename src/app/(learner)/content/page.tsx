import Link from "next/link";
import { ArrowRight, BookOpen, ChevronDown, ChevronRight } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { SegmentProgress } from "@/components/segment-progress";
import { UnitProgressBadge } from "@/components/status-badge";
import { TypIcon, typFuerContentType } from "@/components/typ-icon";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { requireCurrentLearner } from "@/lib/queries/session";
import { getContentLibrary, type CourseListItem, type ModuleGroup } from "@/lib/queries/content";
import type { ContentType } from "@/lib/database.types";

// Lektionstypen laut Handoff-Wording. "repository" ist dort nicht vorgesehen
// -- für diese Lektionen steht statt des Typs der Lektionsname.
const TYP: Record<ContentType, { label: string | null }> = {
  live: { label: "Live-Termin" },
  scorm: { label: "Selbstlernmodul" },
  repository: { label: null },
};

const HOVER =
  "outline-none transition-[background-color] duration-150 hover:bg-eco-green/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-eco-green motion-reduce:transition-none";

/** Einheit (= Kurs) als aufklappbare Zeile mit Segmenten, darin die Lektionen. */
function Einheit({ course }: { course: CourseListItem }) {
  const done = course.lessons.filter((l) => l.status === "abgeschlossen").length;
  const gesamt = course.lessons.length;

  return (
    <details id={`kurs-${course.id}`} className="group/course border-t border-border">
      <summary className={cn("flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-3", HOVER)}>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <p className="text-sm font-medium text-eco-deep-green">{course.name}</p>
          <SegmentProgress value={done} max={gesamt} label={`${done} von ${gesamt} Lektionen abgeschlossen`} />
          {/* K2: Zähltext bleibt sichtbar. */}
          {gesamt > 0 && (
            <p className="text-[13px] text-muted-foreground tabular-nums" aria-hidden="true">
              {done}/{gesamt} Lektionen
            </p>
          )}
        </div>
        <ChevronDown
          className="size-5 shrink-0 text-muted-foreground transition-transform group-open/course:rotate-180 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </summary>
      <ul>
        {course.lessons.map((lesson) => {
          const { label } = TYP[lesson.contentType];
          return (
            <li key={lesson.id}>
              <Link
                href={`/content/${lesson.id}`}
                className={cn(
                  "flex min-h-14 flex-wrap items-center gap-x-3 gap-y-2 border-t border-border py-2.5 pr-4 pl-8",
                  HOVER
                )}
              >
                <TypIcon typ={typFuerContentType(lesson.contentType)} />
                <span className="min-w-0 grow basis-32 text-sm text-eco-deep-green">{label ?? lesson.name}</span>
                <UnitProgressBadge status={lesson.status} />
                <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

/** Praxisaufgaben je Modul (SR-59): informativ, nicht klickbar. Der Vorbereitungstext
 * gehört in den Praxis-Flow, nicht hierher (Entscheidung 2026-09-29). */
function Praxisaufgaben({ group }: { group: ModuleGroup }) {
  if (group.praxisTypen.length === 0) return null;
  return (
    <>
      {group.praxisTypen.map((p) => {
        const inhalt = (
          <>
            <TypIcon typ="praxis" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="text-sm font-medium text-eco-deep-green">{p.titel}</p>
              {p.beschreibung && <p className="text-[13px] text-muted-foreground">{p.beschreibung}</p>}
            </div>
          </>
        );
        // Mit eigenem Praxistag direkt in den Praxis-Flow, sonst Info-Zeile
        // ohne Hover und Pfeil ("Ohne Zielseite kein Hover und kein Pfeil").
        return p.fieldJobId ? (
          <Link
            key={p.id}
            id={`praxis-${p.id}`}
            href={`/praxistag/${p.fieldJobId}?von=programm`}
            className={cn("flex min-h-14 items-center gap-3 border-t border-border px-4 py-3", HOVER)}
          >
            {inhalt}
            <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          </Link>
        ) : (
          <div key={p.id} id={`praxis-${p.id}`} className="flex min-h-14 items-start gap-3 border-t border-border px-4 py-3">
            {inhalt}
          </div>
        );
      })}
    </>
  );
}

export default async function ContentLibraryPage() {
  const learner = await requireCurrentLearner();
  const groups = await getContentLibrary(learner.programmeId, learner.personId);
  const sichtbar = groups.filter((g) => g.courses.length > 0 || g.praxisTypen.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Programm" />

      {sichtbar.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-border px-5 py-10 text-center md:py-16">
          <span className="flex size-14 items-center justify-center rounded-xl bg-eco-green/10">
            <BookOpen className="size-6 text-eco-green" aria-hidden="true" />
          </span>
          <h2 className="text-xl font-semibold text-eco-deep-green">Noch keine Programminhalte freigeschaltet</h2>
          <Link
            href="/schedule"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-11 w-full rounded-lg text-[15px] font-medium hover:bg-eco-green/10 md:w-auto"
            )}
          >
            Zum Stundenplan
            <ArrowRight className="size-[18px]" aria-hidden="true" />
          </Link>
        </div>
      )}

      {sichtbar.map((group) => {
        // Kurse direkt am Programm (kein Modul): Container ohne Modulkopf.
        if (!group.name) {
          return (
            <section
              key="ohne-modul"
              aria-label="Kurse"
              className="overflow-hidden rounded-xl border border-border [&>*:first-child]:border-t-0"
            >
              {group.courses.map((course) => (
                <Einheit key={course.id} course={course} />
              ))}
              <Praxisaufgaben group={group} />
            </section>
          );
        }

        return (
          <details
            key={group.id}
            id={group.id ? `modul-${group.id}` : undefined}
            className="group/module overflow-hidden rounded-xl border border-border shadow-sm"
          >
            <summary className={cn("flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3", HOVER)}>
              <div className="flex min-w-0 flex-1 flex-col">
                <h2 className="text-[15px] font-semibold text-eco-deep-green">{group.name}</h2>
              </div>
              {/* Theorie-/Praxis-Icons wie im Stundenplan-Programm (SR-59). */}
              {group.courses.length > 0 && (
                <TypIcon typ="theorie" groesse="klein" label="Theorie" />
              )}
              {group.praxisTypen.length > 0 && (
                <TypIcon typ="praxis" groesse="klein" label="Praxis" />
              )}
              <ChevronDown
                className="size-5 shrink-0 text-muted-foreground transition-transform group-open/module:rotate-180 motion-reduce:transition-none"
                aria-hidden="true"
              />
            </summary>
            {group.courses.map((course) => (
              <Einheit key={course.id} course={course} />
            ))}
            <Praxisaufgaben group={group} />
          </details>
        );
      })}
    </div>
  );
}
