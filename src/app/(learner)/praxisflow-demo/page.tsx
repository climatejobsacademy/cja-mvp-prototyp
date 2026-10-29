import { DEMO_AUFTRAG } from "@/lib/praxisflow-daten";

import { PraxisflowDemo } from "./praxisflow-demo";

// Praxisflow-Demo (Investor-Demo 15.10.2026, nur Branch demo): keine
// Datenabfrage, kein Schreiben. Login und Einschreibung prüft weiterhin das
// Learner-Layout.
export default async function PraxisflowDemoPage({
  searchParams,
}: {
  searchParams: Promise<{ von?: string; spannung?: string; ansicht?: string }>;
}) {
  const { von, spannung, ansicht } = await searchParams;
  // Wie im alten Flow (praxistag/[fieldJobId]/page.tsx): aus dem Reiter
  // Programm zurück dorthin, sonst zum Stundenplan.
  const zurueck = von === "programm" ? { href: "/content", label: "Programm" } : { href: "/schedule", label: "Stundenplan" };

  // Auftrag ohne Spannung zum Ausprobieren: ?spannung=aus (Anna 2026-10-20).
  // Standard ist die neue Ansicht „Jetzt dran“ (Anna 2026-10-29); die alte
  // bleibt zum Vergleich unter ?ansicht=alt.
  return (
    <PraxisflowDemo
      zurueck={zurueck}
      unterSpannung={DEMO_AUFTRAG.unterSpannung && spannung !== "aus"}
      ansicht={ansicht === "alt" ? "alt" : "neu"}
    />
  );
}
