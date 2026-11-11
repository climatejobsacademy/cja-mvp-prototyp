import { notFound } from "next/navigation";

import { requireCurrentLearner } from "@/lib/queries/session";
import { getLabortag } from "@/lib/queries/labortag";
import { getPraxisflow } from "@/lib/queries/praxisflow";
import { einstiegAus } from "@/lib/praxisflow-ereignis";

import { LabortagSeite } from "./labortag-seite";
import { PraxisflowAblauf } from "./praxisflow-ablauf";

// Praxisauftrag im geführten Praxisflow (SR-64). Seit 0068 laufen alle
// Praxisaufgaben im geführten Ablauf; der frühere einfache Ablauf ist entfernt.
// Ausnahme Labortag (SR-94, ablauf labor): eigene Seite ohne Flow.
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
  // Einstieg für die Auswertung (SR-92): Herkunft aus ?von=, sonst "direkt".
  if (praxisflow) return <PraxisflowAblauf daten={praxisflow} zurueck={zurueck} einstieg={einstiegAus(von)} />;
  // Labortag (SR-94): ohne Praxisflow, nur Unterlagen.
  const labortag = await getLabortag(fieldJobId, learner.personId);
  if (labortag) return <LabortagSeite daten={labortag} zurueck={zurueck} />;
  notFound();
}
