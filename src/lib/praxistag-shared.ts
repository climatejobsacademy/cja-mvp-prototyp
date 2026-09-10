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
  capture: { id: string; status: CaptureUiStatus } | null;
};

/**
 * Statische Reflexions-Fragen für die Nachbereitung (design-specifications.md
 * 2.1: "vorgegebene Auswahl-Fragen ... kein Freitext im Prototyp"). Es gibt im
 * Datenmodell keine Entität für eine Fragen-Bank pro field_job_type — das ist
 * reiner Frontend-Content, keine Schema-Erweiterung. Antworten werden als
 * Text in field_capture.text serialisiert (siehe actions.ts).
 */
export const REFLEXIONS_FRAGEN = [
  {
    frage: "Wie sicher hast du dich bei dieser Aufgabe gefühlt?",
    optionen: ["Sehr sicher", "Größtenteils sicher", "Unsicher an manchen Stellen", "Musste viel nachfragen"],
  },
  {
    frage: "Was hat dir bei der Vorbereitung am meisten geholfen?",
    optionen: ["Die Vorbereitungs-Instruktion", "Vorwissen aus dem Kurs", "Kolleg:innen vor Ort", "Nichts davon"],
  },
  {
    frage: "Möchtest du diese Tätigkeit nochmal in Ruhe wiederholen?",
    optionen: ["Nein, passt", "Gerne als Wiederholung einplanen", "Ich habe noch offene Fragen dazu"],
  },
] as const;
