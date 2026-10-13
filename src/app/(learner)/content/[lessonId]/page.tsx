import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Video } from "lucide-react";

import { ModulZeichen } from "@/components/modul-zeichen";
import { UnitProgressBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { heuteInBerlin, jetztInBerlin } from "@/lib/date";
import { cn } from "@/lib/utils";
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
import { TerminKarte } from "./termin-karte";

// Lektionsseite wie demo (Entscheidungen Anna 2026-10-11/12): Typ als Pill
// (Live ohne Pill -- das Kamera-Symbol steht in der Termin-Karte), groß das
// Thema, klein das Modul (aus der Modul-Ebene), bei Live der Termin der
// eigenen Kohorte als Anker-Karte mit "Beitreten", "Wissen festigen" und
// Trainer:in (SR-15, SR-78), darunter Materialien (SR-68) und Fragen-Thread
// (SR-74).
const TYP_LABEL: Record<string, string> = { live: "Live-Termin", scorm: "Selbstlernmodul" };
const TYP_PILL: Record<string, string> = { live: "bg-brand-tint text-brand", scorm: "bg-self-tint text-self" };

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
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-ink"
      >
        <ArrowLeft className="size-4" /> {zurueck.label}
      </Link>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          {/* Typ als Pill in der Typfarbe; Live ohne Pill (Symbol in der Termin-Karte). */}
          {TYP_LABEL[lesson.contentType] && lesson.contentType !== "live" && (
            <p className={cn("self-start rounded-full px-2.5 py-0.5 text-xs font-semibold", TYP_PILL[lesson.contentType])}>
              {TYP_LABEL[lesson.contentType]}
            </p>
          )}
          {lesson.modul && <ModulZeichen ueberzeile={lesson.modul.ueberzeile} name={lesson.modul.name} />}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Groß das Thema (lesson.thema, 0029), sonst der Titel. */}
          <h1 className="font-heading text-[28px] leading-tight text-ink md:text-[36px]">{lesson.thema ?? lesson.name}</h1>
          <UnitProgressBadge status={lesson.status} />
        </div>
        {/* Selbstlern-Lektion: zugehöriger Live-Unterricht (SR-15, 0029). */}
        {lesson.liveLektion && (
          <Link
            href={lektionHref(lesson.liveLektion.id)}
            className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-ink"
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
        // Anker der Seite wie die Fokus-Karte auf Home (Anna 2026-10-12),
        // "Beitreten" und "Wissen festigen" in derselben Karte.
        <TerminKarte
          termin={lesson.liveSession}
          heute={heuteInBerlin()}
          jetzt={jetztInBerlin()}
          festigenHref={lesson.festigen ? lektionHref(lesson.festigen.id) : null}
          festigenTitel={lesson.festigen?.titel}
          trainer={trainer}
        />
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
