import type { CaptureUiStatus } from "@/components/status-badge";

/**
 * Typen/Konstanten ohne Server-Import (next/headers), damit sie sowohl von
 * Server-Queries (queries/praxistag.ts) als auch vom Client-Flow
 * (praxistag-flow.tsx) importiert werden können, ohne next/headers versehentlich
 * ins Client-Bundle zu ziehen.
 */

export type FieldJobDetail = {
  fieldJobId: string;
  status: "geplant" | "durchgeführt";
  titel: string;
  beschreibung: string | null;
  vorbereitungText: string | null;
  vorbereitungContentId: string | null;
  nachbereitungText: string | null;
  nachbereitungContentId: string | null;
  reflexionsFragen: { id: string; frageText: string; antwortoptionen: string[] }[];
  capture: { id: string; status: CaptureUiStatus } | null;
};
