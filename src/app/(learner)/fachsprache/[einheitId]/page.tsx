import { notFound } from "next/navigation";

import { zurueckZiel } from "@/lib/fachsprache-laden";
import { getEinheitSeite } from "@/lib/queries/fachsprache";

import { FachspracheEinheit } from "./einheit";

// Fachsprache-Einheit (Stufe 2, Migration 0051, SR-84): Wörter, Quiz, Sätze
// zu einer Lektion. Nur Lesen, kein Lernstand, keine competency_evidence
// (Regel 6). 404, wenn der Schalter FACHSPRACHE_EINHEIT aus ist, die Einheit
// nicht lesbar oder nicht veröffentlicht ist (AfCJ admin sieht Entwürfe mit
// Banner). Login und Einschreibung prüft das Learner-Layout. Regeln:
// src/lib/fachsprache-laden.ts.
export default async function FachspracheEinheitPage({
  params,
  searchParams,
}: {
  params: Promise<{ einheitId: string }>;
  searchParams: Promise<{ von?: string; datum?: string }>;
}) {
  const { einheitId } = await params;
  const { von, datum } = await searchParams;

  const ergebnis = await getEinheitSeite(einheitId);
  if (ergebnis.art !== "ok") notFound();

  return <FachspracheEinheit einheit={ergebnis.einheit} zurueck={zurueckZiel(von, datum)} />;
}
