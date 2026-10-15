# Praxisflow-Realbau: Analyse und Migrationsentwurf

Stand 13.10.2026. **Nur Analyse und Entwurf.** Es gibt dazu keine Migration im Repo, kein Branch mit Code und keinen Datenbankzugriff. Grundlage sind der Stand von `origin/demo` (4c6a64d) und `dev` (6264168) sowie die Migrationen bis 0030. Der SQL-Teil unten ist ein Text-Entwurf, nicht ausgeführt und nicht getestet.

Zweck: Grundlage für den Realbau (Zeitfenster 03.–12.11.2026) und für die Übergabe an Anna und Malte.

**Aktualisiert 14.10.2026** (Entscheidungen Vera): Login der Rolle `trainer` seit 0032; Migrationsnummern und Regeln für den Langzeit-Branch (Abschnitt 4.0); Auftragsnummer als neue Spalte `nummer`; Neu-Einreichen über `field_capture_fassung`; Freigaben nach E3 über `fn_trainer_kohorten_ids()`; Foto nur als Vorschau im ersten Schnitt; neue Abschnitte 9 (Aufwand je Phase und Gate) und 10 (Schnitte, Inhalte).

## 1. Ausgangslage

**demo** (`/praxisflow-demo`) ist ein Prototyp ohne Server: der gesamte Stand liegt im Browser (`localStorage`, Schlüssel `cja-praxisflow-demo:zustand-v3`), die Unterlagen sind zwei PDFs im Repo, der Trainer ist fest im Code, das Codewort („werkstatt“) wird im Browser geprüft.

**dev** (`/praxistag/[fieldJobId]`) ist der echte, aber einfache Ablauf in drei Schritten: Vorbereitung lesen → Durchführung bestätigen (erledigt oder Problem) → Reflexion (Single-Choice-Fragen) und absenden. Gespeichert wird in `field_job` (drei Spalten), `field_capture` (phase `abschluss`) und `field_capture_antwort`. Es gibt keinen Plan, keine Unterlagen je Auftrag, kein Foto, keine Einschätzung und keine Freigabe durch eine Trainer:in.

### Sechs Phasen in demo

| Phase | Was die Lernenden tun | In demo gespeichert |
|---|---|---|
| Analyse | Arbeitsauftrag lesen („Gelesen“), Auftragsblatt (AA) und Arbeitsunterlage (AU) öffnen; weiter erst, wenn alle Dateien geöffnet sind | nein (nur React-State) |
| Planen | drei Unterschritte mit je einer Liste: Werkzeuge → Materialien → Arbeitsschritte; tippen oder diktieren; Arbeitsschritte verschiebbar; weiter erst mit mindestens einem Arbeitsschritt | ja, im Browser |
| Entscheiden | Übersicht des Plans, **Freigabe des Plans** | ja, im Browser |
| Durchführen | ein Schritt groß, strikt der Reihe nach abhaken; danach **Freigabe der Durchführung** | ja, im Browser |
| Kontrolle | Dokumentation (ein Foto, nur lokal), optional Hinweis „Prüfprotokoll auf Papier“; **Freigabe der Kontrolle** | Foto nein |
| Bewerten | Selbsteinschätzung je Kriterium → **Freischaltung der Fremdeinschätzung** → Fremdeinschätzung → Vergleich → abschließen | ja, im Browser |

Danach „Aufgabe geschafft“ mit den gestärkten Kompetenzen. Skala der Einschätzung: 10, 9, 7, 5, 3, 0 Punkte, bewusst ohne Summe und ohne Durchschnitt; vier Kriterien (derzeit Platzhalter: Arbeitsplanung, Sorgfalt in der Ausführung, Ergebnis entspricht der Vorlage, Ordnung am Arbeitsplatz).

## 2. Was dev schon hat

| Baustein | Tabelle bzw. Migration | Zugriff heute |
|---|---|---|
| Auftrag | `field_job_type` (0005, 0010, 0014, 0015): Titel, Beschreibung, `vorbereitung_text`, `nachbereitung_text`, Zuordnung zu Modul oder Programm | Learner lesen nur `published`, Schreiben nur AfCJ admin |
| Reflexionsfragen | `field_job_type_frage` (0011): `phase` start/abschluss, Single-Choice mit 3–5 Optionen | wie `field_job_type` |
| Praxistag einer Person | `field_job` (0005, 0011, 0026): Datum, Uhrzeit, `instructor_id` (bisher leer), Status geplant/durchgeführt, `ergebnis`, `problem_beschreibung` | Learner lesen die eigene Zeile und schreiben nur `durchgefuehrt_bestaetigt_am`, `ergebnis`, `problem_beschreibung` (0012) |
| Selbstauskunft | `field_capture` (0006, 0011, 0013) mit `text`, `media` (inaktiv), Status submitted/verified/rejected; `field_capture_antwort` | Learner schreiben die eigenen Zeilen, Status nur per Trigger; AfCJ admin liest |
| Verifizierung | `verification` (0006, 0009, 0032), Trigger setzt den Status der Selbstauskunft | AfCJ admin und seit 0032 Trainer:innen in ihren Kohorten (E2/E3); unveränderlich, Korrektur per Storno (`verification_aktuell`) |
| Kompetenzen | `field_job_type_competency_mapping` (0018, nur praktische Teilschritte, SR-71), `competency_evidence` zählt nur `verified` | lesen wie `competency_*` |
| Dateien | `file_asset`, `lesson_resource`, privater Bucket `lesson-resources` (0023) | an Lektionen gebunden, nicht an Aufträge |
| Trainer:in | Rolle `trainer` seit 0030, **Login seit 0032** (E1), `fn_meine_trainer()`, Fotos in `profilfotos`; Bereich `/trainer` (Anwesenheit, SR-81) | lesen ihre Kohorten (E3, `fn_trainer_kohorten_ids()`), Anwesenheit und Verifizierung anlegen (0032) |

## 3. Lücken: demo → dev

| Element | In dev vorhanden? | Es fehlt |
|---|---|---|
| Phase / Fortschritt je Praxistag | nein | Phasenfeld mit Zeitstempel, Übergänge nur serverseitig |
| Arbeitsauftrag (Text) | teilweise | `field_job_type.beschreibung` reicht; eigener Text je Auftrag |
| Auftragsblatt, Arbeitsunterlage | nein | Zuordnung Datei ↔ Auftrag, Bucket, Zugriff, „angesehen“ |
| Plan (Werkzeuge, Materialien, Schritte, geordnet) | nein | Tabelle für Planeinträge, Schreibrecht der Lernenden nur in der Planen-Phase |
| Häkchen je Arbeitsschritt | nein | `erledigt_am` je Planschritt, Reihenfolge erzwingen |
| Freigaben (Plan, Durchführung, Kontrolle, Fremdeinschätzung) | nein | Freigabe-Tabelle, wer darf freigeben, Prüfung auf dem Server |
| Foto der Kontrolle | teilweise (`media` inaktiv) | Bucket, Policies, Größenlimit, Datenschutz |
| Selbst- und Fremdeinschätzung (Punkteskala) | nein | Kriterien je Auftrag, Stufentexte, Bewertungszeilen je Rolle |
| Reflexion | ja (Single-Choice) | nur einbinden; demo hat stattdessen die Einschätzung |
| Prüfung des Berichts | teilweise | Prüfansicht für die Prüfenden inkl. Plan, Foto, Einschätzung |
| Abschluss mit gestärkten Kompetenzen | teilweise | Zuordnung vorhanden; Anzeige „wird nach Verifizierung gestärkt“ |
| Trainer:in je Praxistag | teilweise | `instructor_id` befüllen, Zugriffsrechte der Rolle `trainer` |

## 4. Entwurf Datenmodell

### 4.0 Ablauf, Nummern, Regeln (Entscheidung 14.10.2026)

- Der Praxisflow wird auf dem **Langzeit-Branch `feat/praxisflow`** (von `dev`) in kleinen PRs gebaut; Teile werden gezielt nach `dev` übernommen.
- **Migrationen gehen als kleine eigene PRs direkt nach `dev`** und werden erst danach auf Staging angewendet (sonst kennt `dev` den Migrationsstand auf Staging nicht, und `supabase db push` aus `dev` bricht ab). Nur der App-Code bleibt auf `feat/praxisflow`.
- **Nummern:** Praxisflow **0035–0049**, Kohortensicht 0034, alles andere ab **0050** (z. B. `field_job.bis_datum` für den Praxisblock).
- **Nur additiv:** neue Tabellen, neue Spalten mit Standardwert (oder nullable), neue Funktionen; keine Änderung bestehender Spalten, Constraints oder Rechte. Neue Buckets gelten als additiv, wenn ein pgTAP-Test belegt, dass kein bestehender Bucket gelockert wird.
- **Release 2:** Cut-off Freitag 9 Uhr; nur additive, getestete Migrationen mit Probelauf gehen mit.

Alles additiv, ein Praxistag-Typ schaltet den neuen Ablauf einzeln ein, bis dahin bleibt der einfache Ablauf (Rückfall ohne Datenverlust).

### 4.1 Erweiterungen bestehender Tabellen

- **`field_job_type.ablauf`** `text not null default 'einfach' check (ablauf in ('einfach','gefuehrt'))`. Nur Typen mit `gefuehrt` zeigen den sechsphasigen Ablauf.
- **`field_job_type.pruefprotokoll_papier`** `boolean not null default false` (demo: `ZEIGE_PRUEFPROTOKOLL_HINWEIS`, für Energiehelden an).
- **`field_job_type.nummer`** `text unique` (nullable; z. B. `M02-A03`, Maltes Spalte „Nummer“) und **`field_job_type.unterlagen_nr`** `text` (z. B. `E-02`, Spalte „Unterlagen-Nr.“). Die Nummer ist der Schlüssel für den Import (wiederholbar ohne Dubletten). Werte werden per Datenskript aus `kategorie` übernommen; `kategorie` bleibt stehen (additiv, siehe 4a).
- **`field_job.phase`** `text not null default 'analyse' check (phase in ('analyse','planen','entscheiden','durchfuehren','kontrolle','bewerten','abgeschlossen'))` und **`field_job.phase_seit`** `timestamptz`. Lernende bekommen **kein** Schreibrecht auf diese Spalten (Spaltenrechte wie 0012). Übergänge laufen nur über RPCs.

### 4.2 Neue Tabellen (alle mit `organisation_id`, `id`, `created_at`, `updated_at`)

| Tabelle | Zweck | Wichtige Spalten |
|---|---|---|
| `field_job_type_unterlage` | Dateien je Auftrag (Maltes Spalte „Unterlagen“, ein Dateiname je Zeile der Zelle) | `field_job_type_id`, `reihenfolge`, `kuerzel` (Präfix des Dateinamens: AA, AU, BB, ML …), `titel`, `file_asset_id`; unique (`field_job_type_id`, `reihenfolge`) |
| `field_job_unterlage_angesehen` | demo: weiter erst, wenn alle Dateien geöffnet sind | `field_job_id`, `unterlage_id`, `angesehen_am`; unique je Paar |
| `field_job_plan_eintrag` | Plan | `field_job_id`, `liste` (werkzeug, material, schritt), `text` (≤ 300 Zeichen), `reihenfolge`, `erledigt_am` (nur `schritt`); unique (`field_job_id`, `liste`, `reihenfolge`) deferrable |
| `field_job_freigabe` | Freigaben durch die Trainer:in | `field_job_id`, `gate` (plan, durchfuehrung, kontrolle, fremdbewertung), `freigegeben_von` → `person`, `freigegeben_am`; unique (`field_job_id`, `gate`) |
| `field_job_type_kriterium` | Bewertungskriterien je Auftrag | `field_job_type_id`, `reihenfolge`, `titel`, `beschreibung` |
| `bewertung_stufe` | Stufentexte der Skala (AfCJ-weit) | `punkte` (10, 9, 7, 5, 3, 0, Primärschlüssel), `beschreibung` |
| `field_job_bewertung` | Selbst- und Fremdeinschätzung | `field_job_id`, `kriterium_id`, `rolle` (selbst, fremd), `punkte` (Check auf die sechs Stufen), `bewertet_von` → `person`, `bewertet_am`; unique (`field_job_id`, `kriterium_id`, `rolle`) |
| `field_job_foto` | Dokumentation in der Kontrolle – **nicht im ersten Schnitt** (14.10.: nur Vorschau im Browser wie in demo, kein Upload) | `field_job_id`, `learner_id`, `storage_pfad`, `erstellt_am`; höchstens 5 je Praxistag |
| `field_capture_fassung` | Neu-Einreichen nach Rückgabe (14.10., additiv statt Änderung des Unique-Schlüssels von `field_capture`): ein `field_capture` je Praxistag bleibt, jede Überarbeitung ist eine neue Fassung; die Trainer:in entscheidet neu per Storno (0032) | `field_capture_id`, `nummer`, `text`, `antworten jsonb`, `eingereicht_am`; unique (`field_capture_id`, `nummer`); unveränderlich |

Storage: zwei **private** Buckets, Zugriff nur über signierte Links (Muster `lesson-resources` und `profilfotos`):
- `auftrags-unterlagen` (PDF, PNG, JPEG, DOCX, XLSX, 50 MB), Pfad `<field_job_type_id>/<uuid>.<ext>`, Upload nur AfCJ admin.
- `praxis-fotos` (JPEG, 2 MB), Pfad `<organisation_id>/<field_job_id>/<uuid>.jpg`; das Foto wird im Browser auf höchstens 1600 px verkleinert. **Nicht im ersten Schnitt** (nur Vorschau).

Je neuem Bucket ein pgTAP-Test, der belegt, dass die neuen Policies auf `storage.objects` keinen bestehenden Bucket lockern (z. B. Lernende lesen danach weiterhin keine fremden Dateien in `lesson-resources` und `profilfotos`).

### 4.3 Übergänge als RPC (security definer, atomar)

Das behebt zugleich die bekannte Lücke aus `actions.ts` („zwei Inserts ohne Transaktion“, SR-08). Jede Funktion prüft Eigentum (`learner_id = auth.uid()`), aktuelle Phase und Voraussetzungen:

| RPC | Voraussetzung | Wirkung |
|---|---|---|
| `fn_praxis_weiter_zu_planen(job)` | alle Unterlagen angesehen | `phase = planen` |
| `fn_praxis_plan_einreichen(job)` | mindestens ein Eintrag in `schritt` | `phase = entscheiden` |
| `fn_praxis_durchfuehren(job)` | Freigabe `plan` | `phase = durchfuehren` |
| `fn_praxis_schritt_abhaken(eintrag)` | alle früheren Schritte erledigt (lückenlos) | `erledigt_am` setzen |
| `fn_praxis_zur_kontrolle(job)` | alle Schritte erledigt, Freigabe `durchfuehrung` | `phase = kontrolle`, `durchgefuehrt_bestaetigt_am` setzen (der bestehende Trigger leitet `status` ab) |
| `fn_praxis_zum_bewerten(job)` | Freigabe `kontrolle` | `phase = bewerten` |
| `fn_praxis_abschliessen(job, antworten)` | alle Kriterien selbst bewertet, Freigabe `fremdbewertung`, alle fremd bewertet | legt `field_capture` (phase `abschluss`, Status `submitted`) samt Reflexionsantworten an, `phase = abgeschlossen`, Zeilen werden unveränderlich |

Die Verifizierung durch AfCJ bleibt wie heute an `field_capture`; erst `verified` erzeugt Nachweis (Regel 6 in `CLAUDE.md`). Selbst- und Fremdeinschätzung sind **keine** Nachweise, sondern Material für die Prüfenden.

### 4.4 Entwurf (SQL, nicht ausgeführt)

```sql
-- 0035 ff. (ENTWURF, nicht im Repo, nicht getestet; in mehrere kleine Migrationen 0035–0049 aufteilen, siehe 4.0)

alter table field_job_type
  add column ablauf text not null default 'einfach' check (ablauf in ('einfach','gefuehrt')),
  add column pruefprotokoll_papier boolean not null default false;

alter table field_job
  add column phase text not null default 'analyse'
    check (phase in ('analyse','planen','entscheiden','durchfuehren','kontrolle','bewerten','abgeschlossen')),
  add column phase_seit timestamptz not null default now();
-- Lernende bekommen KEIN update auf phase/phase_seit (Spaltenrechte wie 0012).

create table field_job_plan_eintrag (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  organisation_id uuid not null references organisation (id),
  field_job_id uuid not null references field_job (id) on delete cascade,
  liste text not null check (liste in ('werkzeug','material','schritt')),
  text text not null check (btrim(text) <> '' and char_length(text) <= 300),
  reihenfolge integer not null check (reihenfolge > 0),
  erledigt_am timestamptz,
  check (erledigt_am is null or liste = 'schritt'),
  constraint plan_reihenfolge_eindeutig unique (field_job_id, liste, reihenfolge) deferrable initially deferred
);

create table field_job_freigabe (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  organisation_id uuid not null references organisation (id),
  field_job_id uuid not null references field_job (id) on delete cascade,
  gate text not null check (gate in ('plan','durchfuehrung','kontrolle','fremdbewertung')),
  freigegeben_von uuid not null references person (id),
  freigegeben_am timestamptz not null default now(),
  unique (field_job_id, gate)
);

create table field_job_bewertung (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  organisation_id uuid not null references organisation (id),
  field_job_id uuid not null references field_job (id) on delete cascade,
  kriterium_id uuid not null references field_job_type_kriterium (id) on delete cascade,
  rolle text not null check (rolle in ('selbst','fremd')),
  punkte integer not null check (punkte in (10,9,7,5,3,0)),
  bewertet_von uuid not null references person (id),
  bewertet_am timestamptz not null default now(),
  unique (field_job_id, kriterium_id, rolle)
);
-- field_job_type_unterlage, field_job_unterlage_angesehen, field_job_type_kriterium,
-- bewertung_stufe, field_job_foto: analog (Spalten siehe 4.2).
-- RLS: siehe 5. Policies und pgTAP-Tests gehören in dieselbe Migration (Regel 2 und 5).
```

## 4a. Import aus Maltes Excel (Tab „Aufträge“)

Spalten laut Malte: **Nummer** (z. B. `M02-A03`), **Titel**, **Modul**, **Teilschritte** (Kennungen, kommagetrennt), **Unterlagen-Nr.** (`E-xx`), **Unterlagen** (Dateinamen, ein Dateiname je Zeile der Zelle, z. B. `AA-E-02_….pdf`, `AU-E-02_….pdf`, `BB-E-02_….pdf`, `ML-E-02_….pdf`), **In Plattform zeigen** (ja/nein), **Ordner Praxisinhalte** (Drive-Ordnername), **Offen**.

| Spalte | Ziel | Bemerkung |
|---|---|---|
| Nummer | `field_job_type.nummer` (neu, eindeutig) | Schlüssel des Imports; Wiederholung aktualisiert statt zu verdoppeln |
| Titel | `field_job_type.titel` | |
| Modul | Zuordnung des Auftrags zum Modul | Heute hängt `field_job_type` über `module_id` an einer **Woche** (`module`), nicht am Modul (`modul`, 0028). Entweder Woche aus dem Stundenplan zuordnen oder neue Spalte `field_job_type.modul_id`. **Zu entscheiden**, siehe Frage 11. |
| Teilschritte | `field_job_type_competency_mapping` | `competency_step` hat nur `name`, keine Kennung. Der Import aus #102 ordnet über Kompetenz und Name zu; eine Kennung (`competency_step.kennung`) ist eine Option für später (siehe unten). Die Zuordnung wird nur für praktische Teilschritte angenommen (SR-71, Trigger prüft das). |
| Unterlagen-Nr. | `field_job_type.unterlagen_nr` | |
| Unterlagen | `field_job_type_unterlage` + `file_asset` | je Dateiname eine Zeile, `reihenfolge` nach Position in der Zelle, `kuerzel` aus dem Präfix, `titel` aus Kürzel und Unterlagen-Nr.; Datei kommt aus dem Drive-Ordner |
| In Plattform zeigen | `field_job_type.status` | ja = `published`, nein = `unpublished` |
| Ordner Praxisinhalte | nur Import-Parameter | Quellordner der Dateien in Drive, wird nicht gespeichert |
| Offen | nicht importiert | interne Notiz |

**Stand des Import-Skripts aus PR #102** (Paket C, offen, Probelauf, nicht gemergt; wird von diesem Dokument nicht verändert):
- Die Auftragsnummer (`M02-A07`) wird heute in **`field_job_type.kategorie`** gespeichert. Eine eigene Spalte `nummer` gibt es dort nicht.
- Teilschritte werden über **Kompetenz und Name** erkannt, nicht über eine Kennung.

Beim Realbau gab es zwei Wege für die Nummer (**entschieden 14.10.: Weg 2 in additiver Form** – neue Spalte `nummer`, Werte aus `kategorie` übernehmen, `kategorie` bleibt stehen; Entfernen von `kategorie` erst nach dem Pilot, nicht additiv):
1. **`kategorie` weiterverwenden.** Keine Migration nötig, der Import aus #102 läuft unverändert weiter. Nachteil: `kategorie` ist ein Freitextfeld ohne Eindeutigkeit und mit anderem Namen als seine Bedeutung; die Wiederholbarkeit des Imports hängt dann an einer Konvention.
2. **In einer Migration nach `nummer` umziehen** (Spalte `nummer` anlegen, `unique`, `kategorie` übernehmen, danach `kategorie` freigeben oder entfernen). Das ist sauberer, ändert aber den Import aus #102 und braucht einen Zwei-Schritt (additiv zuerst, Spalte später löschen).
Die Tabelle oben beschreibt das Ziel mit `nummer`. Der Import aus #102 schreibt dann zusätzlich `nummer`.

**Teilschritt-Kennung:** `competency_step.kennung` bleibt eine **Option für einen späteren Import**. Solange Maltes Excel Teilschritte über Kennungen führt und der Import über Kompetenz und Name zuordnet, ist die Zuordnung eindeutig nur so lange, wie die Namen eindeutig bleiben; eine Kennung würde das absichern. Sie ist keine Voraussetzung für den Realbau.

Ablauf: Skript wie die Skripte in `scripts/sql/`, **zuerst Probelauf** mit Zählung (neue und geänderte Aufträge, fehlende Dateien, unbekannte Teilschritte, unbekannte Kürzel), danach erst Speichern. Dateien lädt AfCJ admin in den Bucket `auftrags-unterlagen`; der Import legt nur die Zeilen an und meldet Dateien, die im Ordner fehlen. Dateinamen mit Leerzeichen oder Umlauten werden beim Upload zu `<uuid>.<ext>` umbenannt, der Originalname bleibt in `file_asset.dateiname`.

## 5. Zugriffsregeln je Rolle

Das ist eine **Erweiterung der Zugriffsmatrix** (Regel 3 in `CLAUDE.md`): `docs/access-matrix.md` wird im selben PR angepasst. Die Rolle `trainer` hat seit 0032 einen Login (E1). **Trainer-Rechte nach E3:** Kohorten mit mindestens einem eigenen Termin über die vorhandene `fn_trainer_kohorten_ids()` – keine eigene Regel über `instructor_id`, keine Änderung der Funktion (additiv).

| Daten | Learner | Trainer:in (Kohorten mit eigenem Termin, E3) | AfCJ admin | Manager (Arbeitgeber) |
|---|---|---|---|---|
| `field_job.phase` | lesen eigene; schreiben nur über RPC | lesen in ihren Kohorten | alle | lesen Org (nur Phase) |
| Unterlagen (`field_job_type_unterlage`, Bucket) | lesen, wenn ein Praxistag dieses Typs existiert | lesen | alles | — |
| Plan (`field_job_plan_eintrag`) | eigene lesen; schreiben nur in der Phase `planen`; `erledigt_am` nur über RPC | lesen in ihren Kohorten | lesen | — |
| Freigabe (`field_job_freigabe`) | lesen eigene; **nicht** schreiben | schreiben in ihren Kohorten, nur in der passenden Phase | alle | — |
| Selbsteinschätzung | schreiben eigene bis zum Abschluss | lesen | lesen | — |
| Fremdeinschätzung | lesen **erst nach Abschluss** | schreiben in ihren Kohorten, nur nach Freigabe `fremdbewertung` | lesen | — |
| Foto (`field_job_foto`, Bucket) | eigene anlegen und lesen (höchstens 5) | lesen in ihren Kohorten | lesen | — (Medien bleiben zu, wie `field_capture` Rohinhalt) |
| Verifizierung | lesen eigene | lesen und anlegen in ihren Kohorten (Rechte seit 0032; Oberfläche G3/SR-82 zurückgestellt am 14.10.); Korrektur per Storno | alles (kein Ändern, SR-07) | lesen Ergebnis |

Zeilen von abgeschlossenen Praxistagen (Freigaben, Einschätzungen, Plan) werden nicht mehr geändert und nicht gelöscht; kein Code darf das tun (wie bestätigte Anwesenheit, Regel 7).

## 6. Offene Produktfragen

1. **Wie gibt die Trainer:in frei?** *Teilweise entschieden: Login der Rolle `trainer` gibt es seit 0032 (E1), `/trainer` existiert (G2). Offen bleibt nur, ob die Freigaben im ersten Schnitt in `/trainer` oder per serverseitigem Codewort laufen (Abschnitt 9).* Du hast „statt Codewort“ vorgegeben. Das heißt: Login der Rolle `trainer` plus eine kleine Ansicht „Freigaben“ (Variante A, empfohlen) – ein größerer Schritt, weil `requireCurrentLearner` und die Zugriffsmatrix heute nur Lernende kennen. Als Übergang bis Pilotstart wäre eine persönliche PIN der Trainer:in möglich, die sie am Gerät der Lernenden eingibt und die der Server prüft (Variante B, ohne Trainer-Login, aber weiter ein „Geheimnis in der Hand der Lernenden“-Muster).
2. **Vier oder zwei Freigaben?** Vier (Plan, Durchführung, Kontrolle, Fremdeinschätzung) wie in demo, oder zwei (Plan abnehmen, Ergebnis abnehmen). Das Modell trägt beides (`gate` ist ein Check-Wert); bei zwei entfallen `durchfuehrung` und `kontrolle`. Empfehlung: Daten für vier vorsehen, zum Start zwei aktivieren.
3. **Diktat und Datenschutz.** Das Diktat nutzt die Spracherkennung des Browsers; das Audio geht an den Browser-Anbieter. Vor einem Einsatz mit Teilnehmenden braucht es eine Datenschutzprüfung und einen Absatz in der Datenschutzerklärung. Vorschlag: Funktion hinter einem Schalter, aus bis zur Freigabe; die Texteingabe funktioniert ohne.
4. **Fotos.** *Erster Schnitt: nur Vorschau im Browser wie in demo, kein Upload (14.10.).* Pflicht oder freiwillig? Fotos von Arbeitsergebnissen können Personen oder Kundendaten zeigen: Hinweistext, Einwilligung, Aufbewahrungsdauer, Löschung klären (Datenschutzerklärung ergänzen wie bei den Profilfotos).
5. **Wer verifiziert?** *Rechte entschieden (E2, 0032): Trainer:innen dürfen in ihren Kohorten verifizieren.* Bisher nur AfCJ admin. Ist die Fremdeinschätzung der Trainer:in ein Ersatz oder eine Ergänzung zur Verifizierung durch AfCJ? Davon hängt ab, ob `verification` für `trainer` geöffnet wird (SR-03, „ab MVP“).
6. **Kriterien und Stufentexte.** Die vier Kriterien und die Texte je Punktestufe in demo sind Platzhalter. Gelten sie für alle Aufträge oder je Auftrag aus Maltes Excel?
7. **Kürzel der Unterlagen.** In Maltes Dateinamen kommen die Präfixe AA, AU, BB und ML vor. AA (Auftragsblatt) und AU (Arbeitsunterlage) kennt demo; was BB und ML bedeuten und wie sie den Lernenden heißen sollen („Bauteilbeschreibung“, „Materialliste“ wäre geraten, nicht bestätigt), muss Malte sagen. Das Modell speichert deshalb das Kürzel und zeigt den Titel aus einer kleinen Tabelle im Code, bis die Bezeichnungen feststehen.
8. **Prüfprotokoll auf Papier**: je Auftrag (`pruefprotokoll_papier`) oder je Kohorte?
9. **Trainer:in je Praxistag**: `field_job.instructor_id` muss befüllt werden (bisher leer); wer pflegt das, der Import?
10. **Abschluss-Anzeige**: demo zeigt Prozentwerte je Kompetenz. Nachweis zählt erst nach Verifizierung – Vorschlag: „Diese Kompetenzen stärkt der Auftrag“ mit Ringen des heutigen Stands und dem Hinweis „zählt nach der Prüfung“.
11. **Modul des Auftrags.** Excel nennt das Modul, die Datenbank kennt nur die Woche (`module`). Soll der Auftrag am Modul hängen (neue Spalte `modul_id`) oder weiter an einer Woche?
12. **Kennung der Teilschritte.** Welche Kennungen stehen in „Teilschritte“, und soll `competency_step.kennung` später als Option dazukommen? Bis dahin ordnet der Import aus #102 über Kompetenz und Name zu.

## 7. Aufwand (grobe Einschätzung in Stunden, keine Messung)

| Paket | Stunden |
|---|---|
| Schema, RLS, Storage-Policies, pgTAP | 16–20 |
| RPCs und Server-Aktionen (Übergänge, Abschluss in einer Transaktion) | 8–10 |
| Analyse: Unterlagen (Bucket, Download/Vorschau, „angesehen“) | 8–10 |
| Import aus Maltes Excel (Skript mit Probelauf, Zuordnung Modul und Teilschritte, Kennung am Teilschritt) | 8–12 |
| Planen: drei Listen, Sortieren, Speichern (Komponenten aus demo übernehmen) | 10–12 |
| Durchführen: Schritte der Reihe nach abhaken | 4–6 |
| Kontrolle: Foto (Verkleinern, Upload, Policies, Hinweis) | 8–10 |
| Bewerten: Kriterien, Skala, Selbst/Fremd, Vergleich | 10–12 |
| Freigaben: **Variante A** Trainer-Login und Ansicht „Freigaben“ | 16–24 |
| Freigaben: **Variante B** PIN | 8–10 |
| Abschluss, Kompetenzanzeige, Prüfansicht für AfCJ | 6–8 |
| Doku, Zugriffsmatrix, Datenschutzerklärung, SR, Traceability | 6–8 |
| Tests (Unit, RLS), Vorschau-Abnahme, Korrekturen | 10–14 |
| **Summe mit Variante A** | **110–146** |
| **Summe mit Variante B** | **102–132** |

Vorschlag für die Reihenfolge, damit jede Stufe einzeln prüfbar und mergebar ist (je ein kleiner PR, je eine Migration nur wo nötig):
1. Phasen, Unterlagen, Import, Plan, Durchführen (ohne Freigaben, `ablauf = 'gefuehrt'` nur für einen Test-Auftrag) – ca. 55–65 h.
2. Freigaben (nach Entscheidung zu Frage 1 und 2) – 8–24 h.
3. Kontrolle mit Foto (nach Frage 4) und Bewerten – ca. 20–25 h.
4. Abschluss, Prüfansicht, Doku und Datenschutz – ca. 15–20 h.

## 8. Anforderungen (SR)

Vorhanden und betroffen: SR-02 (Selbstauskunft), SR-03 (Verifizierung), SR-08 (kleine, atomare Schreibvorgänge), SR-25 (Nachweistyp und nächster Schritt im Feld), SR-71 (praktische Teilschritte), SR-77 und SR-78 (Fotos, Trainer:innen).

**SR folgt** für: geführter Praxisflow (Phasen, Plan), Freigabe durch die Trainer:in, Selbst- und Fremdeinschätzung, Unterlagen je Auftrag, Foto der Kontrolle, Import der Aufträge. Die SR-Nummern kommen erst nach der Umfangsentscheidung durch Anna aus der Notion-Datenbank „System Requirements“; ich trage sie im selben PR wie die Migration in `docs/sr-registry.json` ein.

## 9. Aufwand je Phase und Gate (Stand 14.10.2026)

**Gewusst** (aus dem Code von `origin/demo`, `dev` und der Excel vom 14.10.) ist, was demo mit festen Daten macht und was es in Staging schon gibt. **Geschätzt** sind alle Stunden; Spanne als *optimistisch–vorsichtig*, ohne Messung. Die Komponenten aus demo (`src/components/praxisflow/*`, ca. 1.400 Zeilen, plus `praxisflow-logik.ts` mit Tests) werden übernommen; die Arbeit liegt im Umstellen von Browser-Speicher auf Server.

Wichtig zur Einordnung (gewusst): In demo sind **Werkzeuge, Materialien und Arbeitsschritte keine Inhalte je Auftrag**, sondern **Eingaben der Lernenden** (Listen starten leer). Inhalte je Auftrag sind nur Arbeitsauftrag, Dateien, Bewertungskriterien, Notentexte und Texte der Gates.

| Phase / Gate | demo heute (fest, im Browser) | Daten (Inhalt) | Struktur | Code | Migration | Stunden | Einfachere Variante |
|---|---|---|---|---|---|---|---|
| Analyse | Arbeitsauftrag-Text, 2 PDFs in `public/`, „weiter erst, wenn alle Dateien geöffnet“ nur im React-State | Arbeitsauftrag je Auftrag (`field_job_type.beschreibung` gibt es), Dateien AA/AU je Auftrag | Unterlagen je Auftrag + privater Bucket | Viewer aus demo, signierte Links | ja: Tabelle `field_job_type_unterlage` + Bucket + pgTAP (Bucket lockert nichts) | 6–10 | Unterlagen als `jsonb`-Spalte an `field_job_type` statt Tabelle (Bucket bleibt nötig): 4–7; „angesehen“ nur im Browser lassen: 0 |
| Planen | drei Listen (leer), Tippen/Diktat, Reihenfolge; `localStorage` | keine (Eingabe der Lernenden); optional Musterplan (Datei ML) nur für Trainer:innen | Plan je Praxistag, nach Freigabe gesperrt | Listen-Editor aus demo an Server binden; Diktat hinter Schalter (Datenschutz) | Tabelle `field_job_plan_eintrag` | 8–12 | Plan als **`jsonb` an `field_job`** (neue Spalte mit Standard `'{}'`), Schreiben nur über RPC: 5–8. Ganz ohne Migration als JSON in `field_capture` (Phase `start`, Feld `text`): 4–6, aber Sperre nach Freigabe nur in der App (Lernende dürfen die eigene Zeile per API ändern) |
| Gate 1 Entscheiden (Plan freigeben) | Codewort „werkstatt“ im Browser, Trainer fest im Code | Gate-Texte | Freigabe mit Zeitpunkt und Person | Freigabe in `/trainer` (Login seit 0032) **oder** Codewort-Feld | Tabelle `field_job_freigabe` (Rechte über `fn_trainer_kohorten_ids`) | 6–9 (in `/trainer`) | Codewort als serverseitige Konstante, geprüft in einer RPC, Freigabe im Plan-JSON: 3–5. **Behelf:** verhindert Weiterklicken, ist aber kein Nachweis, wer freigegeben hat |
| Durchführen | Schritte streng der Reihe nach abhaken | keine | Haken je Planschritt | Checkliste aus demo; am Ende `durchgefuehrt_bestaetigt_am` setzen (vorhandene Spalte, Status-Trigger vorhanden) | keine zusätzliche (im Plan) | 3–5 | Haken im Plan-JSON: 2–3 |
| Gate 2 Durchführung | Codewort nach allen Haken | Gate-Text | wie Gate 1 | wie Gate 1 | keine zusätzliche | 1–2 | entfällt bei „zwei Gates“ (Frage 2) |
| Kontrolle | fester Text, Foto nur Vorschau, Papier-Hinweis per Schalter | Hinweis „Prüfprotokoll auf Papier“ je Auftrag | Schalter je Auftrag | Vorschau aus demo (kein Upload, 14.10.) | `field_job_type.pruefprotokoll_papier` (Spalte mit Standard) | 1–3 | Schalter als App-Konstante für den Pilot: 0,5–1 |
| Gate 3 Kontrolle | Codewort | Gate-Text | wie Gate 1 | wie Gate 1 | keine zusätzliche | 1–2 | entfällt bei „zwei Gates“ |
| Bewerten | 4 Platzhalter-Kriterien, Skala 10/9/7/5/3/0, Notentexte; Selbst → Codewort → Fremd (am Gerät der Lernenden) → Vergleich | Kriterien (global oder je Auftrag), Notentexte je Stufe | Kriterien, Bewertungen selbst/fremd | Bewertung aus demo; Fremd in `/trainer` oder nach Gate am Gerät der Lernenden | Tabellen `field_job_type_kriterium`, `bewertung_stufe`, `field_job_bewertung` | 10–14 | Kriterien und Notentexte global als Code-Konstante, Bewertungen im Plan-JSON: 5–8 |
| Gate 4 Fremdeinschätzung | Codewort schaltet Fremd frei | Gate-Text | wie Gate 1 | wie Gate 1 | keine zusätzliche | 1–2 | Fremd nur in `/trainer` statt Freischalten am fremden Gerät |
| Abschluss | „Aufgabe geschafft“, Kompetenz fest im Code | – | Abschluss-Bericht, ggf. Verifizierung | `field_capture` (Phase `abschluss`) anlegen; Kompetenzen aus `field_job_type_competency_mapping`; wenn Fremd = Freigabe (Frage 5): `verification` durch die Trainer:in (Rechte seit 0032) | keine | 3–5 | – |
| Querschnitt | – | – | Ablauf je Auftrag einschalten | Route `/praxistag/[id]` verzweigt nach Ablauf; Trainer-Ansicht Freigaben; Doku, Matrix, SR | `field_job_type.ablauf` (Standard `einfach`), RPCs für Übergänge | 8–14 | Ablauf über eine Liste von Auftragsnummern im Code statt Spalte: −1 h, keine Migration |

## 10. Schnitte und Inhalte (Stand 14.10.2026)

### 10.1 Drei Schnitte

| Schnitt | Umfang | Migrationen (0035–0049, additiv) | Stunden (geschätzt) |
|---|---|---|---|
| **S – ein Auftrag durchgehend** | Ein Auftrag (Vorschlag **M02-A03 Verlängerung Schuko 230 V**, der einzige mit vollständigen Unterlagen E-02) von Analyse bis Bewerten mit Speicherung. Plan, Haken, Freigaben und Bewertungen als `jsonb` an `field_job`, Übergänge nur über RPCs; zwei Gates (Plan, Ergebnis) in `/trainer`; Kriterien und Notentexte global im Code; Kontrolle mit Foto-Vorschau; Abschluss legt `field_capture` an, Fremd = Verifizierung durch die Trainer:in. | 2: `field_job.praxisflow jsonb` + RPCs + pgTAP; Bucket `auftrags-unterlagen` + Policy + pgTAP | **30–45** |
| **M – alle Aufträge Modul II** | wie S, dazu je Auftrag: Unterlagen-Tabelle mit Import aus der Excel (Spalte „Unterlagen“), Kriterien je Auftrag, `nummer`, `ablauf`, `pruefprotokoll_papier`; vier Gates möglich | 4: Spalten an `field_job_type`; Unterlagen-Tabelle + Bucket; Kriterien; `praxisflow jsonb` + RPCs | **50–70** |
| **L – Entwurf vollständig** | eigene Tabellen für Plan, Freigaben, Bewertungen, Unterlagen „angesehen“, Foto-Upload, Fassungen beim Neu-Einreichen; Prüfansicht | 6–8 | **95–130** (Abschnitt 7 abzüglich Trainer-Login, der seit 0032 da ist) |

Von S nach M nach L lässt sich ohne Umbau wachsen, wenn das JSON in S dieselben Felder trägt wie die späteren Tabellen (Werkzeuge, Materialien, Schritte mit Haken, Freigaben mit Zeitpunkt und Person, Bewertungen je Kriterium und Rolle). Der Umzug von JSON in Tabellen ist dann eine additive Migration plus Datenskript.

**Parallel in Worktrees** (gewusst: die Schnittstellen; geschätzt: der Gewinn):
1. **Migrationen** (eigener Worktree, PRs direkt nach `dev`): RPC-Signaturen zuerst festlegen und als Typen in `database.types.ts` veröffentlichen – danach können 2 und 3 parallel laufen.
2. **Lernenden-Ablauf** auf `feat/praxisflow`: Komponenten aus demo übernehmen, an RPCs binden.
3. **Trainer-Freigaben** auf `feat/praxisflow`: in `/trainer` (Karten „Praxis“, Knopf „Plan freigeben“ usw.).
4. **Inhalte und Import**: Skript aus #102 um `nummer`, Unterlagen und ggf. Kriterien erweitern; Dateien hochladen.
Engstellen bei gleichzeitigem Arbeiten: `src/lib/database.types.ts` und die Route `/praxistag/[fieldJobId]`; dort nacheinander mergen. Ersparnis gegenüber seriell grob 25–35 % (geschätzt), weil 2 und 3 auf 1 warten.

### 10.2 Inhalte, die vorher geliefert werden müssen (Engpass)

Stand Excel 14.10. (gewusst):
- **Unterlagen:** Nur **M02-A03** hat Unterlagen (E-02: AA, AU, BB, ML; von BB-E-02 gibt es zwei Fassungen). Bei allen anderen 12 Aufträgen von Modul II steht „Unterlagen-Nr. und Dateinamen fehlen noch“. Ohne Dateien ist Analyse leer.
- **Bedeutung der Kürzel:** AA (Auftragsblatt) und AU (Arbeitsunterlage) sind aus demo bekannt; **BB** ist offen, **ML** heißt laut Dateiname „Werkzeug_Material_Arbeitsschritte“ – vermutlich der Musterplan. Zu klären: sehen Lernende ML (dann ist Planen vorweggenommen) oder nur Trainer:innen?
- **Bewertungskriterien und Notentexte:** in demo Platzhalter; zu liefern: global oder je Auftrag (Frage 6), Texte für alle sechs Stufen.
- **Arbeitsauftrag-Text** je Auftrag in Lernenden-Sprache (heute nur der Titel in der Excel).
- **Gate-Texte und Etappen-Texte** (demo hat Vorschläge, Freigabe durch Malte oder Anna).
- **Prüfprotokoll auf Papier** ja/nein je Auftrag oder je Kohorte (Frage 8).
- **Welche Aufträge im Pilot den neuen Ablauf nutzen** (alle 13 im Block 16.–24.11. oder nur einzelne).
- **Tagesplanung des Praxisblocks** und Trainer:in je Praxistag (Übergabe: `field_job.bis_datum`, Simon für „Simon & Tom“).
- **Entscheidungen:** zwei oder vier Gates (Frage 2), Fremdeinschätzung = Verifizierung (Frage 5), Diktat an oder aus (Frage 3).

Ohne Unterlagen und Kriterien ist auch Schnitt S nur als Hülle nutzbar; mit den Unterlagen E-02 ist S für **einen** Auftrag sinnvoll testbar.
