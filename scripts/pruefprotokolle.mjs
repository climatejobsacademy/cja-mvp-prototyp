#!/usr/bin/env node
// scripts/pruefprotokolle.mjs
//
// Spielt Prüfprotokoll-Varianten und ihre Zuordnung zu Praxisaufgaben ein
// (SR-91, Migration 0067). Anleitung: docs/import-pruefprotokolle.md.
//
//   node scripts/pruefprotokolle.mjs --protokolle <pruefprotokolle.csv> --zuordnung <zuordnung.csv> --ziel staging              (Probelauf)
//   node scripts/pruefprotokolle.mjs ... --ziel staging --ausfuehren [--veroeffentlichen]
//   node scripts/pruefprotokolle.mjs ... --ziel production --production-freigabe [--ausfuehren] [--veroeffentlichen]
//
// Was der Lauf schreibt (eine Transaktion, Probelauf = ROLLBACK):
//   1. pruefprotokoll je Kennung (neu: unpublished; mit --veroeffentlichen
//      published) und ihre Punkte. Eine Variante, die schon ein Praxisauftrag
//      nutzt, ändert nur Texte: Punkte, Nummern und Teile bleiben, sonst
//      Abbruch (Haken und Deutungen laufender Aufträge hängen daran).
//   2. field_job_type.pruefprotokoll_id nach der Zuordnung (Titel der Aufgabe
//      muss genau eine Praxisaufgabe treffen). Nur veröffentlichte Varianten,
//      sonst Abbruch: Lernende lesen keine unveröffentlichten Punkte.
//   3. Nachtragen: Praxisaufträge dieser Aufgaben ohne Variante bekommen sie,
//      solange in ihnen noch nicht gemessen wurde (keine Haken bei den
//      Prüfpunkten, keine Freigabe zum Zuschalten, nicht abgeschlossen).
//      Eine schon gesetzte Variante ändert sich nie (Trigger aus 0067).
// Ein zweiter Durchgang in derselben Transaktion muss leer sein (Idempotenz).
//
// Sicherungen wie scripts/praxis-hilfen.mjs: psql mit Passwort aus PGPASSWORD
// oder dem macOS-Schlüsselbund (nie ausgegeben), echter Lauf nur nach
// Eingabe der Projekt-Ref. Keine Personendaten in der Ausgabe.

import { execFileSync, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";

import { leseProtokolle, leseZuordnung } from "./pruefprotokolle/eingabe.mjs";

const ZIELE = {
  staging: { ref: "keijrwvegmwgpvprpoxa", label: "Staging (Irland)", host: "aws-1-eu-west-1.pooler.supabase.com", schluesselbund: "cja-db-irl" },
  production: { ref: "vqfnmkcfjsudsujiuoqm", label: "Production (Frankfurt)", host: "aws-1-eu-central-1.pooler.supabase.com", schluesselbund: "cja-db-fra" },
};

function abbruch(text) {
  console.error(text);
  process.exit(1);
}

let arg;
try {
  ({ values: arg } = parseArgs({
    options: {
      protokolle: { type: "string" },
      zuordnung: { type: "string" },
      ziel: { type: "string" },
      ausfuehren: { type: "boolean", default: false },
      veroeffentlichen: { type: "boolean", default: false },
      "production-freigabe": { type: "boolean", default: false },
    },
  }));
} catch (e) {
  abbruch(e.message);
}
if (!arg.protokolle || !arg.ziel) abbruch("Nutzung: --protokolle <csv> [--zuordnung <csv>] --ziel staging|production [--production-freigabe] [--ausfuehren] [--veroeffentlichen]");
const ziel = ZIELE[arg.ziel];
if (!ziel) abbruch("--ziel muss staging oder production sein.");
if (arg.ziel === "production" && !arg["production-freigabe"]) abbruch("Production nur mit --production-freigabe.");

// ---------- Dateien prüfen ----------
const p = leseProtokolle(readFileSync(resolve(arg.protokolle), "utf8"));
const kennungen = new Set(p.protokolle.map((x) => x.kennung));
const z = arg.zuordnung ? leseZuordnung(readFileSync(resolve(arg.zuordnung), "utf8"), kennungen) : { zuordnungen: [], fehler: [] };
const fehler = [...p.fehler, ...z.fehler.map((f) => `Zuordnung, ${f}`)];
if (fehler.length) abbruch(`Die Dateien haben Fehler:\n  ${fehler.join("\n  ")}`);
if (!p.protokolle.length) abbruch("Keine Prüfprotokolle in der Datei.");
console.log(`Varianten: ${p.protokolle.length} (Punkte: ${p.protokolle.map((x) => `${x.kennung} ${x.punkte.length}`).join(", ")}), Zuordnungen: ${z.zuordnungen.length}`);

if (arg.ausfuehren) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const antwort = await rl.question(`\nEchter Lauf nach ${ziel.label}. Zur Bestätigung die Projekt-Ref eintippen: `);
  rl.close();
  if (antwort.trim() !== ziel.ref) abbruch("Abbruch: Ref stimmt nicht.");
}

// ---------- Datenbank ----------
function passwort() {
  if (process.env.PGPASSWORD) return process.env.PGPASSWORD;
  try {
    return execFileSync("security", ["find-generic-password", "-s", ziel.schluesselbund, "-w"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    abbruch(`Kein Passwort: PGPASSWORD setzen oder Schlüsselbund-Eintrag ${ziel.schluesselbund} anlegen.`);
  }
}
function psqlPfad() {
  if (process.env.PSQL) return process.env.PSQL;
  for (const x of ["/opt/homebrew/opt/postgresql@17/bin/psql", "/Applications/Postgres.app/Contents/Versions/latest/bin/psql"]) if (existsSync(x)) return x;
  return "psql";
}
function jsonLiteral(wert) {
  const tag = `p_${randomBytes(6).toString("hex")}`;
  const json = JSON.stringify(wert);
  if (json.includes(tag)) abbruch("Abbruch: interner Fehler beim Zusammensetzen.");
  return `$${tag}$${json}$${tag}$::jsonb`;
}

const eingabe = {
  protokolle: p.protokolle.map(({ kennung, titel, punkte }) => ({
    kennung,
    titel,
    punkte: punkte.map(({ nr, kennung: k, teil, titel: t, text, punkte: u, hinweis }) => ({ nr, kennung: k, teil, titel: t, text, punkte: u, hinweis })),
  })),
  zuordnungen: z.zuordnungen.map(({ aufgabe, kennung }) => ({ aufgabe, kennung })),
  veroeffentlichen: arg.veroeffentlichen,
};
const lit = jsonLiteral(eingabe);
const echt = arg.ausfuehren;

const sql = `\\set ON_ERROR_STOP 1
\\set VERBOSITY terse
\\pset footer off
set client_min_messages = warning;
begin;
do $v$ begin
  if to_regclass('public.pruefprotokoll') is null then
    raise exception 'Abbruch: Migration 0067 fehlt in dieser Datenbank.';
  end if;
end $v$;
create temp table pp_bericht (nr serial, lauf int, was text, aktion text, anzahl int) on commit drop;

create function pg_temp.pp(p jsonb, p_lauf int) returns void language plpgsql as $f$
declare
  r jsonb; v_id uuid; v_alt pruefprotokoll; v_in_gebrauch boolean; v_neu jsonb; v_bisher jsonb;
  v_typ uuid[]; v_n int; v_status text;
begin
  -- 1. Varianten und Punkte
  for r in select * from jsonb_array_elements(p -> 'protokolle') loop
    select * into v_alt from pruefprotokoll where kennung = r ->> 'kennung';
    v_status := case when (p ->> 'veroeffentlichen')::boolean then 'published' else coalesce(v_alt.status, 'unpublished') end;
    if v_alt.id is null then
      insert into pruefprotokoll (kennung, titel, status) values (r ->> 'kennung', r ->> 'titel', v_status) returning id into v_id;
      insert into pp_bericht (lauf, was, aktion, anzahl) values (p_lauf, 'Variante', 'neu', 1);
    else
      v_id := v_alt.id;
      update pruefprotokoll set titel = r ->> 'titel', status = v_status
       where id = v_id and (titel is distinct from r ->> 'titel' or status is distinct from v_status);
      get diagnostics v_n = row_count;
      insert into pp_bericht (lauf, was, aktion, anzahl) values (p_lauf, 'Variante', case when v_n > 0 then 'geändert' else 'unverändert' end, 1);
    end if;

    v_neu := coalesce((select jsonb_agg(jsonb_build_object('nr', (x ->> 'nr')::int, 'kennung', x ->> 'kennung', 'teil', x ->> 'teil',
                  'titel', x ->> 'titel', 'text', x ->> 'text', 'hinweis', x ->> 'hinweis', 'punkte', x -> 'punkte') order by (x ->> 'nr')::int)
             from jsonb_array_elements(r -> 'punkte') x), '[]');
    v_bisher := coalesce((select jsonb_agg(jsonb_build_object('nr', nr, 'kennung', kennung, 'teil', teil, 'titel', titel, 'text', text,
                  'hinweis', hinweis, 'punkte', to_jsonb(punkte)) order by nr)
             from pruefprotokoll_punkt where pruefprotokoll_id = v_id), '[]');
    if v_neu = v_bisher then
      insert into pp_bericht (lauf, was, aktion, anzahl) values (p_lauf, 'Prüfpunkte', 'unverändert', jsonb_array_length(v_neu));
      continue;
    end if;

    v_in_gebrauch := exists (select 1 from field_job where pruefprotokoll_id = v_id);
    if not v_in_gebrauch then
      delete from pruefprotokoll_punkt where pruefprotokoll_id = v_id;
      insert into pruefprotokoll_punkt (pruefprotokoll_id, kennung, nr, teil, titel, text, hinweis, punkte)
      select v_id, x ->> 'kennung', (x ->> 'nr')::int, x ->> 'teil', x ->> 'titel', x ->> 'text', x ->> 'hinweis',
             coalesce((select array_agg(u) from jsonb_array_elements_text(x -> 'punkte') u), '{}')
        from jsonb_array_elements(v_neu) x;
      insert into pp_bericht (lauf, was, aktion, anzahl) values (p_lauf, 'Prüfpunkte', 'ersetzt', jsonb_array_length(v_neu));
    else
      -- In Gebrauch: gleiche Punkte (Kennung, Nummer, Teil), nur Texte dürfen sich ändern.
      if (select jsonb_agg(jsonb_build_array(x ->> 'kennung', x ->> 'nr', x ->> 'teil') order by (x ->> 'nr')::int) from jsonb_array_elements(v_neu) x)
         is distinct from
         (select jsonb_agg(jsonb_build_array(x ->> 'kennung', x ->> 'nr', x ->> 'teil') order by (x ->> 'nr')::int) from jsonb_array_elements(v_bisher) x) then
        raise exception 'Abbruch: Variante „%“ wird schon von Praxisaufträgen genutzt; Punkte, Nummern und Teile müssen gleich bleiben (nur Texte änderbar). Für andere Punkte eine neue Kennung anlegen.', r ->> 'kennung';
      end if;
      update pruefprotokoll_punkt pp
         set titel = x ->> 'titel', text = x ->> 'text', hinweis = x ->> 'hinweis',
             punkte = coalesce((select array_agg(u) from jsonb_array_elements_text(x -> 'punkte') u), '{}')
        from jsonb_array_elements(v_neu) x
       where pp.pruefprotokoll_id = v_id and pp.kennung = x ->> 'kennung';
      insert into pp_bericht (lauf, was, aktion, anzahl) values (p_lauf, 'Prüfpunkte', 'Texte geändert', jsonb_array_length(v_neu));
    end if;
  end loop;

  -- 2. Zuordnung zu Praxisaufgaben
  v_typ := '{}';
  for r in select * from jsonb_array_elements(p -> 'zuordnungen') loop
    select count(*) into v_n from field_job_type where titel = r ->> 'aufgabe';
    if v_n <> 1 then
      raise exception 'Abbruch: „%“ trifft % Praxisaufgaben (genau eine erwartet).', r ->> 'aufgabe', v_n;
    end if;
    select id into v_id from field_job_type where titel = r ->> 'aufgabe';
    -- Lernende lesen nur veröffentlichte Varianten (RLS 0067): eine
    -- unveröffentlichte zuzuordnen gäbe ihnen eine leere Prüfliste.
    if (select status from pruefprotokoll where kennung = r ->> 'kennung') <> 'published' then
      raise exception 'Abbruch: Variante „%“ ist nicht veröffentlicht. Erst durchsehen, dann mit --veroeffentlichen zuordnen (oder ohne --zuordnung einspielen).', r ->> 'kennung';
    end if;
    v_typ := v_typ || v_id;
    update field_job_type set pruefprotokoll_id = (select id from pruefprotokoll where kennung = r ->> 'kennung')
     where id = v_id and pruefprotokoll_id is distinct from (select id from pruefprotokoll where kennung = r ->> 'kennung');
    get diagnostics v_n = row_count;
    insert into pp_bericht (lauf, was, aktion, anzahl) values (p_lauf, 'Zuordnung Praxisaufgabe', case when v_n > 0 then 'geändert' else 'unverändert' end, 1);
  end loop;

  -- 3. Nachtragen: Aufträge ohne Variante, in denen noch nicht gemessen wurde
  update field_job fj set pruefprotokoll_id = t.pruefprotokoll_id
    from field_job_type t
   where t.id = fj.field_job_type_id and t.id = any (v_typ)
     and t.pruefprotokoll_id is not null and fj.pruefprotokoll_id is null
     and fj.phase in ('informieren', 'planen', 'entscheiden', 'ausfuehren')
     and coalesce(jsonb_array_length(fj.praxisflow -> 'kontrolle'), 0) = 0
     and not (fj.praxisflow ? 'zuschalten_freigegeben_am');
  get diagnostics v_n = row_count;
  insert into pp_bericht (lauf, was, aktion, anzahl) values (p_lauf, 'Praxisaufträge nachgetragen', 'geändert', v_n);
  select count(*) into v_n
    from field_job fj join field_job_type t on t.id = fj.field_job_type_id
   where t.id = any (v_typ) and fj.pruefprotokoll_id is null;
  insert into pp_bericht (lauf, was, aktion, anzahl) values (p_lauf, 'Praxisaufträge bleiben bei der Standard-Prüfliste (schon gemessen)', 'Hinweis', v_n);
end $f$;

select pg_temp.pp(${lit}, 1) \\g /dev/null
select pg_temp.pp(${lit}, 2) \\g /dev/null

\\echo '== Ergebnis (erster Durchgang) =='
select was as "Was", aktion as "Aktion", sum(anzahl) as "Anzahl" from pp_bericht where lauf = 1 group by was, aktion order by min(nr);
\\echo '== Varianten nach dem Lauf =='
select pr.kennung as "Variante", pr.status as "Status", count(pp.id) as "Punkte",
       (select count(*) from field_job_type t where t.pruefprotokoll_id = pr.id) as "Aufgaben",
       (select count(*) from field_job j where j.pruefprotokoll_id = pr.id) as "Aufträge"
  from pruefprotokoll pr left join pruefprotokoll_punkt pp on pp.pruefprotokoll_id = pr.id
 group by pr.id order by pr.kennung;
do $d$ begin
  if exists (select 1 from pp_bericht where lauf = 2 and aktion not in ('unverändert', 'Hinweis') and anzahl > 0) then
    raise exception 'Abbruch: Der zweite Durchgang hätte etwas geändert -- nicht idempotent.';
  end if;
end $d$;
${echt ? "commit;\n\\echo '== GESPEICHERT (COMMIT) =='" : "rollback;\n\\echo '== PROBELAUF: nichts gespeichert (ROLLBACK) =='"}
`;

console.log(`\n== ${ziel.label}, ${echt ? "ECHTER LAUF" : "Probelauf"} ==`);
const dbPasswort = passwort();
const r = spawnSync(
  psqlPfad(),
  [`host=${ziel.host} port=5432 dbname=postgres user=postgres.${ziel.ref} sslmode=require`, "-X", "-q", "-P", "pager=off"],
  { input: sql, encoding: "utf8", stdio: ["pipe", "inherit", "inherit"], env: { ...process.env, PGPASSWORD: dbPasswort } }
);
process.exit(r.status ?? 1);
