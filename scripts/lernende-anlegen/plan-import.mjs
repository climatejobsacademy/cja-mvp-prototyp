// scripts/lernende-anlegen/plan-import.mjs
// Reine Funktionen für den Plan-Import-Teil von scripts/lernende-anlegen.mjs
// (SR-48, Entscheidung Anna 18.10. „Variante B“): Praxistage hängen an der
// Einschreibung und entstehen nur über scripts/import-plan.mjs. Darum ruft
// lernende-anlegen mit --plan-datei den Plan-Import für die Kohorten der
// Lernenden-Liste auf, und am Ende prüft eine Kontrolle, ob aktive
// Einschreibungen ohne eigene Praxistage übrig sind.
//
// Keine Datenbank, kein Kindprozess, keine Uhr. Getestet in
// plan-import.test.mjs. Anleitung: docs/lernende-anlegen.md.
//
// Kohortennamen sind keine Personendaten; Namen und E-Mail-Adressen kommen
// hier nicht vor.

import { basename } from "node:path";

/** Pfad, unter dem der Plan-Import in Befehlen für die Person steht. */
export const IMPORT_PLAN_ANZEIGE = "scripts/import-plan.mjs";

const VERSATZ = /^(.+?)(?:@([+-]\d+))?$/;

/** Antwort auf „Tippe ja“: nur „ja“ (Groß-/Kleinschreibung und Leerzeichen egal). */
export function istJa(antwort) {
  return (antwort ?? "").trim().toLowerCase() === "ja";
}

/**
 * Prüft die Dateinamen für den Plan-Import, bevor irgendetwas in die
 * Datenbank geht: Plan als .xlsx, Trainer-Datei als .csv mit derselben
 * staging-Regel wie in import-plan.mjs (Staging verschickt echte Mails).
 * --trainer-datei ist mit --plan-datei Pflicht, sonst bekämen die neuen
 * Praxistage keine Trainer:in.
 */
export function pruefePlanDateien({ planDatei, trainerDatei, ziel }) {
  if (!planDatei) throw new Error("--plan-datei fehlt.");
  if (!basename(planDatei).toLowerCase().endsWith(".xlsx")) {
    throw new Error(`Die Plan-Datei muss eine Excel-Datei sein (.xlsx), nicht ${basename(planDatei)}.`);
  }
  if (!trainerDatei) throw new Error("Mit --plan-datei auch --trainer-datei angeben (dieselbe wie beim Plan-Import).");
  const name = basename(trainerDatei).toLowerCase();
  if (!name.endsWith(".csv")) throw new Error(`Die Trainer-Datei muss reine CSV sein (.csv), nicht ${basename(trainerDatei)}.`);
  if (ziel === "staging" && !name.includes("staging")) {
    throw new Error("Auf Staging nur eine Trainer-Datei mit „staging“ im Namen (Test-Adressen, Staging verschickt echte Mails).");
  }
  if (ziel === "production" && name.includes("staging")) {
    throw new Error("Die Staging-Trainer-Datei nicht für Production verwenden.");
  }
}

/**
 * Kohorten für den Plan-Import: genau die Kohorten aus der Lernenden-Liste
 * (Reihenfolge wie in der Datei, jede einmal). --kohorte "Name@+7" gibt für
 * eine dieser Kohorten den Versatz in Tagen an (wie bei import-plan.mjs);
 * eine --kohorte, die nicht in der Liste steht, ist ein Fehler, denn das
 * Skript importiert nur für die betroffenen Kohorten.
 *
 * @param {string[]} listenKohorten Kohortennamen aus der CSV (auch doppelt)
 * @param {string[]} kohorteArgs Werte von --kohorte
 * @returns {string[]} Werte für --kohorte beim Plan-Import ("Name" oder "Name@+7")
 */
export function kohortenFuerImport(listenKohorten, kohorteArgs = []) {
  const namen = [...new Set(listenKohorten.map((k) => (k ?? "").trim()).filter(Boolean))];
  if (!namen.length) throw new Error("Keine Kohorte in der Lernenden-Liste.");
  for (const n of namen) {
    if (/@[+-]\d+$/.test(n)) throw new Error(`Kohortenname „${n}“ endet wie ein Versatz (@+7) und lässt sich nicht an den Plan-Import geben.`);
  }
  const versatz = new Map();
  for (const eintrag of kohorteArgs) {
    const m = VERSATZ.exec((eintrag ?? "").trim());
    if (!m) throw new Error("--kohorte ist leer.");
    const name = m[1].trim();
    if (!namen.includes(name)) {
      throw new Error(`--kohorte „${name}“ steht nicht in der Lernenden-Liste (dort: ${namen.map((x) => `„${x}“`).join(", ")}).`);
    }
    if (versatz.has(name)) throw new Error(`--kohorte „${name}“ ist doppelt angegeben.`);
    versatz.set(name, m[2] ? Number(m[2]) : 0);
  }
  return namen.map((n) => {
    const v = versatz.get(n) ?? 0;
    return v ? `${n}@${v > 0 ? "+" : ""}${v}` : n;
  });
}

/**
 * Argumente für den Kindprozess `node <skript> …` (ohne "node").
 *
 * Gibt --ausfuehren nur weiter, wenn `ausfuehren` gesetzt ist UND die
 * Bestätigung „ja“ lautet; sonst Probelauf. `ausfuehren` ohne Bestätigung
 * ist ein Fehler, damit kein Aufruf aus Versehen speichert.
 *
 * Weitergereicht werden nur Ziel, Freigabe, Trainer-Datei, Kohorten und
 * --module / --ohne-praxis / --ohne-zuordnung-erlauben. Fachsprache,
 * --nur-trainer und --migration-vorab gehören nicht in diesen Lauf.
 */
export function importPlanArgumente(
  { skript = IMPORT_PLAN_ANZEIGE, planDatei, ziel, productionFreigabe = false, trainerDatei, kohorten, module, ohnePraxis, ohneZuordnungErlauben = false },
  { ausfuehren = false, bestaetigung } = {}
) {
  if (ziel !== "staging" && ziel !== "production") throw new Error("Ziel muss staging oder production sein.");
  if (ziel === "production" && !productionFreigabe) throw new Error("Production nur mit --production-freigabe.");
  if (!planDatei) throw new Error("--plan-datei fehlt.");
  if (!trainerDatei) throw new Error("--trainer-datei fehlt.");
  if (!kohorten?.length) throw new Error("Keine Kohorte für den Plan-Import.");
  if (ausfuehren && !istJa(bestaetigung)) throw new Error("Plan-Import speichern nur nach Bestätigung mit „ja“.");
  return [
    skript,
    "--datei", planDatei,
    "--ziel", ziel,
    ...(ziel === "production" ? ["--production-freigabe"] : []),
    "--trainer-datei", trainerDatei,
    ...kohorten.flatMap((k) => ["--kohorte", k]),
    ...(module ? ["--module", module] : []),
    ...(ohnePraxis ? ["--ohne-praxis", ohnePraxis] : []),
    ...(ohneZuordnungErlauben ? ["--ohne-zuordnung-erlauben"] : []),
    ...(ausfuehren ? ["--ausfuehren"] : []),
  ];
}

/** Argumente für `import-plan.mjs --nur-analyse` (liest nur die Excel, keine Datenbank). */
export function analyseArgumente({ skript = IMPORT_PLAN_ANZEIGE, planDatei, module, ohnePraxis }) {
  return [skript, "--datei", planDatei, ...(module ? ["--module", module] : []), ...(ohnePraxis ? ["--ohne-praxis", ohnePraxis] : []), "--nur-analyse"];
}

/** Ein Wert für die Shell, nur wenn nötig in einfachen Anführungszeichen. */
export function shellWert(w) {
  const s = String(w);
  if (/^[A-Za-z0-9_\/.,:=+@%-]+$/.test(s)) return s;
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

/** Argumente als Befehl zum Kopieren: "node scripts/import-plan.mjs …". */
export function befehlAlsText(argumente) {
  return ["node", ...argumente].map(shellWert).join(" ");
}

/**
 * Lesende Kontroll-Abfrage für psql (-At): je Kohorte aus der Liste die
 * aktiven Einschreibungen, davon mit eigenen Terminen (schedule_entry mit
 * enrolment_id, das sind die Praxistage) und ohne. Läuft in einer
 * Nur-Lese-Transaktion und gibt eine Zeile JSON aus. Keine Namen, keine
 * Adressen, nur Anzahlen.
 */
export function kontrolleSql(kohortenNamen, tag) {
  const json = JSON.stringify([...new Set(kohortenNamen)]);
  if (!/^[a-z_][a-z0-9_]*$/.test(tag) || json.includes(tag)) throw new Error("Interner Fehler beim Zusammensetzen der Kontrolle.");
  return `
\\set ON_ERROR_STOP 1
\\set VERBOSITY terse
set client_min_messages = warning;
begin transaction read only;
select coalesce(json_agg(json_build_object('kohorte', x.name, 'aktiv', x.aktiv, 'mitTerminen', x.mit, 'ohne', x.ohne) order by x.name), '[]'::json)
  from (
    select c.name,
           count(e.id) as aktiv,
           count(e.id) filter (where exists (select 1 from schedule_entry s where s.enrolment_id = e.id)) as mit,
           count(e.id) filter (where not exists (select 1 from schedule_entry s where s.enrolment_id = e.id)) as ohne
      from cohort c
      left join enrolment e on e.cohort_id = c.id and e.status = 'aktiv'
     where c.name in (select jsonb_array_elements_text($${tag}$${json}$${tag}$::jsonb))
     group by c.id, c.name
  ) x;
rollback;
`;
}

/** Letzte nicht leere Zeile der psql-Ausgabe als JSON-Liste. */
export function leseKontrolle(ausgabe) {
  const zeile = String(ausgabe ?? "").split(/\r?\n/).map((z) => z.trim()).filter(Boolean).pop();
  const werte = JSON.parse(zeile ?? "");
  if (!Array.isArray(werte)) throw new Error("Kontrolle: unerwartete Ausgabe.");
  return werte.map((w) => ({ kohorte: String(w.kohorte), aktiv: Number(w.aktiv), mitTerminen: Number(w.mitTerminen), ohne: Number(w.ohne) }));
}

/**
 * Bewertet die Kontrolle. Gezählt werden nur Kohorten, die überhaupt
 * Praxistage haben (mindestens eine andere aktive Einschreibung mit eigenen
 * Terminen); sonst lässt sich nichts vergleichen, das steht als Hinweis da.
 *
 * @returns {{ ohne: number, zeilen: string[] }} ohne = Lernende ohne Praxistage
 */
export function bewerteKontrolle(werte, erwarteteKohorten = []) {
  const zeilen = [];
  let ohne = 0;
  for (const w of werte) {
    if (w.mitTerminen === 0) {
      zeilen.push(`  ${w.kohorte}: ${w.aktiv} aktive Einschreibungen, die Kohorte hat noch keine Praxistage – nichts zu vergleichen.`);
    } else if (w.ohne > 0) {
      ohne += w.ohne;
      zeilen.push(`  ${w.kohorte}: ${w.ohne} von ${w.aktiv} aktiven Einschreibungen OHNE Praxistage.`);
    } else {
      zeilen.push(`  ${w.kohorte}: alle ${w.aktiv} aktiven Einschreibungen haben Praxistage.`);
    }
  }
  for (const k of erwarteteKohorten) {
    if (!werte.some((w) => w.kohorte === k)) zeilen.push(`  ${k}: Kohorte nicht gefunden.`);
  }
  return { ohne, zeilen };
}
