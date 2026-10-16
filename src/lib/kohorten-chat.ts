// Kohorten-Chat (SR-83, Migration 0050): reine Hilfsfunktionen ohne
// Server-Import, damit sie in Server- und Client-Komponenten sowie in
// node:test nutzbar sind.

import type { ChatKanal } from "@/lib/database.types";

/** Höchstlänge einer Nachricht, wie der Check in 0050. */
export const NACHRICHT_MAX = 1000;

/** So viele Nachrichten je Kanal lädt die App (die neuesten). */
export const NACHRICHTEN_LIMIT = 100;

/** Abstand zwischen zwei Abfragen bei offenem Chat (SR-83: spätestens nach 30 Sekunden). */
export const ABFRAGE_OFFEN_MS = 30_000;
/** Bei geschlossenem Chat reicht ein seltenerer Blick auf den Ungelesen-Zähler. */
export const ABFRAGE_ZU_MS = 120_000;

export type KanalInfo = { kanal: ChatKanal; titel: string; zusatz: string; nurTeam: boolean };

/** Die beiden festen Kanäle je Kohorte (Entscheidung Anna 2026-10-16). */
export const KANAELE: KanalInfo[] = [
  { kanal: "ankuendigungen", titel: "Ankündigungen", zusatz: "Nur deine Trainer:innen und das Team schreiben hier", nurTeam: true },
  { kanal: "treffpunkt", titel: "Treffpunkt", zusatz: "Für alle in deiner Kohorte", nurTeam: false },
];

export function istKanal(wert: unknown): wert is ChatKanal {
  return wert === "ankuendigungen" || wert === "treffpunkt";
}

/** Eingabe prüfen wie die Datenbank: getrimmt, 1 bis 1000 Zeichen. */
export function nachrichtPruefen(eingabe: string): { ok: true; text: string } | { ok: false; fehler: "leer" | "zu_lang" } {
  const text = eingabe.trim();
  if (text.length === 0) return { ok: false, fehler: "leer" };
  if ([...text].length > NACHRICHT_MAX) return { ok: false, fehler: "zu_lang" };
  return { ok: true, text };
}

/** Kürzel für den runden Platzhalter: "Lea M." -> "LM", "Cem" -> "C". */
export function kuerzel(anzeigename: string | null): string {
  if (!anzeigename) return "?";
  const teile = anzeigename.replace(/\./g, "").trim().split(/\s+/).filter(Boolean);
  return teile
    .slice(0, 2)
    .map((t) => [...t][0]?.toUpperCase() ?? "")
    .join("");
}

/** Vorschau der letzten Nachricht in der Kanalliste. */
export function vorschau(name: string, text: string, max = 60): string {
  const zeile = `${name}: ${text.replace(/\s+/g, " ").trim()}`;
  return [...zeile].length > max ? `${[...zeile].slice(0, max - 1).join("")}…` : zeile;
}
