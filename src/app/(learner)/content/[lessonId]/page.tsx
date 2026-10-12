import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ModulZeichen } from "@/components/modul-zeichen";
import { UnitProgressBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { heuteInBerlin, jetztInBerlin } from "@/lib/date";
import { themaTitel } from "@/lib/home-tag";
import { gliederungFuer, modulZumDatum } from "@/lib/programm";
import { getKohortenStart } from "@/lib/queries/stundenplan";
import { requireCurrentLearner } from "@/lib/queries/session";
import { getLessonDetail } from "@/lib/queries/content";
import { getLektionThread } from "@/lib/queries/lektion-thread";
import { getLiveKontext } from "@/lib/queries/lektion-live";
import { getLessonMaterialien } from "@/lib/queries/materialien";

import { LektionThread } from "./lektion-thread";
import { MarkCompleteButton } from "./mark-complete-button";
import { MaterialienListe } from "./materialien-liste";
import { ScormPlayer } from "./scorm-player";
import { TerminKarte } from "./termin-karte";

const TYP_LABEL: Record<string, string> = { live: "Live-Termin", scorm: "Selbstlernmodul" };
// Visuelles Update (Anna 2026-10-11): Typ als Pill in der Typfarbe.
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
    getLessonDetail(lessonId, learner.personId),
    getLessonMaterialien(lessonId),
  ]);

  if (!lesson) notFound();

  // Fragen-Thread (SR-74): null bei chat_aktiv aus oder
  // ohne Leserecht, dann wird nichts angezeigt.
  // Live: Termin der eigenen Kohorte und "Wissen festigen" (Anna 2026-10-11).
  const [thread, liveKontext] = await Promise.all([
    getLektionThread(lesson.id, lesson.chatAktiv, learner),
    lesson.contentType === "live" ? getLiveKontext(lesson.id, lesson.name, learner) : null,
  ]);
  const termin = liveKontext?.termin ?? lesson.liveSession;
  const herkunft = new URLSearchParams({ ...(von ? { von } : {}), ...(datum ? { datum } : {}) }).toString();

  const done = lesson.status === "abgeschlossen";
  const festigenHref = liveKontext?.festigenLessonId
    ? `/content/${liveKontext.festigenLessonId}${herkunft ? `?${herkunft}` : ""}`
    : null;
  // Entscheidung Anna 2026-10-12 (auf allen Seiten gleich): groß das Thema,
  // klein das Modul -- über den Tag des Termins, sonst den Tag aus der
  // Adresse bzw. heute (Selbstlernen hat keinen festen Termin).
  const modul = modulZumDatum(
    gliederungFuer(learner.programmeName, await getKohortenStart(learner.cohortId)),
    termin?.datum ?? (datum && /^\d{4}-\d{2}-\d{2}$/.test(datum) ? datum : heuteInBerlin())
  );

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={zurueck.href}
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-ink"
      >
        <ArrowLeft className="size-4" /> {zurueck.label}
      </Link>

      <div className="flex flex-col gap-2">
        {/* Typ als Meta-Zeile -- die Lektionsnamen tragen ihn seit 2026-09-29 nicht mehr. */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Live ohne Pill: das Kamera-Symbol steht in der Termin-Karte (Anna 2026-10-12). */}
          {TYP_LABEL[lesson.contentType] && lesson.contentType !== "live" && (
            <p className={cn("self-start rounded-full px-2.5 py-0.5 text-xs font-semibold", TYP_PILL[lesson.contentType])}>{TYP_LABEL[lesson.contentType]}</p>
          )}
          {modul && <ModulZeichen nummer={modul.nummer} name={modul.name} />}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-[28px] leading-tight text-ink md:text-[36px]">
            {themaTitel(lesson.name)}
          </h1>
          <UnitProgressBadge status={lesson.status} />
        </div>
      </div>

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
        <TerminKarte termin={termin ?? null} heute={heuteInBerlin()} jetzt={jetztInBerlin()} festigenHref={festigenHref} />
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
