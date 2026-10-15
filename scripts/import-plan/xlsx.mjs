// scripts/import-plan/xlsx.mjs
// Minimaler .xlsx-Leser für den Plan-Import (docs/import-plan.md). Liest alle
// Tabs als Zeilen-Objekte (Kopf in Zeile 1, Werte als Text). Kein neues
// Paket: .xlsx ist ein ZIP mit XML, entpackt wird mit fflate (schon
// Abhängigkeit der App). Formeln, Formate und verbundene Zellen werden nicht
// ausgewertet -- die Importvorlage verlangt "alle Werte als Text, Kopf in
// Zeile 1, keine verbundenen Zellen" (Tab Lesehilfe).

import { readFileSync } from "node:fs";
import { strFromU8, unzipSync } from "fflate";

const ENTITAETEN = { lt: "<", gt: ">", quot: '"', apos: "'", amp: "&" };

function entschluesseln(text) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&(lt|gt|quot|apos|amp);/g, (_, n) => ENTITAETEN[n]);
}

function texteIn(xml) {
  return [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => entschluesseln(m[1])).join("");
}

/** "AB" -> 27 */
function spaltenNummer(buchstaben) {
  let n = 0;
  for (const b of buchstaben) n = n * 26 + (b.charCodeAt(0) - 64);
  return n;
}

/** Liest die Datei und gibt { [Tabname]: Array<Record<Kopf, string>> } zurück. */
export function leseXlsx(pfad) {
  const zip = unzipSync(readFileSync(pfad));
  const datei = (name) => (zip[name] ? strFromU8(zip[name]) : "");

  const geteilt = [...datei("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => texteIn(m[1]));

  const beziehungen = new Map(
    [...datei("xl/_rels/workbook.xml.rels").matchAll(/<Relationship\b[^>]*>/g)].map((m) => {
      const id = /\bId="([^"]+)"/.exec(m[0])[1];
      const ziel = /\bTarget="([^"]+)"/.exec(m[0])[1];
      return [id, ziel.startsWith("/") ? ziel.slice(1) : `xl/${ziel}`];
    })
  );

  const ergebnis = {};
  for (const m of datei("xl/workbook.xml").matchAll(/<sheet\b[^>]*>/g)) {
    const name = entschluesseln(/\bname="([^"]+)"/.exec(m[0])[1]);
    const rid = /\br:id="([^"]+)"/.exec(m[0])[1];
    const xml = datei(beziehungen.get(rid));

    const zeilen = [];
    for (const z of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
      const zeile = [];
      for (const c of z[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attr = c[1];
        const inhalt = c[2] ?? "";
        const ref = /\br="([A-Z]+)\d+"/.exec(attr);
        if (!ref) continue;
        const typ = /\bt="(\w+)"/.exec(attr)?.[1];
        const v = /<v>([\s\S]*?)<\/v>/.exec(inhalt)?.[1];
        let wert;
        if (typ === "s") wert = geteilt[Number(v)];
        else if (typ === "inlineStr") wert = texteIn(inhalt);
        else wert = v === undefined ? "" : entschluesseln(v);
        zeile[spaltenNummer(ref[1]) - 1] = (wert ?? "").trim();
      }
      zeilen.push(zeile);
    }

    const kopf = (zeilen[0] ?? []).map((k) => (k ?? "").trim());
    ergebnis[name] = zeilen.slice(1)
      .filter((z) => z.some((w) => w))
      .map((z) => Object.fromEntries(kopf.map((k, i) => [k, z[i] ?? ""]).filter(([k]) => k)));
  }
  return ergebnis;
}
