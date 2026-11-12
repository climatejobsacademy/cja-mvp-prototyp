import { notFound } from "next/navigation";

import { requireCurrentLearner } from "@/lib/queries/session";
import { getLabortag } from "@/lib/queries/labortag";
import { getPraxisflow } from "@/lib/queries/praxisflow";
import { einstiegAus } from "@/lib/praxisflow-ereignis";
import { praxisZurueck } from "@/lib/zurueck";

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
  const learner = await requireCurrentLearner();
  const praxisflow = await getPraxisflow(fieldJobId, learner.personId);
  // Einstieg für die Auswertung (SR-92): Herkunft aus ?von=, sonst "direkt".
  // Zurück dorthin, woher der Auftrag geöffnet wurde (SR-64 Navigation).
  if (praxisflow) return <PraxisflowAblauf daten={praxisflow} zurueck={praxisZurueck(von, praxisflow.datum)} einstieg={einstiegAus(von)} />;
  // Labortag (SR-94): ohne Praxisflow, nur Unterlagen.
  const labortag = await getLabortag(fieldJobId, learner.personId);
  if (labortag) return <LabortagSeite daten={labortag} zurueck={praxisZurueck(von, labortag.datum)} />;
  notFound();
}
