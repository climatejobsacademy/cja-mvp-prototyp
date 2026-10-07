import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { UnitProgressBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireCurrentLearner } from "@/lib/queries/session";
import { getLessonDetail } from "@/lib/queries/content";
import { getLektionThread } from "@/lib/queries/lektion-thread";
import { getLessonMaterialien } from "@/lib/queries/materialien";

import { LektionThread } from "./lektion-thread";
import { MarkCompleteButton } from "./mark-complete-button";
import { MaterialienListe } from "./materialien-liste";
import { ScormPlayer } from "./scorm-player";

const TYP_LABEL: Record<string, string> = { live: "Live-Termin", scorm: "Selbstlernmodul" };

/**
 * Zurück-Link je nach Herkunft: aus dem Stundenplan zurück zum selben Tag,
 * von Home zurück nach Home, sonst (Reiter Programm, Direktaufruf) zum Programm.
 */
function zurueckZiel(von?: string, datum?: string): { href: string; label: string } {
  if (von === "stundenplan") {
    const tag = datum && /^\d{4}-\d{2}-\d{2}$/.test(datum) ? `?datum=${datum}` : "";
    return { href: `/schedule${tag}`, label: "Zurück zum Stundenplan" };
  }
  if (von === "home") return { href: "/home", label: "Zurück zu Home" };
  return { href: "/content", label: "Zurück zum Programm" };
}

export default async function LessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ lessonId: string }>;
  searchParams: Promise<{ von?: string; datum?: string }>;
}) {
  const { lessonId } = await params;
  const { von, datum } = await searchParams;
  const zurueck = zurueckZiel(von, datum);
  const learner = await requireCurrentLearner();
  const [lesson, materialien] = await Promise.all([
    getLessonDetail(lessonId, learner.personId),
    getLessonMaterialien(lessonId),
  ]);

  if (!lesson) notFound();

  // Fragen-Thread (SR folgt (Fragen-Thread)): null bei chat_aktiv aus oder
  // ohne Leserecht, dann wird nichts angezeigt.
  const thread = await getLektionThread(lesson.id, lesson.chatAktiv, learner);

  const done = lesson.status === "abgeschlossen";

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={zurueck.href}
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-eco-deep-green"
      >
        <ArrowLeft className="size-4" /> {zurueck.label}
      </Link>

      <div className="flex flex-col gap-1">
        {/* Typ als Meta-Zeile -- die Lektionsnamen tragen ihn seit 2026-09-29 nicht mehr. */}
        {TYP_LABEL[lesson.contentType] && (
          <p className="text-[13px] text-muted-foreground">{TYP_LABEL[lesson.contentType]}</p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-xl text-eco-deep-green">{lesson.name}</h1>
          <UnitProgressBadge status={lesson.status} />
        </div>
      </div>

      {/* Lernmaterialien (SR folgt): bei SCORM über dem Player, bei Live unter
          der Session, bei Repository als Hauptinhalt. Ohne Materialien kein
          Abschnitt (Repository: Hinweistext). */}
      {lesson.contentType === "scorm" && materialien.length > 0 && (
        <MaterialienListe lessonId={lesson.id} materialien={materialien} />
      )}

      {lesson.contentType === "scorm" && (
        <Card>
          <CardContent className="flex flex-col gap-3">
            {lesson.scorm ? (
              <ScormPlayer
                lessonId={lesson.id}
                entryPointPfad={lesson.scorm.entryPointPfad}
                zipSignedUrl={lesson.scorm.zipSignedUrl}
                done={done}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Für diese Lektion ist noch kein SCORM-Paket hinterlegt.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {lesson.contentType === "live" && (
        <Card>
          <CardContent className="flex flex-col gap-2">
            {lesson.liveSession ? (
              <>
                <p className="text-eco-deep-green">
                  {new Date(`${lesson.liveSession.datum}T00:00:00`).toLocaleDateString("de-DE", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                  })}
                  , {lesson.liveSession.start.slice(0, 5)}–{lesson.liveSession.ende.slice(0, 5)} Uhr
                </p>
                {lesson.liveSession.joinLink && (
                  <a
                    href={lesson.liveSession.joinLink}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonVariants({ className: "self-start" })}
                  >
                    Beitreten
                  </a>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Kein Termin hinterlegt.</p>
            )}
          </CardContent>
        </Card>
      )}

      {lesson.contentType === "live" && materialien.length > 0 && (
        <MaterialienListe lessonId={lesson.id} materialien={materialien} />
      )}

      {lesson.contentType === "repository" && (
        <div className="flex flex-col gap-4">
          {materialien.length > 0 ? (
            <MaterialienListe lessonId={lesson.id} materialien={materialien} />
          ) : (
            <p className="text-sm text-muted-foreground">Für diese Lektion sind noch keine Materialien hinterlegt.</p>
          )}
          <MarkCompleteButton lessonId={lesson.id} done={done} />
        </div>
      )}

      {thread && <LektionThread lessonId={lesson.id} thread={thread} />}
    </div>
  );
}
