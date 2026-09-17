import Link from "next/link";
import { BookOpen, ChevronDown, FileText, Video, Wrench } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { requireCurrentLearner } from "@/lib/queries/session";
import { getContentLibrary } from "@/lib/queries/content";
import type { ContentType } from "@/lib/database.types";

const FORMAT_ICON: Record<ContentType, typeof BookOpen> = {
  scorm: BookOpen,
  live: Video,
  repository: FileText,
};

export default async function ContentLibraryPage() {
  const learner = await requireCurrentLearner();
  const groups = await getContentLibrary(learner.programmeId, learner.personId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-xl text-eco-deep-green">Content Library</h1>
        <p className="text-sm text-muted-foreground">{learner.programmeName}</p>
      </div>

      {groups.length === 0 && (
        <p className="text-sm text-muted-foreground">Noch keine Kurse hinterlegt.</p>
      )}

      {groups.map((group) => {
        const hatTheorie = group.courses.length > 0;
        const hatPraxis = group.praxisTypen.length > 0;

        const body = (
          <div className="flex flex-col gap-3">
            {group.courses.map((course) => (
              <Card key={course.id} id={`kurs-${course.id}`}>
                <CardContent className="flex flex-col gap-0 p-0">
                  <details className="group/course">
                    <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
                      <ChevronDown
                        className="size-4 shrink-0 text-muted-foreground transition-transform group-open/course:rotate-180"
                        aria-hidden="true"
                      />
                      <BookOpen className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-eco-deep-green">{course.name}</p>
                          {course.abgeschlossen && (
                            <Badge variant="success" className="gap-1 shrink-0">
                              Abgeschlossen
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {course.lessons.length} {course.lessons.length === 1 ? "Lektion" : "Lektionen"}
                        </p>
                        {!course.abgeschlossen && course.lessons.length > 0 && (
                          <Progress
                            value={course.fortschrittProzent}
                            aria-label={`${course.name}: ${course.fortschrittProzent}% abgeschlossen`}
                            className="mt-2"
                          />
                        )}
                      </div>
                    </summary>
                    <div className="border-t border-border p-4 pt-3">
                      <ul className="flex flex-col gap-1">
                        {course.lessons.map((lesson) => {
                          const Icon = FORMAT_ICON[lesson.contentType];
                          return (
                            <li key={lesson.id}>
                              <Link
                                href={`/content/${lesson.id}`}
                                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-eco-deep-green transition-colors hover:bg-secondary"
                              >
                                <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                                <span className="flex-1">{lesson.name}</span>
                                {lesson.status === "abgeschlossen" && (
                                  <Badge variant="success">Fertig</Badge>
                                )}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </details>
                </CardContent>
              </Card>
            ))}
            {group.praxisTypen.map((praxisTyp) => (
              <Card key={praxisTyp.id} id={`praxis-${praxisTyp.id}`}>
                <CardContent className="flex items-start gap-3">
                  <Wrench className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div className="flex-1">
                    <p className="font-medium text-eco-deep-green">{praxisTyp.titel}</p>
                    {praxisTyp.beschreibung && (
                      <p className="text-sm text-muted-foreground">{praxisTyp.beschreibung}</p>
                    )}
                    {praxisTyp.vorbereitungText && (
                      <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line">
                        {praxisTyp.vorbereitungText}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );

        if (!group.name) {
          return (
            <section key={group.id ?? "ohne-modul"} id={group.id ? `modul-${group.id}` : undefined}>
              {body}
            </section>
          );
        }

        return (
          <details
            key={group.id ?? "ohne-modul"}
            id={group.id ? `modul-${group.id}` : undefined}
            className="group/module rounded-lg border border-border"
          >
            <summary className="flex cursor-pointer list-none items-center gap-3 p-3">
              <ChevronDown
                className="size-4 shrink-0 text-muted-foreground transition-transform group-open/module:rotate-180"
                aria-hidden="true"
              />
              <span className="flex-1 text-sm font-medium text-eco-deep-green">{group.name}</span>
              {hatTheorie && (
                <BookOpen className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              )}
              {hatPraxis && (
                <Wrench className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              )}
            </summary>
            <div className="border-t border-border p-3">{body}</div>
          </details>
        );
      })}
    </div>
  );
}
