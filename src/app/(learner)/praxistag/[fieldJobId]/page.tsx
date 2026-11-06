import { notFound } from "next/navigation";

import { requireCurrentLearner } from "@/lib/queries/session";
import { getFieldJobDetail } from "@/lib/queries/praxistag";
import { getPraxisflow } from "@/lib/queries/praxisflow";

import { PraxisflowAblauf } from "./praxisflow-ablauf";
import { PraxistagFlow } from "./praxistag-flow";

export default async function PraxistagPage({
  params,
  searchParams,
}: {
  params: Promise<{ fieldJobId: string }>;
  searchParams: Promise<{ von?: string }>;
}) {
  const { fieldJobId } = await params;
  const { von } = await searchParams;
  // Aus dem Reiter Programm zurück dorthin, sonst zum Stundenplan.
  const zurueck = von === "programm" ? { href: "/content", label: "Programm" } : { href: "/schedule", label: "Stundenplan" };
  const learner = await requireCurrentLearner();

  // Geführter Ablauf (SR-64), wenn der Auftrag ihn eingeschaltet hat;
  // sonst unverändert der einfache Praxistag.
  const praxisflow = await getPraxisflow(fieldJobId, learner.personId);
  if (praxisflow) {
    return <PraxisflowAblauf daten={praxisflow} zurueck={zurueck} />;
  }

  const detail = await getFieldJobDetail(fieldJobId, learner.personId);
  if (!detail) notFound();

  return (
    <PraxistagFlow detail={detail} organisationId={learner.organisationId} zurueck={zurueck} />
  );
}
