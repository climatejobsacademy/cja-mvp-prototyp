import type { PraxisDateiArt, PraxisFortschritt, PraxisPhase } from "@/lib/database.types";
import type { Pruefpunkt } from "@/lib/praxisflow-inhalte";

// Typen des geführten Praxisflows ohne Server-Import, damit Server-Query und
// Client-Komponente sie gemeinsam nutzen (wie praxistag-shared.ts).

export type PraxisDatei = {
  id: string;
  art: PraxisDateiArt;
  dateiname: string;
  mimeType: string;
  storagePfad: string;
  /** Signierter Link (1 Stunde), null = nicht abrufbar */
  url: string | null;
};

export type PraxisflowDaten = {
  fieldJobId: string;
  learnerId: string;
  organisationId: string;
  titel: string;
  beschreibung: string | null;
  datum: string;
  phase: PraxisPhase;
  fortschritt: PraxisFortschritt;
  dateien: PraxisDatei[];
  /** Trainer:in des Praxistags (SR-78), null = nicht zugeordnet */
  trainer: { name: string; fotoUrl: string | null } | null;
  /** Prüfliste des Auftrags (SR-91): Variante aus der Datenbank, sonst Standard */
  pruefliste: { spannungsfrei: Pruefpunkt[]; unterSpannung: Pruefpunkt[] };
  /** Nächster offener Praxisauftrag desselben Tages (SR-90), null = keiner */
  naechster: { fieldJobId: string; titel: string } | null;
};

/** Antwort der Server-Aktionen: ok oder eine Meldung für die Oberfläche. */
export type AktionErgebnis<T = undefined> = { ok: true; wert: T } | { ok: false; fehler: string };
