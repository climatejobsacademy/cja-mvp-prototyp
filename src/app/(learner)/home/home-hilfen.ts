// Home (docs/design_handoff_home_v6; SR-73): reine Hilfsfunktionen
// der Home-Seite -- Termin-Texte (Datumsanzeige aus src/lib/date.ts), Tagestyp und die Umwandlung der
// Tagesagenda in die Eingabe von getDayState().

import { datumKurz, tageZwischen, wochentagLang } from "@/lib/date";
import type { TagesAktivitaeten } from "@/lib/home-tag";
import type { NaechsterTermin, TagesAgenda } from "@/lib/queries/schedule";

/** "Praxistag" / "Theorietag ab 13:00" / "Selbstlernen" (getNaechsterTermin liefert nur bei Live eine Uhrzeit). */
function terminArt(t: NaechsterTermin): string {
  if (t.art === "feld") return "Praxistag";
  if (t.art === "live") return `Theorietag${t.start ? ` ab ${t.start.slice(0, 5)}` : ""}`;
  return "Selbstlernen";
}

/** Zustand F: "Mi, 30.09., 13:00" bzw. ohne Uhrzeit. */
export function naechsterTerminText(t: NaechsterTermin): string {
  return `${datumKurz(t.datum)}${t.start ? `, ${t.start.slice(0, 5)}` : ""}`;
}

/** Vorschau in Zustand D (Brief 3, SR-93): "Morgen: Praxistag" / "Montag, 16.11.: Theorietag ab 13:00" */
export function naechsterTagText(t: NaechsterTermin, heute: string): string {
  return `${wannText(t.datum, heute)}: ${terminArt(t)}`;
}

/** SR-93: „Morgen“, sonst Wochentag mit Datum ("Montag, 16.11."). */
function wannText(datum: string, heute: string): string {
  return tageZwischen(heute, datum) === 1 ? "Morgen" : `${wochentagLang(datum)}, ${datum.slice(8, 10)}.${datum.slice(5, 7)}.`;
}

/**
 * Home v13: dezente Zeile "Morgen: Praxistag" bzw. "Dienstag: Theorietag ab
 * 13:00", wenn unter der Fokus-Karte sonst nichts steht.
 */
export function naechsterTagZeile(t: NaechsterTermin, heute: string): { wann: string; was: string } {
  return { wann: `Als Nächstes · ${wannText(t.datum, heute)}`, was: terminArt(t) };
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
              thema: e.thema,
              start: e.liveSession.start,
              ende: e.liveSession.ende,
              joinLink: e.liveSession.joinLink,
              lessonId: e.lessonId,
              trainerId: e.liveSession.trainerId,
            },
          ]
        : []
    ),
    flex: tag.theorie.flatMap((e) =>
      e.art === "asynchron" && e.lessonId
        ? [
            {
              id: e.scheduleEntryId,
              titel: e.titel,
              thema: e.thema,
              lessonId: e.lessonId,
              erledigt: e.unitProgressStatus === "abgeschlossen",
              begonnen: e.unitProgressStatus === "in Bearbeitung",
              festigt: e.liveLektionId !== null,
            },
          ]
        : []
    ),
    praxis: tag.feld.map((e) => ({
      id: e.scheduleEntryId,
      fieldJobId: e.fieldJobId,
      titel: e.titel,
      standort: e.standort,
      start: e.start,
      ende: e.ende,
      durchgefuehrt: e.status === "durchgeführt",
      trainerId: e.trainerId,
      zweitTrainerId: e.zweitTrainerId,
      phase: e.phase,
      ergebnis: e.ergebnis,
      labor: e.labor,
    })),
  };
}
