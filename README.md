# cja-mvp-prototyp

Supabase-Schema + RLS-Policies + Next.js-App für die Qualifizierungsplattform
Elektrofachkraft Erneuerbare Energien (Prototyp), abgeleitet aus dem
Notion-Playbook "MVP April 2027: Product Development Playbook", Schritt 4b–4e.

Die separaten UX-Klickdummys (React/Vite, gemockte Daten, VC-Pivot) liegen im
Repo `cja-ux-exploration` und werden nicht verändert.

## Struktur

```
docs/
  data-model.md              Quelle: Entitäten, Attribute, Entscheidungen (4b/4d)
  access-matrix.md           Quelle: Rollen × Entität-Zugriffsmatrix (4c)
  design-specifications.md   Quelle: Design-System-Fundament + kritische User-Flows (4e-Ergänzung)
  er-diagram.md              Generiertes ER-Diagramm (Mermaid), aus data-model.md/access-matrix.md
  open-questions.md          Stellen, an denen die Quelldokumente keinen eindeutigen
                              Wert vorgeben oder sich widersprechen — mit der getroffenen Annahme
  review-checklist-notes.md  Beantwortung der Review-Checkliste aus data-model.md (4e)

supabase/
  migrations/                Schema (0001–0007) + RLS-Policies (0008–0009), in Reihenfolge
  tests/database/            pgTAP-Tests: Employer-Isolation, Learner-Zugriff auf eigene Captures
  config.toml                Minimal-Konfiguration für die lokale Supabase-CLI

src/
  app/
    login/, auth/callback/    Magic-Link-Login (siehe data-model.md 4d, SR-16)
    (learner)/                Alles hinter dem Auth-Guard im Layout:
      schedule/                 Learner Day View — Tag/Woche/Programm (design-specifications.md 2.2)
      praxistag/[fieldJobId]/   Praxistag-Flow — Vorbereitung → Bestätigung → Reflexion → Abschluss (2.1)
      kompetenzen/              Kompetenz-Dashboard (2.3)
      content/[lessonId]/       Content Library + Lektionsansicht (2.4)
  components/ui/              shadcn/ui-Komponenten (Base UI + Tailwind v4)
  components/status-badge.tsx  Status nie nur über Farbe (WCAG 1.4.1) — Icon+Label-Badges
  lib/database.types.ts       Handgeschrieben (kein deploytes Projekt zum Generieren, siehe unten)
  lib/queries/                Server-seitige, RLS-respektierende Datenzugriffe je Screen
  lib/supabase/               Browser-/Server-/Middleware-Clients (@supabase/ssr)

Admin-Oberfläche ist nicht Teil dieses Repos — design-specifications.md
Abschnitt 3 stellt sie bewusst zurück (Fokus auf Learner-Flows im Prototyp).
```

## Lokal starten

**Datenbank** — benötigt die [Supabase CLI](https://supabase.com/docs/guides/cli) und Docker:

```bash
supabase start      # startet lokalen Postgres + Auth + Studio, spielt supabase/migrations/ ein
supabase test db    # führt die pgTAP-Tests in supabase/tests/database/ aus
```

`supabase db reset` spielt alle Migrationen erneut von vorn ein.

**App:**

```bash
npm install
cp .env.example .env.local   # mit den Werten aus `supabase start` (lokal) oder einem echten Projekt befüllen
npm run dev
```

Ohne gültige `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` startet
die App nicht sinnvoll — es gibt bewusst keinen Mock-Modus, die App spricht
immer echtes Supabase mit echter RLS.

## Ausgangslage und offene Punkte

- Migrationen und RLS setzen ausschließlich Entitäten/Regeln um, die in
  `docs/data-model.md`/`docs/access-matrix.md` mit "Prototyp: Ja" markiert sind.
  Die App setzt ausschließlich die vier in `docs/design-specifications.md`
  priorisierten Learner-Flows um. Nichts wurde darüber hinaus ergänzt — Lücken
  stehen in `docs/open-questions.md`.
- Die Zugriffsmatrix kennt fünf Rollen, das Prototyp-Schema nur zwei
  (`learner`, `afcj_admin` in `role_assignment.rolle`) — die anderen drei
  (Instructor/Team Lead, AfCJ trainer, Manager) existieren laut data-model.md im
  Prototyp noch nicht als eigene Personen. RLS-Policies decken deshalb nur die
  zwei existierenden Rollen ab (siehe `docs/open-questions.md`, Q-FUTURE-ROLES).
- Beim Bauen des Praxistag-Flows kam ein echter Widerspruch zwischen
  `access-matrix.md` und `design-specifications.md` zum Vorschein (Learner
  "write —" auf Field job vs. ein Learner-Bestätigungs-Button, der genau das
  braucht) — aufgelöst mit einer engstmöglichen Zusatz-Policy, siehe
  `docs/open-questions.md`, Q-FIELD-JOB-LEARNER-CONFIRM.
- Löschprotokoll (DSGVO/AZAV) ist bewusst nicht Teil dieses Schemas — laut
  data-model.md (4d) vor dem zweiten Kohorten-Durchgang mit Rechts-/
  Datenschutzberatung zu klären, nicht hier vorwegzunehmen.
- `src/lib/database.types.ts` ist von Hand geschrieben, nicht generiert — es
  gibt noch kein deploytes Supabase-Projekt gegen das `supabase gen types
  typescript` laufen könnte. Sobald eines existiert: generieren und den
  Hinweiskommentar am Dateianfang entfernen.
- Brand-Assets (Logo, Icons, Key Visuals) sind nicht im Repo — laut
  `design-specifications.md` explizit "Schritt 5", nicht Teil dieses Standes.
  Aktuell nutzt die App nur Lucide-Icons + die Marken-Farb-/Font-Tokens.
- Nicht gebaut, weil im Schema nicht verankert (siehe `docs/open-questions.md`):
  Datei-/Medien-Ausgabe aus `file_asset` ohne Storage-URL-Auflösung
  (Repository-Lektionen zeigen nur direkt hinterlegte URLs), SCORM-Player
  (Platzhalter mit manuellem "Abschließen"-Button), Praxistag-Bild/Icon.

## Gotcha für zukünftige Arbeit an `database.types.ts`

`@supabase/postgrest-js` (in der hier installierten Version) löst die
Select-Spalten über eine Kette bedingter Typen auf, die bei einem Row-Typ als
rohe Intersection (`Timestamps & {...}`) still zu `never` kollabiert — jede
Abfrage bekäme dann `never`-typisierte Daten, ohne dass ein Fehler an der
Definitionsstelle erscheint. Deshalb ist jeder Row-Typ in `Flatten<...>`
gewickelt (siehe Kommentar am Dateianfang von `database.types.ts`). Neue
Tabellen/Views nach demselben Muster ergänzen, sonst bricht die Typinferenz
wieder still.
