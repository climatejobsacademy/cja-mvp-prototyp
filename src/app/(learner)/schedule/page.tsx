import { PageHeader } from "@/components/page-header";
import { requireCurrentLearner } from "@/lib/queries/session";
import { getProgrammUebersicht, getTagesAgenda, getWochenUebersicht } from "@/lib/queries/schedule";

import { ScheduleTabs } from "./schedule-tabs";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ datum?: string }>;
}) {
  const { datum } = await searchParams;
  const selectedDate = datum ?? today();
  const learner = await requireCurrentLearner();

  const [tag, woche, programm] = await Promise.all([
    getTagesAgenda(
      learner.organisationId,
      learner.cohortId,
      learner.enrolmentId,
      learner.personId,
      selectedDate
    ),
    getWochenUebersicht(
      learner.organisationId,
      learner.cohortId,
      learner.enrolmentId,
      learner.personId,
      selectedDate
    ),
    getProgrammUebersicht(learner.cohortId, learner.programmeId, learner.programmeName),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Stundenplan" />
      <ScheduleTabs selectedDate={selectedDate} tag={tag} woche={woche} programm={programm} />
    </div>
  );
}
