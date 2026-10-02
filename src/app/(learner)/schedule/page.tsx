import { PageHeader } from "@/components/page-header";
import { heuteInBerlin } from "@/lib/date";
import { requireCurrentLearner } from "@/lib/queries/session";
import { getProgrammUebersicht, getTagesAgenda, getWochenUebersicht } from "@/lib/queries/schedule";

import { ScheduleTabs } from "./schedule-tabs";

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ datum?: string }>;
}) {
  const { datum } = await searchParams;
  const selectedDate = datum ?? heuteInBerlin();
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
