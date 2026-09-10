# cja-mvp-prototyp

Supabase-Schema, RLS-Policies und ER-Diagramm für die Qualifizierungsplattform
Elektrofachkraft Erneuerbare Energien (Prototyp), abgeleitet aus dem
Notion-Playbook "MVP April 2027: Product Development Playbook", Schritt 4b–4e.

Dies ist ein Backend-Repo (Schema + Zugriffsregeln), kein Frontend. Die
UX-Prototypen (React/Vite, gemockte Daten) liegen separat im Repo
`cja-ux-exploration`.

## Struktur

```
docs/
  data-model.md              Quelle: Entitäten, Attribute, Entscheidungen (4b/4d)
  access-matrix.md           Quelle: Rollen × Entität-Zugriffsmatrix (4c)
  design-specifications.md   Quelle: Design-System-Fundament + kritische User-Flows (4e-Ergänzung)
  er-diagram.md              Generiertes ER-Diagramm (Mermaid), aus data-model.md/access-matrix.md
  open-questions.md          Stellen, an denen data-model.md/access-matrix.md keinen
                              eindeutigen Wert vorgeben — mit der getroffenen Annahme
  review-checklist-notes.md  Beantwortung der Review-Checkliste aus data-model.md (4e)

supabase/
  migrations/                Schema (0001–0007) + RLS-Policies (0008–0009), in Reihenfolge
  tests/database/            pgTAP-Tests: Employer-Isolation, Learner-Zugriff auf eigene Captures
  config.toml                Minimal-Konfiguration für die lokale Supabase-CLI
```

## Lokal starten

Benötigt die [Supabase CLI](https://supabase.com/docs/guides/cli) und Docker.

```bash
supabase start      # startet lokalen Postgres + Auth + Studio, spielt supabase/migrations/ ein
supabase test db     # führt die pgTAP-Tests in supabase/tests/database/ aus
```

`supabase db reset` spielt alle Migrationen erneut von vorn ein (u. a. praktisch
nach Änderungen an bestehenden Migrationsdateien während der lokalen Entwicklung).

## Ausgangslage und offene Punkte

- Migrationen und RLS setzen ausschließlich Entitäten/Regeln um, die in
  `docs/data-model.md`/`docs/access-matrix.md` mit "Prototyp: Ja" markiert sind.
  Nichts wurde darüber hinaus ergänzt — Lücken stehen in `docs/open-questions.md`.
- Die Zugriffsmatrix kennt fünf Rollen, das Prototyp-Schema nur zwei
  (`learner`, `afcj_admin` in `role_assignment.rolle`) — die anderen drei
  (Instructor/Team Lead, AfCJ trainer, Manager) existieren laut data-model.md im
  Prototyp noch nicht als eigene Personen. RLS-Policies decken deshalb nur die
  zwei existierenden Rollen ab (siehe `docs/open-questions.md`, Q-FUTURE-ROLES).
- Löschprotokoll (DSGVO/AZAV) ist bewusst nicht Teil dieses Schemas — laut
  data-model.md (4d) vor dem zweiten Kohorten-Durchgang mit Rechts-/
  Datenschutzberatung zu klären, nicht hier vorwegzunehmen.
