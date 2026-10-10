// Home v6 (docs/design_handoff_home_v6, SR folgt): reine Hilfsfunktionen
// der Home-Seite -- Datumsformate, Tagestyp und die Umwandlung der
// Tagesagenda in die Eingabe von getDayState().

import type { TagesAktivitaeten } from "@/lib/home-tag";
import type { NaechsterTermin, TagesAgenda } from "@/lib/queries/schedule";

/** Datum "JJJJ-MM-TT" als Mitternacht UTC, damit die Anzeige nie um einen Tag verrutscht. */
const alsDatum = (dateStr: string) => new Date(`${dateStr}T00:00:00Z`);

function kurzerWochentag(date: Date): string {
  return date.toLocaleDateString("de-DE", { weekday: "short", timeZone: "UTC" }).replace(".", "");
}

/** Fließtext: "Mi, 30.09." */
export function formatKurz(dateStr: string): string {
  const d = alsDatum(dateStr);
  const tagMonat = d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
  // de-DE liefert "30.09." inklusive Schlusspunkt.
  return `${kurzerWochentag(d)}, ${tagMonat}`;
}

/** Begrüßungszeile: "Freitag, 9. Oktober" */
export function formatLang(dateStr: string): string {
  return alsDatum(dateStr).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

/** Zustand F: "Mi, 30.09., 13:00" bzw. ohne Uhrzeit. */
export function naechsterTerminText(t: NaechsterTermin): string {
  return `${formatKurz(t.datum)}${t.start ? `, ${t.start.slice(0, 5)}` : ""}`;
}

/** Vorschau in Zustand D (Brief 3): "Montag: Praxistag" / "Montag: Theorietag ab 13:00" */
export function naechsterTagText(t: NaechsterTermin): string {
  const wochentag = alsDatum(t.datum).toLocaleDateString("de-DE", { weekday: "long", timeZone: "UTC" });
  if (t.art === "feld") return `${wochentag}: Praxistag`;
  if (t.art === "live") return `${wochentag}: Theorietag${t.start ? ` ab ${t.start.slice(0, 5)}` : ""}`;
  return `${wochentag}: Selbstlernen`;
}

/**
 * Home v13: dezente Zeile "Morgen: Praxistag" bzw. "Dienstag: Theorietag ab
 * 13:00", wenn unter der Fokus-Karte sonst nichts steht. Praxistage ohne
 * Uhrzeit (kein Zeitfeld in field_job).
 */
export function naechsterTagZeile(t: NaechsterTermin, heute: string): { wann: string; was: string } {
  const tage = Math.round((alsDatum(t.datum).getTime() - alsDatum(heute).getTime()) / 86_400_000);
  const wann =
    tage === 1
      ? "Morgen"
      : tage < 7
        ? alsDatum(t.datum).toLocaleDateString("de-DE", { weekday: "long", timeZone: "UTC" })
        : formatKurz(t.datum);
  const was =
    t.art === "feld" ? "Praxistag" : t.art === "live" ? `Theorietag${t.start ? ` ab ${t.start.slice(0, 5)}` : ""}` : "Selbstlernen";
  return { wann, was };
}

/**
 * Kopf für Offenes von früher (Brief 3, Zustand E): "Noch offen von Freitag"
 * innerhalb der letzten Woche, sonst mit Datum "Noch offen vom Mi, 30.09.".
 */
export function nochOffenText(datum: string, heute: string): string {
  const tage = Math.round((alsDatum(heute).getTime() - alsDatum(datum).getTime()) / 86_400_000);
  if (tage === 1) return "Noch offen von gestern";
  if (tage > 1 && tage < 7) {
    return `Noch offen von ${alsDatum(datum).toLocaleDateString("de-DE", { weekday: "long", timeZone: "UTC" })}`;
  }
  return `Noch offen vom ${formatKurz(datum)}`;
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
