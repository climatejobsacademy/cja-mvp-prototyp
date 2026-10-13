# Praxisflow-Realbau: Analyse und Migrationsentwurf

Stand 13.10.2026. **Nur Analyse und Entwurf.** Es gibt dazu keine Migration im Repo, kein Branch mit Code und keinen Datenbankzugriff. Grundlage sind der Stand von `origin/demo` (4c6a64d) und `dev` (6264168) sowie die Migrationen bis 0030. Der SQL-Teil unten ist ein Text-Entwurf, nicht ausgeführt und nicht getestet.

Zweck: Grundlage für den Realbau (Zeitfenster 03.–12.11.2026) und für die Übergabe an Anna und Malte.

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
| Verifizierung | `verification` (0006, 0009), Trigger setzt den Status der Selbstauskunft | nur AfCJ admin schreibt (SR-03: ab MVP auch die zuständige Instructor-Rolle) |
| Kompetenzen | `field_job_type_competency_mapping` (0018, nur praktische Teilschritte, SR-71), `competency_evidence` zählt nur `verified` | lesen wie `competency_*` |
| Dateien | `file_asset`, `lesson_resource`, privater Bucket `lesson-resources` (0023) | an Lektionen gebunden, nicht an Aufträge |
| Trainer:in | Rolle `trainer` seit 0030 (Konto **ohne Login-Nutzung**), `fn_meine_trainer()`, Fotos in `profilfotos` | nur Anzeige |

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

Alles additiv, ein Praxistag-Typ schaltet den neuen Ablauf einzeln ein, bis dahin bleibt der einfache Ablauf (Rückfall ohne Datenverlust).

### 4.1 Erweiterungen bestehender Tabellen

- **`field_job_type.ablauf`** `text not null default 'einfach' check (ablauf in ('einfach','gefuehrt'))`. Nur Typen mit `gefuehrt` zeigen den sechsphasigen Ablauf.
- **`field_job_type.pruefprotokoll_papier`** `boolean not null default false` (demo: `ZEIGE_PRUEFPROTOKOLL_HINWEIS`, für Energiehelden an).
- **`field_job_type.nummer`** `text unique` (z. B. `M02-A03`, Maltes Spalte „Nummer“) und **`field_job_type.unterlagen_nr`** `text` (z. B. `E-02`, Spalte „Unterlagen-Nr.“). Die Nummer ist der Schlüssel für den Import (wiederholbar ohne Dubletten).
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
| `field_job_foto` | Dokumentation in der Kontrolle | `field_job_id`, `learner_id`, `storage_pfad`, `erstellt_am`; höchstens 5 je Praxistag |

Storage: zwei **private** Buckets, Zugriff nur über signierte Links (Muster `lesson-resources` und `profilfotos`):
- `auftrags-unterlagen` (PDF, PNG, JPEG, DOCX, XLSX, 50 MB), Pfad `<field_job_type_id>/<uuid>.<ext>`, Upload nur AfCJ admin.
- `praxis-fotos` (JPEG, 2 MB), Pfad `<organisation_id>/<field_job_id>/<uuid>.jpg`; das Foto wird im Browser auf höchstens 1600 px verkleinert.

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
-- 0031_praxisflow_realbau.sql  (ENTWURF, nicht im Repo, nicht getestet)

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

Beim Realbau gibt es zwei Wege für die Nummer:
1. **`kategorie` weiterverwenden.** Keine Migration nötig, der Import aus #102 läuft unverändert weiter. Nachteil: `kategorie` ist ein Freitextfeld ohne Eindeutigkeit und mit anderem Namen als seine Bedeutung; die Wiederholbarkeit des Imports hängt dann an einer Konvention.
2. **In einer Migration nach `nummer` umziehen** (Spalte `nummer` anlegen, `unique`, `kategorie` übernehmen, danach `kategorie` freigeben oder entfernen). Das ist sauberer, ändert aber den Import aus #102 und braucht einen Zwei-Schritt (additiv zuerst, Spalte später löschen).
Empfehlung: Weg 1 bis zum Pilotstart, Weg 2 zusammen mit der Migration des Praxisflow-Realbaus, damit es nur eine Umstellung gibt. Die Tabelle oben beschreibt das Ziel mit `nummer`.

**Teilschritt-Kennung:** `competency_step.kennung` bleibt eine **Option für einen späteren Import**. Solange Maltes Excel Teilschritte über Kennungen führt und der Import über Kompetenz und Name zuordnet, ist die Zuordnung eindeutig nur so lange, wie die Namen eindeutig bleiben; eine Kennung würde das absichern. Sie ist keine Voraussetzung für den Realbau.

Ablauf: Skript wie die Skripte in `scripts/sql/`, **zuerst Probelauf** mit Zählung (neue und geänderte Aufträge, fehlende Dateien, unbekannte Teilschritte, unbekannte Kürzel), danach erst Speichern. Dateien lädt AfCJ admin in den Bucket `auftrags-unterlagen`; der Import legt nur die Zeilen an und meldet Dateien, die im Ordner fehlen. Dateinamen mit Leerzeichen oder Umlauten werden beim Upload zu `<uuid>.<ext>` umbenannt, der Originalname bleibt in `file_asset.dateiname`.

## 5. Zugriffsregeln je Rolle

Das ist eine **Erweiterung der Zugriffsmatrix** (Regel 3 in `CLAUDE.md`): `docs/access-matrix.md` wird im selben PR angepasst, die Rolle `trainer` bekommt erstmals einen Login. Das braucht deine Entscheidung (Frage 1 unten).

| Daten | Learner | Trainer:in (`instructor_id`) | AfCJ admin | Manager (Arbeitgeber) |
|---|---|---|---|---|
| `field_job.phase` | lesen eigene; schreiben nur über RPC | lesen der zugewiesenen | alle | lesen Org (nur Phase) |
| Unterlagen (`field_job_type_unterlage`, Bucket) | lesen, wenn ein Praxistag dieses Typs existiert | lesen | alles | — |
| Plan (`field_job_plan_eintrag`) | eigene lesen; schreiben nur in der Phase `planen`; `erledigt_am` nur über RPC | lesen der zugewiesenen | lesen | — |
| Freigabe (`field_job_freigabe`) | lesen eigene; **nicht** schreiben | schreiben für zugewiesene Praxistage, nur in der passenden Phase | alle | — |
| Selbsteinschätzung | schreiben eigene bis zum Abschluss | lesen | lesen | — |
| Fremdeinschätzung | lesen **erst nach Abschluss** | schreiben für zugewiesene, nur nach Freigabe `fremdbewertung` | lesen | — |
| Foto (`field_job_foto`, Bucket) | eigene anlegen und lesen (höchstens 5) | lesen der zugewiesenen | lesen | — (Medien bleiben zu, wie `field_capture` Rohinhalt) |
| Verifizierung | lesen eigene | lesen (Schreiben ab MVP laut SR-03, nicht jetzt) | alles | lesen Ergebnis |

Zeilen von abgeschlossenen Praxistagen (Freigaben, Einschätzungen, Plan) werden nicht mehr geändert und nicht gelöscht; kein Code darf das tun (wie bestätigte Anwesenheit, Regel 7).

## 6. Offene Produktfragen

1. **Wie gibt die Trainer:in frei?** Du hast „statt Codewort“ vorgegeben. Das heißt: Login der Rolle `trainer` plus eine kleine Ansicht „Freigaben“ (Variante A, empfohlen) – ein größerer Schritt, weil `requireCurrentLearner` und die Zugriffsmatrix heute nur Lernende kennen. Als Übergang bis Pilotstart wäre eine persönliche PIN der Trainer:in möglich, die sie am Gerät der Lernenden eingibt und die der Server prüft (Variante B, ohne Trainer-Login, aber weiter ein „Geheimnis in der Hand der Lernenden“-Muster).
2. **Vier oder zwei Freigaben?** Vier (Plan, Durchführung, Kontrolle, Fremdeinschätzung) wie in demo, oder zwei (Plan abnehmen, Ergebnis abnehmen). Das Modell trägt beides (`gate` ist ein Check-Wert); bei zwei entfallen `durchfuehrung` und `kontrolle`. Empfehlung: Daten für vier vorsehen, zum Start zwei aktivieren.
3. **Diktat und Datenschutz.** Das Diktat nutzt die Spracherkennung des Browsers; das Audio geht an den Browser-Anbieter. Vor einem Einsatz mit Teilnehmenden braucht es eine Datenschutzprüfung und einen Absatz in der Datenschutzerklärung. Vorschlag: Funktion hinter einem Schalter, aus bis zur Freigabe; die Texteingabe funktioniert ohne.
4. **Fotos.** Pflicht oder freiwillig? Fotos von Arbeitsergebnissen können Personen oder Kundendaten zeigen: Hinweistext, Einwilligung, Aufbewahrungsdauer, Löschung klären (Datenschutzerklärung ergänzen wie bei den Profilfotos).
5. **Wer verifiziert?** Heute nur AfCJ admin. Ist die Fremdeinschätzung der Trainer:in ein Ersatz oder eine Ergänzung zur Verifizierung durch AfCJ? Davon hängt ab, ob `verification` für `trainer` geöffnet wird (SR-03, „ab MVP“).
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
