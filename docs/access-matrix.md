# Access Matrix — AfCJ MVP-Prototyp

Quelle: [MVP April 2027 — Product Development Playbook](https://app.notion.com/p/climatejobsacademy/MVP-April-2027-Product-Development-Playbook-3ce48915565b810db222c7e70679063b) (Notion), Schritt 4c, ergänzt um Team-Entscheidungen vom 2026-09-11 zu den offenen Fragen aus dem ersten Build-Task (siehe `open-questions.md`). Stand: 2026-09-11.

Diese Tabelle wird wörtlich zu den RLS-Policies in der Datenbank. Weil die Regeln in der Datenbank liegen und nicht in der App, halten sie auch, wenn ein Screen falsch gebaut wird. Zugriff nie über das hier Gelistete hinaus erweitern, keine Rollen erfinden — siehe `data-model.md`.

## Zugriffs-Vokabular

Jede Zelle nennt, was eine Rolle **read** und was sie **write** darf, aus einem festen Vokabular:

| Wert | Bedeutung |
|---|---|
| Own | nur Datensätze über sich selbst |
| Org | alle Datensätze mit der eigenen Employer-Organisation-ID |
| Cohort | Datensätze der Kohorten, denen man zugewiesen ist (relevant für AfCJ trainer) |
| All | alles |
| — | nichts |

Prinzip: im Zweifel die engere Option. Erweitern ist später eine Zeile Code, Verengen nach Gewöhnung ein Kundengespräch.

## Rollen

Learner · Instructor / Team Lead · AfCJ trainer · Manager · AfCJ admin

## Matrix

| Entity / group | Learner | Instructor / Team Lead | AfCJ trainer | Manager | AfCJ admin |
|---|---|---|---|---|---|
| Organisation, membership (inkl. `organisation.logo_pfad`, SR-76) | read Own; write — | read Org; write — | read Own; write — | read Org; write — | read All; write All |
| Qualification structure (Curriculum, Kompetenzen, Mappings) | read All (nur veröffentlicht); write — | read All (nur veröffentlicht); write — | read All (nur veröffentlicht); write — | read All (nur veröffentlicht); write — | read All; write All |
| Cohort, schedule, live sessions | read Own; write — | read Cohort; write — | read Cohort (Kohorten mit mindestens einem eigenen Termin, SR-81); write — | read Org; write — | read All; write All |
| Enrolment | read Own; write — | read Cohort; write — | read Cohort (wie oben); write — | read Org; write — | read All; write All |
| Field job | read Own; write Own (nur `durchgeführt_bestätigt_am`, `ergebnis`, `problem_beschreibung` — sonst nichts) | read Cohort; write Cohort | read Cohort (Praxistage in Kohorten mit eigenem Termin, SR-82); write — | read Org; write — | read All; write All |
| Field job type, Field job type frage | read All (nur published); write — | read All (nur published); write — | read All (nur published); write — | read All (nur published); write — | read All; write All |
| Lernmaterialien (`lesson_resource`, Bucket `lesson-resources`) | read Own (nur veröffentlichte Lektionen im eingeschriebenen Programm, Einschreibung aktiv oder abgeschlossen); write — | offen | offen | offen | read All; write All (Upload über Dashboard) |
| Fragen-Thread (`lektion_beitrag`) | read Cohort (nur eigene Kohorte, Lektion lesbar und `chat_aktiv`); write Own (nur mit Einschreibung `aktiv`; kein Bearbeiten, Löschen eigener Beiträge über Funktion) | offen | offen | offen | read All; write — (Löschen aller Beiträge über Funktion) |
| Moderation Fragen-Thread (`kohorte_moderation`, `moderationsprotokoll`) | read Own (eigene Moderationszuordnung); write — | offen | offen | offen | read All; write All (Protokoll nur lesen, entsteht über die Löschfunktion) |
| Profilfoto (`person.foto_pfad`, Bucket `profilfotos`, SR-77) | read Own, Fotos der eigenen Trainer:innen (laut eigenem Plan) und Fotos der Mitglieder der eigenen Kohorte (gleiche Organisation, aktive Einschreibung; der Upload ist die Freigabe, SR-30); write Own (nur eigener Ordner) | offen | read Own; write Own (nur eigener Ordner); keine Fotos der Lernenden (noch offen) | offen | read All; write All |
| Trainer:in je Termin (Name, Rufname, Foto über `fn_meine_trainer`, SR-78) | read Own (nur Personen mit Rolle `trainer` an eigenen Live-Terminen und Praxistagen); write — | offen | — (meldet sich seit 0032 an; Lernende der eigenen Kohorten über `fn_trainer_teilnehmende`, siehe Zeile unten) | offen | read All; write All (Zuordnung über Dashboard) |
| Kohortenmitglieder (Anzeigename, Foto über `fn_meine_kohorte`, SR-30) | read Cohort (nur gleiche Kohorte **und** gleiche Organisation, nur aktive Einschreibungen; ohne die eigene Person, ohne E-Mail, Geburtsdatum, Vorerfahrung, Arbeitgeber); write — | offen | — (keine Kohortenliste; Trainer:innen sehen Lernende ihrer Kohorten über die Rechte aus 0032, `fn_trainer_kohorten_ids`) | offen | read All; write All |
| Lernende der eigenen Kohorten (Name, Rufname über `fn_trainer_teilnehmende`, SR-81, SR-82) | — | offen | read Cohort (ohne E-Mail, Geburtsdatum; `person` bleibt geschlossen); write — | offen | read All; write All |
| File assets | read All; write — | read All; write — | read All; write — | read All; write — | read All; write All |
| Unit progress | read Own; write Own | read Cohort; write — | read Cohort; write — | read Org; write — | read All; write All |
| Attendance (SR-07, SR-81) | read Own; write — | read Cohort; write Cohort | read Cohort; write Cohort (nur anlegen, Korrektur per Storno-Eintrag; kein Ändern, kein Löschen) | read Org; write — | read All; write All (kein Ändern, SR-07; Löschen bis zur Entscheidung über den Löschweg) |
| Field capture — Status/Ergebnis | read Own; write — | read Cohort; write — | read Cohort (SR-82); write — | read Org; write — | read All; write — |
| Field capture — Rohinhalt/Antworten (Text/MC-Antworten/Media) | read Own; write Own | read Cohort; write — | read Cohort (SR-82); write — | —; — | read All; write — |
| Verification (SR-07, SR-82) | read Own; write — | read Cohort; write Cohort | read Cohort; write Cohort (nur anlegen, Korrektur per Storno-Eintrag; kein Ändern, kein Löschen) | read Org (nur Ergebnis); write — | read All; write All (kein Ändern, SR-07; Löschen bis zur Entscheidung über den Löschweg) |
| Competency evidence / profile | read Own; write — | read Cohort; write — | read Cohort (nur Nachweise aus Praxisberichten, ergibt sich aus den Basistabellen); write — | read Org; write — | read All; write — |
| Knowledge sources | —; — | —; — | —; — | —; — | read All; write All |
| Guidance conversations | — (noch nicht Prototype) | — (noch nicht Prototype) | — (noch nicht Prototype) | — (noch nicht Prototype) | — (noch nicht Prototype) |

Organisations-Logo (SR-76, 0025): Die Zuordnung `organisation.logo_pfad` folgt der Zeile „Organisation, membership“ (Lernende nur eigene Organisation). Die Bilddateien liegen im **öffentlichen** Bucket `org-logos`: Lesen für alle mit der URL, ohne Login (bewusst entschieden 2026-10-08, Dateinamen sind UUIDs). Schreiben nur AfCJ admin im Supabase-Dashboard; es gibt keine Storage-Policy und keine Schreibrechte der App.

## Anmerkungen

Entschieden 2026-09-04: Zehn von zwölf Zeilen ausgefüllt bei Erstanlage. "Field job" war zunächst offen (hängt an der Praxistag-Journey), ist mit Ergänzung 2026-09-09 als KI-Entwurf befüllt, analog zu Enrolment/Attendance — zur Bestätigung durch Malte zusammen mit Group 3 in `data-model.md` (Group 3 gilt dort bereits als abgenommen, da Malte vor Prototyp-Start kein Review mehr leisten kann). "Guidance conversations" bleibt leer, weil die zugrunde liegende Entität noch nicht Prototype ist (Build next).

"Field capture" ist bewusst in zwei Zeilen gesplittet, weil das feste Zugriffs-Vokabular (Own/Org/Cohort/All/—) "Status ja, Rohmaterial nein" nicht in einer Zelle ausdrücken kann — Begründung siehe die Manager-Media-Access-Entscheidung in `data-model.md` (Open Decisions). "Competency evidence / profile" hat bewusst kein Write für irgendeine Rolle — folgt aus der "computed only"-Entscheidung dort; Werte entstehen ausschließlich über `unit_progress`/`attendance`/`verification`. AfCJ trainer ist im Prototyp überwiegend "—", weil die Rolle noch nicht real existiert (AfCJ admin deckt sie ab) — die Spalte bleibt zur Vorbereitung auf das MVP stehen. (Überholt für die Rolle `trainer` seit 0032, siehe Absatz vom 2026-10-13 zu SR-81/SR-82.)

Entschieden 2026-09-11: "Field job" bekommt entgegen der ursprünglichen Annahme doch ein Learner-Write — aber bewusst eng auf drei Felder begrenzt (Bestätigungs-Zeitstempel, Ergebnis erledigt/Problem, Problembeschreibung), nicht auf die ganze Zeile. Grund: Der Praxistag-Flow braucht einen expliziten Bestätigungs-Schritt der Lernenden, unabhängig von den Start-/Abschluss-Fragen (die weiterhin ausschließlich über `field_capture`/`field_capture_antwort` laufen, siehe "Field capture" oben). "Field job type" und "File assets" waren bisher nicht als eigene Zeilen dokumentiert (siehe `open-questions.md`) — jetzt nachträglich ergänzt: beides lesend für alle offen, Schreiben ausschließlich AfCJ admin im Backend. "Field job type" zusätzlich mit "nur published", analog zur Qualification structure.

Zu "Cohort, schedule, live sessions" — Learner read Own: Die RLS-Policy `live_session_learner_select` prüft für `live_session` ausschließlich `schedule_entry.cohort_id`, nicht `enrolment_id`. Für `art = 'live'`-Einträge in `schedule_entry` muss deshalb immer `cohort_id` gesetzt sein, nie `enrolment_id` — passt zum konzeptionellen Verständnis "Live-Sessions sind kohortenweit" (siehe `data-model.md`, Group 3), ist aber nirgends als DB-Constraint erzwungen. Ein versehentlich `enrolment_id`-basierter live-Eintrag ist für den Learner unsichtbar (Tagesansicht zeigt nichts), wird aber in der Wochenübersicht trotzdem mitgezählt — am 2026-09-15 als Seeding-Fehler entdeckt und bestätigt, keine Code-Änderung nötig.

Entschieden 2026-10-07 (Learning Designer und Vera): Zeile "Lernmaterialien" neu. Lernende lesen Materialien und die Dateien im Bucket `lesson-resources` nur, wenn die Lektion veröffentlicht ist und sie in einer Kohorte des Programms der Lektion mit Status aktiv oder abgeschlossen eingeschrieben sind (`fn_kann_lektion_lesen`, Migration 0023). Das ist enger als die bisherige Regel für `lesson_resource` (nur veröffentlicht). Die Spalten für Instructor, AfCJ trainer und Manager sind bewusst offen, weil diese Rollen im Prototyp nicht existieren. `file_asset` bleibt für alle Eingeloggten lesbar (Name, Typ, Pfad), der Dateiinhalt nur über die Storage-Policy.

Entschieden 2026-10-07 (Vera), SR-74 und SR-75, Migration 0024: Zeilen „Fragen-Thread“ und „Moderation Fragen-Thread“ neu. Lernende lesen Beiträge nur im Thread ihrer eigenen Kohorte an Lektionen mit `chat_aktiv` (Einschreibung aktiv oder abgeschlossen) und schreiben nur mit Einschreibung `aktiv`. Beiträge sind innerhalb der Kohorte über Arbeitgeber hinweg sichtbar (Ausnahme von SR-06, siehe `decisions.md`, Eintrag 2026-10-07 „Fragen-Thread gehört der Kohorte, Ausnahme von SR-06“). Moderierende sind keine eigene Rolle, sondern Einträge in `kohorte_moderation`; sie lesen die Threads ihrer Kohorte und löschen dort Beiträge. Die Spalten für Instructor, AfCJ trainer und Manager bleiben offen.

Entschieden 2026-10-12 (Vera), SR-13, Migration 0026: Zeile „Field job“ unverändert. Die neuen Spalten `start` und `ende` liest der Learner mit der eigenen Zeile. Schreiben dürfen Lernende weiterhin nur die drei Felder aus dem Eintrag vom 2026-09-11; der Spalten-Grant gilt für die ganze Rolle `authenticated`, also auch für AfCJ admin in der App. Die Zeiten setzt AfCJ über Dashboard bzw. SQL wie die übrigen Praxistag-Daten.

Entschieden 2026-10-13 (SR-05, Migration 0028): `modul` und `modul_competency` gehören zur Zeile „Qualification structure“, keine neue Zeile. Lernende lesen nur veröffentlichte Module (`modul.status`) und Kompetenz-Zuordnungen nur an veröffentlichten Modulen; Schreiben nur AfCJ admin. `fn_modul_zeitraum` läuft mit den Rechten der aufrufenden Person (security invoker) und erweitert keinen Zugriff: Lernende bekommen Zeiträume nur aus ihrem eigenen Stundenplan, AfCJ admin aus allen Einträgen der Kohorte.

Entschieden 2026-10-13 (SR-13, SR-15, SR-48, SR-73, Migration 0029): keine neue Zeile. `lesson.thema` und `lesson.live_lektion_id` gehören zur Zeile „Qualification structure“ (Learner lesen veröffentlichte Lektionen, Schreiben nur AfCJ admin). `person.rufname` gehört zur eigenen Person: Learner lesen und ändern nur den eigenen Rufnamen (`person_self_update`, 0009). Der Stand „in Bearbeitung“ fällt unter „Unit progress“ (Learner write Own) und wird nur angelegt, nie überschrieben.

Entschieden 2026-10-13 (Vera), SR-77 und SR-78, Migration 0030: Zeilen „Profilfoto“ und „Trainer:in je Termin“ neu. Die neue Rolle `trainer` bekommt keinen Login-Bereich und keinen Zugriff in der App (überholt durch 0032, Entscheidung E1: Trainer:innen melden sich an); sie markiert nur, wer an Terminen als Trainer:in angezeigt werden darf (Spalte „AfCJ trainer“ darum „— (keine Anmeldung)“). Trainer:innen haben eigene Konten, getrennt von evtl. Lernenden-Konten derselben Person. Lernende sehen ihr eigenes Foto und die Fotos ihrer Trainer:innen, aber keine Fotos anderer Lernender; das hängt an der späteren Entscheidung zur Kohortensicht (Datenlücke Nr. 6). Die Tabelle `person` bleibt für Lernende auf die eigene Zeile beschränkt (`person_self_select`); Name, Rufname und Fotopfad der Trainer:innen kommen nur über `fn_meine_trainer()`. Der Fotopfad muss im eigenen Ordner liegen (Check), weil `person_self_update` alle Spalten der eigenen Zeile freigibt.

Entschieden 2026-10-13 (Vera, Paket G E1–E4), SR-07, SR-81, SR-82, Migration 0032: Trainer:innen (Rolle `trainer`) melden sich an (Magic Link wie Lernende) und handeln für alle Termine und Praxisberichte einer Kohorte, in der sie mindestens einen Termin haben (`live_session.trainer_id` oder `field_job.instructor_id`; `fn_trainer_kohorten_ids`). Sie lesen Kohorte, Plan, Einschreibungen, Praxistage, Praxisberichte und Verifizierungen dieser Kohorten, bestätigen Anwesenheit und prüfen Praxisberichte (nur anlegen). Den Plan selbst ändern sie nicht (enger als die bisherige Zelle „write Cohort“). `attendance` und `verification` sind für alle Rollen unveränderlich (Trigger), Korrektur per Storno-Eintrag (`korrigiert_id`), aktuelle Werte über `attendance_aktuell` und `verification_aktuell`. Löschen bleibt nur AfCJ admin, bis der Löschweg (DSGVO) entschieden ist. „Unit progress read Cohort“ für AfCJ trainer ist noch nicht umgesetzt (keine Policy).

Entschieden 2026-10-13 (Vera, Paket G), SR-77, Migration 0033: Die eigene `person`-Zeile ist nur noch in `rufname` und `foto_pfad` selbst änderbar (Spalten-Grant). Name, E-Mail, Benutzername, Geburtsdatum, Geschlecht, Sprache und Vorerfahrung pflegt AfCJ admin (Dashboard). Vorher erlaubte `person_self_update` alle Spalten der eigenen Zeile.

Entschieden 2026-10-14 (Vera), SR-30, Migration 0034: Zeile „Kohortenmitglieder“ neu. Lernende sehen die anderen Lernenden ihrer Kohorte über `fn_meine_kohorte()` (security definer), nur aus **derselben Kohorte und derselben Organisation** (die Organisation hängt an der Einschreibung) und nur mit **aktiver** Einschreibung: Anzeigename (Rufname plus Initial des Nachnamens) und Fotopfad. E-Mail, Geburtsdatum, Geschlecht, Vorerfahrung und Arbeitgeber bleiben verborgen; die Tabelle `person` und ihre Policies bleiben unverändert. Das Foto eines Mitglieds sehen Kohortenmitglieder über `fn_darf_foto_sehen` (Regel in der Storage-Policy `profilfotos_lesen`): **der Upload ist die Freigabe**, Entfernen nimmt sie zurück; es gibt keinen zusätzlichen Schalter an `person`. Keine Kohortenliste für Trainer:innen. Entwurf der Datenschutztexte: `docs/datenschutz-kohortenansicht-entwurf.md` (Prüfinstanz offen).
