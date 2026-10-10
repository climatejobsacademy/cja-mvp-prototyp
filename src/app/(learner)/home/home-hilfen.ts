// Home v6 (docs/design_handoff_home_v6, SR folgt): reine Hilfsfunktionen
// der Home-Seite -- Termin-Texte (Datumsanzeige aus src/lib/date.ts), Tagestyp und die Umwandlung der
// Tagesagenda in die Eingabe von getDayState().

import { datumKurz, tageZwischen, tagRelativ, wochentagLang } from "@/lib/date";
import type { TagesAktivitaeten } from "@/lib/home-tag";
import type { NaechsterTermin, TagesAgenda } from "@/lib/queries/schedule";

/** "Praxistag" / "Theorietag ab 13:00" / "Selbstlernen" (Praxistage ohne Uhrzeit, kein Zeitfeld in field_job). */
function terminArt(t: NaechsterTermin): string {
  if (t.art === "feld") return "Praxistag";
  if (t.art === "live") return `Theorietag${t.start ? ` ab ${t.start.slice(0, 5)}` : ""}`;
  return "Selbstlernen";
}

/** Zustand F: "Mi, 30.09., 13:00" bzw. ohne Uhrzeit. */
export function naechsterTerminText(t: NaechsterTermin): string {
  return `${datumKurz(t.datum)}${t.start ? `, ${t.start.slice(0, 5)}` : ""}`;
}

/** Vorschau in Zustand D (Brief 3): "Montag: Praxistag" / "Montag: Theorietag ab 13:00" */
export function naechsterTagText(t: NaechsterTermin): string {
  return `${wochentagLang(t.datum)}: ${terminArt(t)}`;
}

/**
 * Home v13: dezente Zeile "Morgen: Praxistag" bzw. "Dienstag: Theorietag ab
 * 13:00", wenn unter der Fokus-Karte sonst nichts steht.
 */
export function naechsterTagZeile(t: NaechsterTermin, heute: string): { wann: string; was: string } {
  const wann = tagRelativ(t.datum, heute);
  return { wann: wann.charAt(0).toUpperCase() + wann.slice(1), was: terminArt(t) };
}

/**
 * Kopf für Offenes von früher (Brief 3, Zustand E): "Noch offen von Freitag"
 * innerhalb der letzten Woche, sonst mit Datum "Noch offen vom Mi, 30.09.".
 */
export function nochOffenText(datum: string, heute: string): string {
  const tage = tageZwischen(datum, heute);
  if (tage === 1) return "Noch offen von gestern";
  if (tage > 1 && tage < 7) return `Noch offen von ${wochentagLang(datum)}`;
  return `Noch offen vom ${datumKurz(datum)}`;
}

export type Tagestyp = "praxis" | "theorie" | null;

/**
 * Brief 2.2: Praxistag, sobald heute ein Field Job geplant ist (hat
 * Vorrang), sonst Theorietag, wenn heute Live-Unterricht stattfindet. Nur
 * Selbstlernen oder nichts geplant: kein Label.
 */
export function tagestyp(tag: TagesAgenda): Tagestyp {
  if (tag.istPraxistag) return "praxis";
  if (tag.theorie.some((e) => e.art === "live")) return "theorie";
  return null;
}

/** Home v12: "Theorietag · online", wenn ein heutiger Live-Termin einen Beitritts-Link hat. */
export function istOnline(tag: TagesAgenda): boolean {
  return tag.theorie.some((e) => e.art === "live" && !!e.liveSession?.joinLink);
}

/** Tagesagenda → Eingabe für getDayState (Live mit Uhrzeit, Selbstlernen, Praxis). */
export function aktivitaeten(tag: TagesAgenda): TagesAktivitaeten {
  return {
    datum: tag.datum,
    live: tag.theorie.flatMap((e) =>
      e.art === "live" && e.liveSession
        ? [
            {
              id: e.scheduleEntryId,
              titel: e.titel,
              start: e.liveSession.start,
              ende: e.liveSession.ende,
              joinLink: e.liveSession.joinLink,
              lessonId: e.lessonId,
            },
          ]
        : []
    ),
    flex: tag.theorie.flatMap((e) =>
      e.art === "asynchron" && e.lessonId
        ? [{ id: e.scheduleEntryId, titel: e.titel, lessonId: e.lessonId, erledigt: e.unitProgressStatus === "abgeschlossen" }]
        : []
    ),
    praxis: tag.feld.map((e) => ({
      id: e.scheduleEntryId,
      fieldJobId: e.fieldJobId,
      titel: e.titel,
      standort: e.standort,
      durchgefuehrt: e.status === "durchgeführt",
    })),
  };
}
