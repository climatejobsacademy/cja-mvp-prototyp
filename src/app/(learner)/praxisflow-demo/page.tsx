import { PraxisflowDemo } from "./praxisflow-demo";

// Praxisflow-Demo (Investor-Demo 15.10.2026, nur Branch demo): keine
// Datenabfrage, kein Schreiben. Login und Einschreibung prüft weiterhin das
// Learner-Layout.
export default async function PraxisflowDemoPage({
  searchParams,
}: {
  searchParams: Promise<{ von?: string }>;
}) {
  const { von } = await searchParams;
  // Wie im alten Flow (praxistag/[fieldJobId]/page.tsx): aus dem Reiter
  // Programm zurück dorthin, sonst zum Stundenplan.
  const zurueck = von === "programm" ? { href: "/content", label: "Programm" } : { href: "/schedule", label: "Stundenplan" };

  return <PraxisflowDemo zurueck={zurueck} />;
}
