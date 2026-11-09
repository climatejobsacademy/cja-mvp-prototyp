import { notFound } from "next/navigation";

import { requireCurrentLearner } from "@/lib/queries/session";
import { getPraxisflow } from "@/lib/queries/praxisflow";

import { PraxisflowAblauf } from "./praxisflow-ablauf";

// Praxisauftrag im geführten Praxisflow (SR-64). Seit 0068 laufen alle
// Praxisaufgaben im geführten Ablauf; der frühere einfache Ablauf ist entfernt.
export default async function PraxisauftragPage({
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
  const praxisflow = await getPraxisflow(fieldJobId, learner.personId);
  if (!praxisflow) notFound();
  return <PraxisflowAblauf daten={praxisflow} zurueck={zurueck} />;
}
