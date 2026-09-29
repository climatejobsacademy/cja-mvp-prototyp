import Link from "next/link";
import { BookOpen, Calendar, ChevronRight, FileText, Video, Wrench } from "lucide-react";

import { CurriculumCard } from "@/components/curriculum-card";
import { LinkRow } from "@/components/link-row";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";
import { getCurriculumFortschritt } from "@/lib/queries/competencies";
import { getNaechsterTermin, getTagesAgenda } from "@/lib/queries/schedule";
import { requireCurrentLearner } from "@/lib/queries/session";

// Wie der Stundenplan (schedule/page.tsx): Datum in UTC, damit beide Seiten
// denselben Tag als "heute" nehmen.
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function kurzerWochentag(date: Date): string {
  return date.toLocaleDateString("de-DE", { weekday: "short", timeZone: "UTC" }).replace(".", "");
}

/** Überschrift: "Di, 29. September" */
function formatUeberschrift(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const tagMonat = d.toLocaleDateString("de-DE", { day: "numeric", month: "long", timeZone: "UTC" });
  return `${kurzerWochentag(d)}, ${tagMonat}`;
}

/** Fließtext: "Mi, 30.09." */
function formatKurz(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const tagMonat = d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
  // de-DE liefert "30.09." inklusive Schlusspunkt.
  return `${kurzerWochentag(d)}, ${tagMonat}`;
}

type HeuteZeile = {
  key: string;
  zeit: string;
  sortierung: string;
  icon: typeof BookOpen;
  titel: string;
  href: string | null;
};

const KARTE = "flex flex-col overflow-hidden rounded-xl border border-border";
const ZEILE_BASIS = "flex min-h-14 items-center gap-3 border-t border-border px-4";

export default async function HomePage() {
  const learner = await requireCurrentLearner();
  const heute = today();

  const [tag, curriculum, naechster] = await Promise.all([
    getTagesAgenda(learner.organisationId, learner.cohortId, learner.enrolmentId, learner.personId, heute),
    getCurriculumFortschritt(learner.personId, learner.programmeId),
    getNaechsterTermin(learner.organisationId, learner.cohortId, learner.enrolmentId, heute),
  ]);

  const zeilen: HeuteZeile[] = [
    ...tag.theorie.map((e) => {
      const zeit = e.liveSession ? e.liveSession.start.slice(0, 5) : "flexibel";
      const icon =
        e.contentType === "live" ? Video : e.contentType === "repository" ? FileText : BookOpen;
      return {
        key: e.scheduleEntryId,
        zeit,
        // Termine mit Uhrzeit zuerst, chronologisch; flexible danach.
        sortierung: e.liveSession ? e.liveSession.start : "99",
        icon,
        titel: e.titel,
        href: e.lessonId ? `/content/${e.lessonId}?von=home` : null,
      };
    }),
    // Praxistage haben kein Zeitfeld -- Spalte bleibt leer.
    ...tag.feld.map((e) => ({
      key: e.scheduleEntryId,
      zeit: "",
      sortierung: "98",
      icon: Wrench,
      titel: e.titel,
      href: `/praxistag/${e.fieldJobId}`,
    })),
  ].sort((a, b) => a.sortierung.localeCompare(b.sortierung));

  const vorname = learner.name.trim().split(" ")[0];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={vorname ? `Hallo ${vorname}` : "Hallo"} />

      <div className="grid gap-4 md:grid-cols-2">
        <section aria-labelledby="heute" className={KARTE}>
          <div className="flex items-center gap-2 p-4">
            <Calendar className="size-[18px] shrink-0 text-eco-deep-green" aria-hidden="true" />
            <h2 id="heute" className="text-[15px] font-semibold text-eco-deep-green">
              Heute
            </h2>
            <span className="ml-auto text-[13px] text-muted-foreground">{formatUeberschrift(heute)}</span>
          </div>

          {zeilen.length > 0 ? (
            <ul>
              {zeilen.map((z) => {
                const Icon = z.icon;
                const inhalt = (
                  <>
                    <span className="w-[52px] shrink-0 text-[13px] font-semibold tabular-nums text-eco-deep-green">
                      {z.zeit}
                    </span>
                    <Icon className="size-[18px] shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="min-w-0 flex-1 text-sm font-medium text-eco-deep-green">{z.titel}</span>
                    {z.href && (
                      <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    )}
                  </>
                );
                return (
                  <li key={z.key}>
                    {/* Ohne Zielseite kein Hover und kein Pfeil. */}
                    {z.href ? (
                      <Link
                        href={z.href}
                        className={cn(
                          ZEILE_BASIS,
                          "outline-none transition-[background-color] duration-150 hover:bg-eco-green/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-eco-green motion-reduce:transition-none"
                        )}
                      >
                        {inhalt}
                      </Link>
                    ) : (
                      <div className={ZEILE_BASIS}>{inhalt}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col gap-1 border-t border-border p-4">
              <p className="text-sm font-medium text-eco-deep-green">Heute finden keine Kurse statt.</p>
              {naechster && (
                <p className="text-[13px] text-muted-foreground">
                  Nächster Termin: {formatKurz(naechster.datum)}
                  {naechster.start && `, ${naechster.start.slice(0, 5)}`}
                </p>
              )}
            </div>
          )}

          <div className="mt-auto">
            <LinkRow href="/schedule">Zum Stundenplan</LinkRow>
          </div>
        </section>

        <CurriculumCard fortschritt={curriculum} link={{ href: "/kompetenzen", label: "Zu den Kompetenzen" }} />
      </div>
    </div>
  );
}
