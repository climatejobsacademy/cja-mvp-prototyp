import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, Video } from "lucide-react";

import { UnitProgressBadge } from "@/components/status-badge";
import { TrainerZeile } from "@/components/trainer-zeile";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireCurrentLearner } from "@/lib/queries/session";
import { getLessonDetail } from "@/lib/queries/content";
import { getLektionThread } from "@/lib/queries/lektion-thread";
import { getLessonMaterialien } from "@/lib/queries/materialien";
import { getMeineTrainer } from "@/lib/queries/trainer";
import { begonnenSetzen } from "@/lib/lektion-begonnen";

import { BegonnenMarker } from "./begonnen-marker";
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
    getLessonDetail(lessonId, learner.personId, { cohortId: learner.cohortId, enrolmentId: learner.enrolmentId }),
    getLessonMaterialien(lessonId),
  ]);

  if (!lesson) notFound();

  // Fragen-Thread (SR-74): null bei chat_aktiv aus oder
  // ohne Leserecht, dann wird nichts angezeigt.
  const thread = await getLektionThread(lesson.id, lesson.chatAktiv, learner);

  // "Live mit …" (SR-78): Trainer:in des eigenen Termins, Name und Foto aus fn_meine_trainer().
  const trainerId = lesson.liveSession?.trainerId ?? null;
  const trainer = trainerId ? ((await getMeineTrainer()).get(trainerId) ?? null) : null;

  const done = lesson.status === "abgeschlossen";
  // Herkunft (Stundenplan/Home) an die verknüpfte Lektion weitergeben.
  const herkunft = new URLSearchParams({ ...(von ? { von } : {}), ...(datum ? { datum } : {}) }).toString();
  const lektionHref = (id: string) => `/content/${id}${herkunft ? `?${herkunft}` : ""}`;

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
        {/* Thema aus lesson.thema (SR-13, 0029) statt der Klammer im Titel. */}
        {lesson.thema && <p className="text-[15px] text-eco-deep-green">{lesson.thema}</p>}
        {/* Selbstlern-Lektion: zugehöriger Live-Unterricht (SR-15, 0029). */}
        {lesson.liveLektion && (
          <Link
            href={lektionHref(lesson.liveLektion.id)}
            className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-eco-deep-green"
          >
            <Video className="size-4" aria-hidden="true" />
            Gehört zum Live-Unterricht: {lesson.liveLektion.titel}
          </Link>
        )}
      </div>

      {/* "begonnen" beim ersten Öffnen (SR-73, Datenlücke Nr. 9). */}
      {begonnenSetzen(lesson.contentType, lesson.status) && <BegonnenMarker lessonId={lesson.id} />}

      {/* Lernmaterialien (SR-68): bei SCORM über dem Player, bei Live unter
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
                {trainer && <TrainerZeile art="live" trainer={trainer} className="text-eco-deep-green" />}
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
            {/* Zugehörige Selbstlern-Lektion (SR-15, 0029: live_lektion_id). */}
            {lesson.festigen && (
              <Link
                href={lektionHref(lesson.festigen.id)}
                className={buttonVariants({ variant: "outline", className: "self-start" })}
              >
                <BookOpen data-icon="inline-start" aria-hidden="true" />
                Wissen festigen
                <span className="sr-only">: {lesson.festigen.titel}</span>
              </Link>
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
