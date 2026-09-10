import { notFound } from "next/navigation";

import { requireCurrentLearner } from "@/lib/queries/session";
import { getFieldJobDetail } from "@/lib/queries/praxistag";

import { PraxistagFlow } from "./praxistag-flow";

export default async function PraxistagPage({
  params,
}: {
  params: Promise<{ fieldJobId: string }>;
}) {
  const { fieldJobId } = await params;
  const learner = await requireCurrentLearner();
  const detail = await getFieldJobDetail(fieldJobId, learner.personId);

  if (!detail) notFound();

  return (
    <PraxistagFlow detail={detail} organisationId={learner.organisationId} />
  );
}
