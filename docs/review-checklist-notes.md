# Review-Checkliste — Nachweise

Antworten auf die Checkliste aus `data-model.md`, Abschnitt "Review-Checkliste vor
dem Merge" (4e).

## ☑ Jede mit "Prototyp: Ja" markierte Entität erscheint im Diagramm; nichts erscheint, das nicht gelistet ist

Alle 24 "Prototyp: Ja"-Entitäten stehen in `er-diagram.md`:

- Group 1: `organisation`, `person`, `org_membership`, `role_assignment`
- Group 2: `programme`, `module`, `course`, `lesson`, `competency`, `competency_step`, `content_competency_mapping`
- Group 3: `cohort`, `enrolment`, `schedule_entry`, `live_session`, `field_job_type`, `field_job`
- Group 4: `unit_progress`, `attendance`, `field_capture`, `field_capture_step_mapping`, `verification`
- Group 5: `file_asset`, `knowledge_source`

Bewusst **nicht** enthalten (Begründung siehe data-model.md selbst):
`target_group` (Later), `guidance_conversation` (Build next). Beide stehen als
Fußnote im Diagramm statt stillschweigend zu fehlen.

`competency_evidence` erscheint nicht als Entität, weil es keine Tabelle ist —
siehe nächster Punkt.

## ☑ Jede Employer-eigene Entität trägt die `organisation_id`

Geprüft gegen die Owner-Spalte in `data-model.md`. Alle Tabellen mit
Owner = "Employer" haben `organisation_id not null references organisation`:
`org_membership`, `role_assignment`, `enrolment`, `schedule_entry`, `field_job`,
`unit_progress`, `attendance`, `field_capture`, `field_capture_step_mapping`,
`verification`. (`file_asset`, Owner "AfCJ oder Employer", hat `organisation_id`
nullable — siehe `open-questions.md`, Q-FILE-ASSET.)

Tabellen mit Owner = "AfCJ" tragen bewusst **kein** `organisation_id` (sie sind
global, `read All` für jede Rolle): `programme`, `module`, `course`, `lesson`,
`competency`, `competency_step`, `content_competency_mapping`, `cohort`,
`live_session`, `field_job_type`, `knowledge_source`.

## ☑ Für jede Zelle der Zugriffsmatrix kann die KI auf die umsetzende Policy zeigen

Fünf Stichproben (davon eine "—"), Datei jeweils `supabase/migrations/0009_rls_policies.sql`:

| Zelle | Policy |
|---|---|
| Learner / "Organisation, membership" → read Own | `organisation_learner_select` |
| Learner / "Unit progress" → write Own | `unit_progress_learner_write` + `unit_progress_learner_update` |
| AfCJ admin / "Verification" → write All | `verification_admin_all` |
| **Learner / "Field capture — Status/Ergebnis" → write "—"** | keine Policy *und* keine Spalten-Grant für `status`: `grant insert (organisation_id, learner_id, field_job_id, text, media, eingereicht_am)` / `grant update (text, media)` lassen `status` bewusst aus. Belegt durch die `throws_ok`-Fälle in `002_learner_own_captures.test.sql`. |
| **Learner / "Knowledge sources" → "—; —"** | keine `create policy ... on knowledge_source` für Learner überhaupt → RLS verweigert per Default alles. |

(Alle übrigen Zellen der Matrix, die Instructor/AfCJ trainer/Manager betreffen,
sind im Prototyp nicht erreichbar, weil diese Rollen nicht existieren — siehe
`open-questions.md`, Q-FUTURE-ROLES.)

## ☑ Das Kompetenzprofil ist eine berechnete View, keine Tabelle

`supabase/migrations/0006_progress_and_evidence.sql` — `create view
competency_evidence with (security_invoker = true) as ...`. Kein `create table`,
kein Insert/Update-Pfad, keine eigenen RLS-Policies (erbt sie von den
Quelltabellen). Erfüllt SR-01.

## ☑ Offene Fragen der KI sind beantwortet, und wo geändert, sind 4b/4c/4d aktualisiert

Alle Annahmen/Lücken stehen in `open-questions.md`, jeweils mit Verweis auf die
betroffene Migration. Keine davon widerspricht einer bereits getroffenen
Entscheidung in `data-model.md` — es sind ausschließlich Lücken, wo das Dokument
keinen Wert vorgibt. Deshalb wurden `data-model.md`/`access-matrix.md` selbst
**nicht** verändert; sobald die offenen Fragen beantwortet sind, sollten die
Antworten dort nachgetragen und die betroffenen Migrationen/Policies angepasst
werden.

## ☑ RLS-Tests existieren mindestens für: Employer-Isolation, Learner-Zugriff nur auf eigene Captures

- `supabase/tests/database/001_employer_isolation.test.sql` — Learner in Org A
  sieht weder `organisation`, `enrolment`, `field_job` noch `unit_progress` von
  Org B.
- `supabase/tests/database/002_learner_own_captures.test.sql` — Learner sieht/
  schreibt nur eigene `field_capture`-Zeilen, darf `status` nie selbst setzen,
  AfCJ admin sieht alle, schreibt keine direkt; der `verification`-Trigger setzt
  `status` stellvertretend.

Ausführen: `supabase test db` (benötigt lokal laufenden Supabase-Stack, `supabase
start`).
