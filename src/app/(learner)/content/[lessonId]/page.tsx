import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireCurrentLearner } from "@/lib/queries/session";
import { getLessonDetail } from "@/lib/queries/content";

import { MarkCompleteButton } from "./mark-complete-button";

// Struktur von `lesson.inhalt`, siehe docs/open-questions.md (Q-LESSON-INHALT)
// und supabase/migrations/0004_qualification_structure.sql.
type RepositoryInhalt = { items?: { url?: string; file_asset_id?: string }[] };

export default async function LessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const learner = await requireCurrentLearner();
  const lesson = await getLessonDetail(lessonId, learner.personId);

  if (!lesson) notFound();

  const done = lesson.status === "abgeschlossen";

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/content"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-eco-deep-green"
      >
        <ArrowLeft className="size-4" /> Zurück zur Content Library
      </Link>

      <div className="flex items-center gap-3">
        <h1 className="font-heading text-xl text-eco-deep-green">{lesson.name}</h1>
        {done && <Badge variant="success">Fertig</Badge>}
      </div>

      {lesson.contentType === "scorm" && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              SCORM-Player-Platzhalter — im echten Betrieb wird hier das
              SCORM-Paket eingebettet und der Fortschritt automatisch erfasst.
            </p>
            <MarkCompleteButton lessonId={lesson.id} done={done} />
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
                  , {lesson.liveSession.start}–{lesson.liveSession.ende} Uhr
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
            <p className="text-xs text-muted-foreground">
              Aufzeichnungen werden im Prototyp nicht in der Plattform wiedergegeben.
            </p>
          </CardContent>
        </Card>
      )}

      {lesson.contentType === "repository" && (
        <Card>
          <CardContent className="flex flex-col gap-3">
            <ul className="flex flex-col gap-2">
              {((lesson.inhalt as RepositoryInhalt | null)?.items ?? []).map((item, i) =>
                item.url ? (
                  <li key={i}>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="size-4" /> {item.url}
                    </a>
                  </li>
                ) : (
                  <li key={i} className="text-sm text-muted-foreground">
                    Datei hinterlegt (kein Storage-Zugriff im Prototyp)
                  </li>
                )
              )}
              {!(lesson.inhalt as RepositoryInhalt | null)?.items?.length && (
                <li className="text-sm text-muted-foreground">Keine Datei-/Link-Referenzen hinterlegt.</li>
              )}
            </ul>
            <MarkCompleteButton lessonId={lesson.id} done={done} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
