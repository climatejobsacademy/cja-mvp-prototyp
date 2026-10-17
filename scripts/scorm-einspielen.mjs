#!/usr/bin/env node
// scripts/scorm-einspielen.mjs
//
// Spielt SCORM-Pakete (Zip) für Selbstlern-Lektionen ein (SR-50, SR-85):
// lädt die Zip in den Bucket scorm-packages, packt bei Elephant-Paketen die
// vom Kurs genutzten Medien aus (WAV & Co. vorher in M4A umgewandelt), legt
// file_asset und scorm_package an und veröffentlicht die Lektion.
// Anleitung: docs/scorm-einspielen.md.
//
//   node scripts/scorm-einspielen.mjs --datei <liste.csv> --pakete-ordner <ordner> [--plan-datei <plan.xlsx>] --nur-analyse
//   node scripts/scorm-einspielen.mjs --datei <scorm-staging.csv> --pakete-ordner <ordner> --ziel staging              (Probelauf)
//   node scripts/scorm-einspielen.mjs --datei <scorm-staging.csv> --pakete-ordner <ordner> --ziel staging --ausfuehren
//   node scripts/scorm-einspielen.mjs --datei <scorm-production.csv> ... --ziel production --production-freigabe [--ausfuehren]
//
// Standard ist der Probelauf: Er liest die Datenbank, zeigt, welche Dateien
// hochgeladen würden, und führt das Registrieren in einer Transaktion aus,
// die am Ende zurückgerollt wird (ROLLBACK). Er lädt nichts hoch. Im selben
// Lauf wird das Registrieren ein zweites Mal ausgeführt; ändert der zweite
// Durchgang etwas, bricht das Skript ab (Idempotenz).
//
// Erst mit --ausfuehren: (1) hochladen, nur fehlende Objekte, nie
// überschreiben (vorher in storage.objects geprüft; einzelne Dateien ohne
// -r, dabei lehnt Storage ein vorhandenes Objekt ab); (2) in storage.objects
// prüfen, dass alles da ist; (3) registrieren und veröffentlichen (COMMIT).
// Bricht das Hochladen ab, wird nichts registriert und nichts veröffentlicht.
//
// Sicherungen: Hochladen nur mit der Supabase CLI (holt sich den Schlüssel
// selbst, er steht nie im Code oder in der Ausgabe), immer mit
// --project-ref des Ziels, nie --linked, nur "storage cp" (kein rm/mv).
// Datenbank über psql (Session-Pooler, Passwort aus PGPASSWORD oder dem
// macOS-Schlüsselbund, nie ausgegeben). Die Ausgabe enthält keine
// Personendaten und keine signierten URLs.

import { execFileSync, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

// Node meldet beim Laden der App-Dateien (.ts) jedes Mal, dass package.json
// keinen "type" hat. Nur diese eine Warnung ausblenden, alle anderen zeigen.
process.removeAllListeners("warning");
process.on("warning", (w) => {
  if (w.code !== "MODULE_TYPELESS_PACKAGE_JSON") console.error(`${w.name}: ${w.message}`);
});

const { leseListe, loeseKennungenAuf, pruefeDateiZiel } = await import("./scorm-einspielen/eingabe.mjs");
const { BUCKET, entpacktPfad, groesseText, objektNameGueltig, planeUploads, zipPfad } = await import("./scorm-einspielen/paket.mjs");
const { afconvertVorhanden, analysierePaket, packeMedienAus } = await import("./scorm-einspielen/zip.mjs");

const HIER = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HIER, "..");
const SUPABASE_CLI = ["--yes", "supabase@2.117.0"];

// Wie in scripts/import-plan.mjs
const ZIELE = {
  staging: {
    ref: "keijrwvegmwgpvprpoxa",
    label: "Staging (Irland)",
    host: "aws-1-eu-west-1.pooler.supabase.com",
    schluesselbund: "cja-db-irl",
  },
  production: {
    ref: "vqfnmkcfjsudsujiuoqm",
    label: "Production (Frankfurt)",
    host: "aws-1-eu-central-1.pooler.supabase.com",
    schluesselbund: "cja-db-fra",
  },
};

const NUTZUNG = `Nutzung:
  node scripts/scorm-einspielen.mjs --datei <liste.csv> --pakete-ordner <ordner> --nur-analyse
  node scripts/scorm-einspielen.mjs --datei <liste.csv> --pakete-ordner <ordner> --ziel staging|production
       [--plan-datei <plan.xlsx>] [--module I,II] [--production-freigabe] [--ausfuehren]
       [--arbeitsordner <ordner>]
  Liste (CSV): Kennung,Datei  (Termin-Kennung, braucht --plan-datei)  oder  lesson_id,Datei`;

function abbruch(text) {
  console.error(text);
  process.exit(1);
}

let arg;
try {
  ({ values: arg } = parseArgs({
    options: {
      datei: { type: "string" },
      "pakete-ordner": { type: "string" },
      "plan-datei": { type: "string" },
      module: { type: "string", default: "I,II" },
      ziel: { type: "string" },
      "arbeitsordner": { type: "string" },
      "nur-analyse": { type: "boolean", default: false },
      ausfuehren: { type: "boolean", default: false },
      "production-freigabe": { type: "boolean", default: false },
      hilfe: { type: "boolean", default: false },
    },
  }));
} catch (fehler) {
  abbruch(`${fehler.message}\n${NUTZUNG}`);
}

if (arg.hilfe) {
  console.log(NUTZUNG);
  process.exit(0);
}
if (!arg.datei) abbruch(`--datei fehlt.\n${NUTZUNG}`);
if (!arg["pakete-ordner"]) abbruch(`--pakete-ordner fehlt.\n${NUTZUNG}`);
if (arg.ziel !== undefined && !ZIELE[arg.ziel]) abbruch(`--ziel staging oder --ziel production angeben.\n${NUTZUNG}`);
if (arg["nur-analyse"] && arg.ausfuehren) abbruch("Abbruch: --nur-analyse und --ausfuehren schließen sich aus.");
const arbeitsBasis = arg.arbeitsordner ?? tmpdir();
if (!existsSync(arbeitsBasis)) abbruch(`Arbeitsordner nicht gefunden: ${arbeitsBasis}`);

// ---------- Liste prüfen und lesen ----------
try {
  pruefeDateiZiel(arg.datei, arg.ziel);
} catch (fehler) {
  abbruch(`Abbruch: ${fehler.message}`);
}
if (!existsSync(arg.datei)) abbruch(`Liste nicht gefunden: ${arg.datei}`);
if (!existsSync(arg["pakete-ordner"])) abbruch(`Paket-Ordner nicht gefunden: ${arg["pakete-ordner"]}`);

let liste;
try {
  liste = leseListe(readFileSync(arg.datei, "utf8"));
} catch (fehler) {
  abbruch(`Abbruch beim Lesen der Liste:\n${fehler.message}`);
}

let eintraege = liste.eintraege;
if (liste.variante === "kennung") {
  if (!arg["plan-datei"]) abbruch("Abbruch: Die Liste nennt Termin-Kennungen; --plan-datei <plan.xlsx> angeben (Tab Stundenplan), oder lesson_id statt Kennung verwenden.");
  if (!existsSync(arg["plan-datei"])) abbruch(`Plan-Datei nicht gefunden: ${arg["plan-datei"]}`);
  try {
    const { leseXlsx } = await import("./import-plan/xlsx.mjs");
    const { erstellePlan } = await import("./import-plan/plan.mjs");
    const moduleListe = arg.module.split(",").map((m) => m.trim()).filter(Boolean);
    const plan = erstellePlan(leseXlsx(arg["plan-datei"]), { module: moduleListe, ohnePraxis: [] });
    const aufgeloest = loeseKennungenAuf(eintraege, plan);
    eintraege = aufgeloest.eintraege;
    for (const m of aufgeloest.meldungen) console.log(`Hinweis: ${m}`);
  } catch (fehler) {
    abbruch(`Abbruch beim Auflösen der Kennungen:\n${fehler.message}`);
  }
}

const wer = (e) => (e.kennungen ? e.kennungen.join("+") : e.kennung ?? e.lessonId);
console.log(`\n== Liste: ${eintraege.length} Lektion(en), ${liste.variante === "kennung" ? "über Termin-Kennung" : "über lesson_id"} ==`);
for (const e of eintraege) {
  console.log(`  Zeile ${e.zeile}: ${wer(e)}${e.kursName ? ` -> Kurs „${e.kursName}“ (Modul ${e.modul}, Woche ${e.woche})` : ""} <- ${e.datei}`);
}

// ---------- Pakete lokal analysieren (ohne Datenbank) ----------
const BEISPIEL_LEKTION = "00000000-0000-4000-8000-000000000000";
const analysen = new Map();
let paketFehler = 0;
for (const datei of [...new Set(eintraege.map((e) => e.datei))]) {
  const pfad = join(arg["pakete-ordner"], datei);
  const speichername = eintraege.find((e) => e.datei === datei).speichername;
  console.log(`\n== Paket ${datei} ==`);
  if (!existsSync(pfad)) {
    console.log(`  FEHLER: Datei nicht im Paket-Ordner.`);
    paketFehler++;
    continue;
  }
  const a = await analysierePaket(pfad);
  // Objektnamen mit einer Beispiel-Lektion prüfen (die echte kommt aus der Datenbank).
  const beispielZip = zipPfad(BEISPIEL_LEKTION, speichername);
  for (const n of [beispielZip, ...a.medien.map((m) => entpacktPfad(beispielZip, m.innen))]) {
    if (!objektNameGueltig(n)) a.fehler.push(`Ungültiger Objektname im Bucket: ${n.replace(BEISPIEL_LEKTION, "<lesson_id>")}`);
  }
  analysen.set(datei, { ...a, pfad, speichername });
  console.log(`  Größe ${groesseText(a.groesse)}, ${a.anzahlDateien} Dateien im Zip; Speichername ${speichername}`);
  if (a.manifest) console.log(`  Manifest: SCORM ${a.manifest.version ?? "?"}, Titel „${a.manifest.titel ?? "–"}“, Einstieg ${a.manifest.entryPoint}`);
  if (!a.elephant) {
    console.log("  Kein Elephant-Paket: nur die Zip wird eingespielt, nichts ausgepackt (die Lektion zeigt den SCORM-Player).");
  } else {
    const e = a.elephant;
    console.log(`  Elephant: ${e.kapitel} Kapitel, ${e.schritte} Schritte; Modularten: ${e.modularten.map(([art, n, bekannt]) => `${art} ${n}${bekannt ? "" : " (UNBEKANNT)"}`).join(", ") || "–"}`);
    if (!e.nativ) {
      const grund = e.uebersprungen.length ? `übersprungen: ${[...new Set(e.uebersprungen)].join(", ")} (${e.uebersprungen.length}×)` : "kein Inhalt";
      console.log(`  Native Ansicht NICHT möglich (${grund}): nur die Zip wird eingespielt, nichts ausgepackt (SCORM-Player).`);
    } else {
      const summe = a.medien.reduce((n, m) => n + m.groesse, 0);
      const umw = a.medien.filter((m) => m.umwandeln);
      console.log(`  Native Ansicht: ${a.medien.length} Medien auszupacken, zusammen ${groesseText(summe)}${umw.length ? `, davon ${umw.length} Audio zur Umwandlung in M4A` : ""}`);
      const groesste = [...a.medien].sort((x, y) => y.groesse - x.groesse).slice(0, 5);
      for (const m of groesste) console.log(`    ${groesseText(m.groesse).padStart(9)}  ${m.innen}${m.umwandeln ? ` -> ${basename(m.ziel)}` : ""}`);
    }
  }
  for (const h of a.hinweise) console.log(`  Hinweis: ${h}`);
  for (const f of a.fehler) console.log(`  FEHLER: ${f}`);
  if (a.fehler.length) paketFehler++;
}
if (paketFehler) abbruch(`\nAbbruch: ${paketFehler} Paket(e) mit Fehlern (siehe oben). Nichts eingespielt.`);

const umzuwandeln = [...analysen.values()].some((a) => a.medien.some((m) => m.umwandeln));
const afconvertHinweis = "Abbruch: Audio muss in M4A umgewandelt werden, aber /usr/bin/afconvert fehlt (gehört zu macOS). Skript auf einem Mac ausführen.";

// ---------- Nur Analyse: Audio-Umwandlung als Probe ----------
if (arg["nur-analyse"]) {
  if (umzuwandeln) {
    if (!afconvertVorhanden()) abbruch(afconvertHinweis);
    const tmp = mkdtempSync(join(arbeitsBasis, "scorm-probe-"));
    let probeFehler = null;
    try {
      console.log("\n== Probe: Audio-Umwandlung in M4A (AAC, 96 kbit/s), nichts wird hochgeladen ==");
      for (const [datei, a] of analysen) {
        const liste = a.medien.filter((m) => m.umwandeln);
        if (!liste.length) continue;
        const fertig = await packeMedienAus(a.pfad, liste, join(tmp, a.speichername));
        for (const m of fertig) console.log(`  ${datei}: ${m.innen}: ${groesseText(m.groesse)} -> ${groesseText(m.groesseZiel)} (${basename(m.ziel)})`);
      }
    } catch (fehler) {
      probeFehler = fehler;
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
    if (probeFehler) abbruch(`Abbruch bei der Probe-Umwandlung: ${probeFehler.message}`);
  }
  console.log("\n== Nur Analyse: keine Datenbank, nichts hochgeladen ==");
  process.exit(0);
}

// ---------- Ziel und Freigaben ----------
const ziel = ZIELE[arg.ziel];
if (!ziel) abbruch(`--ziel staging oder --ziel production angeben.\n${NUTZUNG}`);
if (arg.ziel === "production" && !arg["production-freigabe"]) {
  abbruch("Abbruch: Production nur mit --production-freigabe (auch für den Probelauf).");
}
if (arg.ausfuehren && umzuwandeln && !afconvertVorhanden()) abbruch(afconvertHinweis);
if (arg.ausfuehren && arg.ziel === "production") {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const antwort = await rl.question(`\nEchter Lauf nach ${ziel.label} (hochladen und veröffentlichen). Zur Bestätigung die Projekt-Ref eintippen: `);
  rl.close();
  if (antwort.trim() !== ziel.ref) abbruch("Abbruch: Ref stimmt nicht.");
}

function passwort() {
  if (process.env.PGPASSWORD) return process.env.PGPASSWORD;
  try {
    return execFileSync("security", ["find-generic-password", "-s", ziel.schluesselbund, "-w"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    abbruch(`Kein Passwort: PGPASSWORD setzen oder Schlüsselbund-Eintrag ${ziel.schluesselbund} anlegen.`);
  }
}

function psqlPfad() {
  if (process.env.PSQL) return process.env.PSQL;
  const brew = "/opt/homebrew/opt/postgresql@17/bin/psql";
  return existsSync(brew) ? brew : "psql";
}

const dbPasswort = passwort();
function psql(sql, { ausgabeFangen = false } = {}) {
  return spawnSync(
    psqlPfad(),
    [`host=${ziel.host} port=5432 dbname=postgres user=postgres.${ziel.ref} sslmode=require`, "-X", "-q", "-P", "pager=off", ...(ausgabeFangen ? ["-A", "-t"] : [])],
    {
      input: sql,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["pipe", ausgabeFangen ? "pipe" : "inherit", "inherit"],
      env: { ...process.env, PGPASSWORD: dbPasswort },
    }
  );
}

function jsonLiteral(wert, praefix) {
  const tag = `${praefix}_${randomBytes(6).toString("hex")}`;
  const json = JSON.stringify(wert);
  if (json.includes(tag)) abbruch("Abbruch: interner Fehler beim Zusammensetzen (Trennzeichen kommt im Inhalt vor).");
  return `$${tag}$${json}$${tag}$::jsonb`;
}

// ---------- Datenbank lesen (nur lesen) ----------
console.log(`\n== Datenbank: ${ziel.label}, ${arg.ausfuehren ? "ECHTER LAUF" : "Probelauf"} ==`);
const leseEingabe = {
  eintraege: eintraege.map((e) => ({
    zeile: e.zeile,
    lessonId: e.lessonId ?? null,
    kennung: e.kennung ?? null,
    modulReihenfolge: e.modulReihenfolge ?? null,
    woche: e.woche ?? null,
    kursName: e.kursName ?? null,
    speichername: e.speichername,
  })),
};
const leseSql = `
\\set ON_ERROR_STOP 1
\\set VERBOSITY terse
set client_min_messages = warning;
begin read only;
${readFileSync(join(HIER, "scorm-einspielen", "lesen.sql"), "utf8").replace("__EINGABE__", () => jsonLiteral(leseEingabe, "lesen"))}
rollback;
`;
const gelesen = psql(leseSql, { ausgabeFangen: true });
if (gelesen.status !== 0) abbruch("Abbruch: Datenbank nicht lesbar (Meldung von psql oben).");
let db;
try {
  db = JSON.parse(gelesen.stdout.trim().split("\n").filter(Boolean).at(-1));
} catch {
  abbruch("Abbruch: Antwort der Datenbank nicht lesbar.");
}
if (!db.bucket) abbruch("Abbruch: Bucket scorm-packages fehlt in diesem Projekt (Migration 0016). Das Skript legt keine Buckets an.");
if (liste.variante === "kennung" && !db.programm) abbruch("Abbruch: Programm EFK-EE fehlt in der Datenbank.");

const dbNachZeile = new Map(db.eintraege.map((x) => [x.zeile, x]));
const fehlerDb = [];
const lektionGesehen = new Map();
for (const e of eintraege) {
  const x = dbNachZeile.get(e.zeile);
  const wo = `Zeile ${e.zeile} (${wer(e)})`;
  if (!x?.lessonId) {
    if (e.lessonId) fehlerDb.push(`${wo}: Lektion nicht gefunden.`);
    else if (!x?.wocheGefunden) fehlerDb.push(`${wo}: Woche ${e.woche} von Modul ${e.modul} fehlt in der Datenbank (erst den Plan importieren).`);
    else if (!x.kursGefunden) fehlerDb.push(`${wo}: Kurs „${e.kursName}“ fehlt in der Datenbank (erst den Plan importieren).`);
    else fehlerDb.push(`${wo}: Kurs „${e.kursName}“ hat keine Selbstlern-Lektion (content_type scorm).`);
    continue;
  }
  if (x.kursAnzahl > 1) fehlerDb.push(`${wo}: Kurs „${e.kursName}“ gibt es in dieser Woche ${x.kursAnzahl}-mal; lesson_id verwenden.`);
  if (x.contentType !== "scorm") fehlerDb.push(`${wo}: Lektion ist keine Selbstlern-Lektion (content_type ${x.contentType}).`);
  if (lektionGesehen.has(x.lessonId)) fehlerDb.push(`${wo}: dieselbe Lektion wie Zeile ${lektionGesehen.get(x.lessonId)}.`);
  lektionGesehen.set(x.lessonId, e.zeile);
  if (x.zipPfad !== zipPfad(x.lessonId, e.speichername)) fehlerDb.push(`${wo}: Speicherpfad aus der Datenbank passt nicht.`);
  e.db = x;
}
if (fehlerDb.length) abbruch(`Abbruch: ${fehlerDb.length} Fehler:\n  - ${fehlerDb.join("\n  - ")}`);

// ---------- Plan je Lektion: was hochgeladen würde ----------
const grenze = db.bucket.groesseGrenze;
const auftraege = [];
let konflikte = 0;
console.log("\n== Lektionen und Dateien ==");
for (const e of eintraege) {
  const a = analysen.get(e.datei);
  const x = e.db;
  const erwartet = [
    { name: x.zipPfad, groesse: a.groesse, art: "zip", lokal: a.pfad, typ: "application/zip", lokaleGroesse: a.groesse },
    ...a.medien.map((m) => ({ name: entpacktPfad(x.zipPfad, m.innen), groesse: m.umwandeln ? null : m.groesse, art: "medium", medium: m, typ: m.typ, lokaleGroesse: m.groesse })),
  ];
  const plan = planeUploads(erwartet, x.objekte);
  const alt = x.paket;
  const paketText = !alt ? "noch kein Paket" : alt.storagePfad === x.zipPfad ? "Paket schon dieses" : `bisher anderes Paket${alt.andereLektionen ? ` (geteilt mit ${alt.andereLektionen} weiteren Lektionen, bleibt dort)` : ""}`;
  console.log(`  Zeile ${e.zeile} (${wer(e)}): Lektion „${x.lessonName}“, Kurs „${x.kursName}“, Status ${x.status}, ${paketText}`);
  console.log(`    Zip ${x.zipPfad}`);
  const summe = plan.hochladen.reduce((n, o) => n + o.lokaleGroesse, 0);
  console.log(`    hochladen ${plan.hochladen.length} (${groesseText(summe)}${plan.hochladen.some((o) => o.groesse == null) ? ", vor Umwandlung" : ""}), schon vorhanden ${plan.vorhanden.length}`);
  for (const k of plan.konflikte) {
    console.log(`    KONFLIKT: ${k.name} liegt schon im Bucket mit ${groesseText(k.gefunden)} statt ${groesseText(k.erwartet)}.`);
  }
  if (plan.fremd.length) console.log(`    Hinweis: ${plan.fremd.length} weitere Objekte unter diesem Pfad, die das Skript nicht erwartet (bleiben unberührt).`);
  if (grenze) {
    for (const o of plan.hochladen) if (o.lokaleGroesse > grenze) {
      console.log(`    KONFLIKT: ${o.name} (${groesseText(o.lokaleGroesse)}) ist größer als die Grenze des Buckets (${groesseText(grenze)}).`);
      konflikte++;
    }
  }
  konflikte += plan.konflikte.length;
  auftraege.push({ e, a, erwartet, plan });
}
if (konflikte) {
  abbruch(
    `\nAbbruch: ${konflikte} Konflikt(e). Das Skript überschreibt nie: Eine neue Version des Pakets bekommt einen neuen Dateinamen ` +
      "(z. B. neuer Elephant-Export mit neuem Zeitstempel), dann neue Zeile in der Liste."
  );
}
const mitMedien = auftraege.some((t) => t.a.medien.length);
if (mitMedien && !db.policyEntpackt) {
  const text = "Policy scorm_packages_entpackt_read_published fehlt (Migration 0055): Ausgepackte Medien wären für Lernende nicht lesbar.";
  if (arg.ausfuehren) abbruch(`Abbruch: ${text} Erst die Migration anwenden.`);
  console.log(`\nHinweis: ${text} Der echte Lauf bricht so ab.`);
}

// ---------- Hochladen (nur mit --ausfuehren) ----------
function ohneGeheimnisse(text) {
  return (text ?? "")
    .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "<entfernt>")
    .replace(/sb[a-z]*_[A-Za-z0-9_-]{16,}/g, "<entfernt>")
    .replace(/[?&]token=[^\s&"]+/g, "?token=<entfernt>");
}

function hochladen(lokal, name, typ) {
  if (!objektNameGueltig(name)) throw new Error(`Ungültiger Objektname ${name}.`);
  // Einzelne Datei ohne -r: Storage lehnt ein schon vorhandenes Objekt ab
  // (die CLI lädt nur rekursiv mit Überschreiben hoch). --experimental ist
  // für "storage" in CLI 2.117.0 Pflicht.
  const args = [...SUPABASE_CLI, "storage", "cp", lokal, `ss:///${BUCKET}/${name}`, "--experimental", "--project-ref", ziel.ref, "--content-type", typ];
  if (args.includes("--linked") || args.some((x) => x === "rm" || x === "mv")) throw new Error("interner Fehler: unerlaubter CLI-Aufruf.");
  const env = { ...process.env };
  delete env.PGPASSWORD;
  const r = spawnSync("npx", args, { cwd: REPO, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env, maxBuffer: 16 * 1024 * 1024 });
  if (r.status !== 0) {
    const meldung = ohneGeheimnisse(`${r.stderr ?? ""}\n${r.stdout ?? ""}`).trim().split("\n").filter(Boolean).slice(-6).join("\n      ");
    throw new Error(`Hochladen von ${name} fehlgeschlagen:\n      ${meldung || `Status ${r.status}`}`);
  }
}

if (arg.ausfuehren) {
  const tmp = mkdtempSync(join(arbeitsBasis, "scorm-einspielen-"));
  let uploadFehler = null;
  try {
    // Je Paket einmal auspacken (nur Medien, die irgendwo fehlen), dann je Lektion hochladen.
    const ausgepackt = new Map();
    for (const t of auftraege) {
      const fehlend = t.plan.hochladen.filter((o) => o.art === "medium").map((o) => o.medium);
      if (!fehlend.length) continue;
      const bisher = ausgepackt.get(t.e.datei) ?? new Map();
      const neu = fehlend.filter((m) => !bisher.has(m.innen));
      if (neu.length) {
        console.log(`\nPacke ${neu.length} Medien aus ${t.e.datei} aus${neu.some((m) => m.umwandeln) ? " (mit Audio-Umwandlung)" : ""} …`);
        for (const m of await packeMedienAus(t.a.pfad, neu, join(tmp, t.a.speichername))) bisher.set(m.innen, m);
      }
      ausgepackt.set(t.e.datei, bisher);
    }

    for (const t of auftraege) {
      console.log(`\n== Hochladen Zeile ${t.e.zeile} (${wer(t.e)}): ${t.plan.hochladen.length} Datei(en) ==`);
      // Erst die Zip, dann die Medien.
      const reihenfolge = [...t.plan.hochladen].sort((x, y) => (x.art === "zip" ? -1 : 0) - (y.art === "zip" ? -1 : 0));
      let n = 0;
      for (const o of reihenfolge) {
        let lokal = o.lokal;
        if (o.art === "medium") {
          const m = ausgepackt.get(t.e.datei).get(o.medium.innen);
          lokal = m.datei;
          o.groesse = m.groesseZiel;
        }
        hochladen(lokal, o.name, o.typ);
        n++;
        console.log(`  [${n}/${reihenfolge.length}] ${o.name} (${groesseText(o.groesse)})`);
      }
    }
  } catch (fehler) {
    uploadFehler = fehler;
  } finally {
    // Nur die lokalen Kopien im eigenen Arbeitsordner, nie etwas im Bucket.
    rmSync(tmp, { recursive: true, force: true });
  }
  if (uploadFehler) {
    abbruch(`\nAbbruch beim Hochladen: ${uploadFehler.message}\nNichts registriert, nichts veröffentlicht. Bereits hochgeladene Dateien bleiben im Bucket; ein neuer Lauf erkennt sie als vorhanden.`);
  }
}

// ---------- Registrieren und veröffentlichen (eine Transaktion) ----------
const schreibEingabe = {
  eintraege: auftraege.map(({ e, a, erwartet }) => ({
    zeile: e.zeile,
    lessonId: e.db.lessonId,
    speichername: e.speichername,
    zipPfad: e.db.zipPfad,
    dateiname: e.datei,
    entryPoint: a.manifest.entryPoint,
    manifestTitel: a.manifest.titel,
    objekte: erwartet.map((o) => ({ name: o.name, groesse: o.groesse })),
  })),
};
const lit = jsonLiteral(schreibEingabe, "scorm");
const echt = arg.ausfuehren;
const schreibSql = `
\\set ON_ERROR_STOP 1
\\set VERBOSITY terse
\\pset footer off
set client_min_messages = warning;
begin;
${readFileSync(join(HIER, "scorm-einspielen", "einspielen.sql"), "utf8")}

select pg_temp.scorm_einspielen(${lit}, 1, ${echt}) \\g /dev/null
select pg_temp.scorm_einspielen(${lit}, 2, ${echt}) \\g /dev/null

\\echo
\\echo '== Ergebnis je Tabelle (erster Durchgang) =='
select tabelle as "Tabelle",
       coalesce(sum(anzahl) filter (where aktion = 'neu'), 0) as "neu",
       coalesce(sum(anzahl) filter (where aktion = 'geändert'), 0) as "geändert",
       coalesce(sum(anzahl) filter (where aktion = 'unverändert'), 0) as "unverändert"
  from scorm_bericht where lauf = 1
 group by tabelle order by min(nr);

\\echo '== Meldungen =='
select art as "Art", text as "Meldung" from scorm_meldung where lauf = 1 order by nr;

\\echo '== Zweiter Durchgang (muss leer sein) =='
select tabelle, aktion, count(*) from scorm_bericht
 where lauf = 2 and aktion <> 'unverändert' group by tabelle, aktion;
do $$ begin
  if exists (select 1 from scorm_bericht where lauf = 2 and aktion <> 'unverändert') then
    raise exception 'Abbruch: Der zweite Durchgang hätte etwas geändert -- nicht idempotent.';
  end if;
end $$;

${echt ? "commit;\n\\echo '== GESPEICHERT (COMMIT): registriert und veröffentlicht =='" : "rollback;\n\\echo '== PROBELAUF: nichts hochgeladen, Datenbank zurückgerollt (ROLLBACK) =='"}
`;

console.log(`\n== Registrieren: ${ziel.label}, ${echt ? "ECHTER LAUF" : "Probelauf"} ==`);
const ergebnis = psql(schreibSql);
if (ergebnis.status !== 0 && echt) {
  console.error("\nRegistrieren fehlgeschlagen: nichts registriert, nichts veröffentlicht. Hochgeladene Dateien bleiben im Bucket; ein neuer Lauf erkennt sie als vorhanden.");
}
if (ergebnis.status === 0 && !echt) {
  console.log("Der Probelauf zeigt: welche Lektionen gefunden wurden, welche Dateien der echte Lauf hochladen würde und was in file_asset, scorm_package und lesson neu oder geändert würde. Speichern mit --ausfuehren.");
}
process.exit(ergebnis.status ?? 1);
