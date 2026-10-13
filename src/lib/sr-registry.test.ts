// Registertest: Jede SR-Nummer in docs/, src/ und supabase/tests/ muss in
// docs/sr-registry.json stehen (Quelle: Notion, siehe CLAUDE.md). Ausgenommen
// sind die Legacy-Dateien aus dem Register (Migrationen) und die
// Legacy-Tabelle in docs/traceability.md. Keine Netzwerk- oder Notion-Zugriffe.
// Ausführen mit `npm test`.

import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const WURZEL = join(fileURLToPath(new URL(".", import.meta.url)), "..", "..");
const VERZEICHNISSE = ["docs", "src", "supabase/tests"];
const ENDUNGEN = [".md", ".ts", ".tsx", ".sql", ".json", ".mjs", ".js"];

type Register = { ids: number[]; legacyFiles: string[] };
const register: Register = JSON.parse(readFileSync(join(WURZEL, "docs", "sr-registry.json"), "utf8"));
const gueltig = new Set(register.ids);
const hoechste = Math.max(...register.ids);

function istLegacy(pfad: string): boolean {
  return register.legacyFiles.some((muster) =>
    muster.endsWith("/**") ? pfad.startsWith(muster.slice(0, -2)) : pfad === muster
  );
}

function dateien(verzeichnis: string): string[] {
  const ergebnis: string[] = [];
  for (const name of readdirSync(join(WURZEL, verzeichnis))) {
    const pfad = `${verzeichnis}/${name}`;
    if (statSync(join(WURZEL, pfad)).isDirectory()) ergebnis.push(...dateien(pfad));
    else if (ENDUNGEN.some((e) => name.endsWith(e))) ergebnis.push(pfad);
  }
  return ergebnis;
}

function ohneAliasTabelle(pfad: string, text: string): string {
  if (pfad !== "docs/traceability.md") return text;
  return text.replace(/<!-- sr-alias:start -->[\s\S]*?<!-- sr-alias:end -->/, "");
}

test("Register: IDs eindeutig, aufsteigend, positiv", () => {
  assert.ok(register.ids.length > 0);
  assert.deepEqual([...register.ids].sort((a, b) => a - b), register.ids);
  assert.equal(new Set(register.ids).size, register.ids.length);
  assert.ok(register.ids.every((id) => Number.isInteger(id) && id > 0));
});

test("Alle SR-Nummern in docs/, src/ und supabase/tests/ stehen im Register", () => {
  const fehler: string[] = [];
  for (const verzeichnis of VERZEICHNISSE) {
    for (const pfad of dateien(verzeichnis)) {
      const relativ = relative(WURZEL, join(WURZEL, pfad)).split(sep).join("/");
      if (istLegacy(relativ)) continue;
      const text = ohneAliasTabelle(relativ, readFileSync(join(WURZEL, pfad), "utf8"));
      text.split("\n").forEach((zeile, i) => {
        for (const treffer of zeile.matchAll(/SR-(\d+)/g)) {
          const nummer = Number(treffer[1]);
          if (!gueltig.has(nummer) || nummer > hoechste) {
            fehler.push(`${relativ}:${i + 1} SR-${treffer[1]}`);
          }
        }
      });
    }
  }
  assert.deepEqual(fehler, [], `SR-Nummern ohne Eintrag in docs/sr-registry.json:\n${fehler.join("\n")}`);
});
