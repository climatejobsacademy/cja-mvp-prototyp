# Academy Platform — project rules

## What we are building
A qualification platform for climate-trade employers. Learners in a programme
learn in three contexts — live sessions, self-paced units, app-guided field jobs —
and all three produce competency evidence in one profile per learner.
Spec: /docs/requirements.md (SR-xx), /docs/data-model.md, /docs/access-matrix.md,
/docs/design-specifications.md. Every feature traces to an SR-xx. No SR → ask
before building.

## Stack
- Next.js (App Router), TypeScript strict, one responsive app;
  field-workflow routes are mobile-first and installable (PWA)
- shadcn/ui + Tailwind for components; design tokens and flows in
  /docs/design-specifications.md — respect them, don't invent new ones
- Supabase: Postgres, Auth (magic link), Storage, pgvector. Region EU (Ireland).
- Environments: dev and prod. Never run anything against prod unless explicitly told.

## Non-negotiable rules
1. Multi-tenancy: every employer-owned table has organization_id. No exceptions.
2. RLS is enabled on every table; policies ship in the same migration as the table.
3. Access rules come from /docs/access-matrix.md. Never widen access or invent roles.
4. Schema changes only via /supabase/migrations. Never edit schema in the dashboard.
5. Every policy change has an RLS test in /supabase/tests.
6. The competency profile is a view over competency_evidence. No table stores it,
   no UI edits it. Evidence rows are written only by: unit completion, confirmed
   attendance, approved verification.
7. Confirmed attendance and verification rows are immutable (enforced by trigger).
8. Field guidance answers only from knowledge_chunk rows of verified sources and
   returns the source ids with every answer. Nothing found → fixed fallback message.
   Never answer installation questions from general model knowledge.
9. No personal data in logs. Media never leaves Supabase Storage except for the
   LLM call needed for drafting, and only for that call.
10. No secrets in code.

## Conventions
- snake_case, English, singular table names (field_job, competency_evidence)
- Every table: id uuid, created_at, updated_at; employer-owned: organization_id
- Enums for status fields; no free-text status
- Curriculum tables are AfCJ-owned: organization_id references the AfCJ org
- One folder per screen under /app; shared components under /components
- Async work started inside `useEffect` (fetch calls, subscriptions, etc.) must be
  cancelled via `AbortController` in the effect's cleanup function, not just a
  boolean flag. React StrictMode double-invokes effects in dev; without a real
  abort, the stale first run keeps doing full network/CPU work in parallel with
  the second, and an unresolved stale promise can look exactly like a hang.

## Way of working
- One SR or one screen per PR. Small.
- Before implementing: write a 5-line plan listing tables, policies and screens touched.
- Definition of Done: /docs/definition-of-done.md
- Product decision unclear → stop and ask. Do not assume.
- Stacked PR (a branch built on another still-open PR's branch): before the final
  merge, run `git merge origin/main` (or rebase) and wait for a fresh CI run
  against that state. A green check on the original PR does not prove the
  post-merge state is correct, and retargeting a PR's base does not by itself
  trigger a new CI run.

## First build task (Schritt 4e Handover)
Read /docs/data-model.md and /docs/access-matrix.md. Produce (1) an ER diagram in
Mermaid, (2) migration files creating every entity marked "Prototype: yes" with the
listed attributes, and (3) RLS policies implementing the access matrix exactly. Do
not add entities, roles or access beyond what's listed; if you believe something is
missing, list it as a question instead of building it. Apply the translation rules
in /docs/data-model.md.
