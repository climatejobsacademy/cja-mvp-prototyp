import { notFound } from "next/navigation";

import { SPRACHTRAINING_DEMO } from "@/lib/demo-schalter";

import { FachspracheDesTages } from "./fachsprache";

// Sprachtraining-Demo (Investoren-Demo, nur Branch demo, geht nicht nach dev;
// SR-31 Fachsprache des Tages): keine Datenabfrage, kein Schreiben. Login und
// Einschreibung prüft das Learner-Layout.
export default async function SprachtrainingDemoPage({ searchParams }: { searchParams: Promise<{ von?: string }> }) {
  // Außerhalb der Demo gibt es die Seite nicht (demo-schalter.ts).
  if (!SPRACHTRAINING_DEMO) notFound();
  const { von } = await searchParams;
  const zurueck = von === "stundenplan" ? { href: "/schedule", label: "Zurück zum Stundenplan" } : { href: "/home", label: "Zurück zu Home" };
  return <FachspracheDesTages zurueck={zurueck} />;
}
