# Traceability-Tabelle — AfCJ MVP-Prototyp

Quelle: Definition of Done (`definition-of-done.md`), Punkt „Die Traceability-Tabelle ist aktualisiert", und Playbook Schritt 6a/6d. Bildet ab, welcher PR welche SR-xx (aus `requirements.md`) abdeckt. Stand 2026-09-11 — erster Entwurf, siehe Hinweis unten.

Wichtiger Vorbehalt: Kein PR ist bisher gemergt (PR #1 und PR #2 warten beide auf Maltes Review). Der Status hier beschreibt also, was in offenen PRs vorbereitet ist, nicht was in `main` bereits verifiziert läuft. Die Zuordnung SR → PR ist für die unten gelisteten Zeilen aus dem bisherigen Gesprächsverlauf begründet (Migrationen, RLS-Tests, Access-Matrix-Zeilen); für alle anderen SRs gibt es noch keine belastbare Grundlage für eine Zuordnung, ohne den tatsächlichen Migrations-Diff einzusehen — dort steht bewusst "offen", nicht geraten.

## Bereits mit einem PR verknüpft (Build now)

| SR | Kurzform | PR | Status | Beleg |
|---|---|---|---|---|
| SR-02 | Learner reicht Selbstauskunft (field_capture) ein | PR #1 | Schema + Zugriffsregel vorbereitet, Review ausstehend | Access-Matrix-Zeile „Field capture — Rohinhalt/Antworten", RLS-Test 002_learner_own_captures.test.sql (grün in CI) |
| SR-03 | Nur Admin/Instructor darf submitted → verified/rejected setzen | PR #1 | Schema + Zugriffsregel vorbereitet, Review ausstehend | Access-Matrix-Zeile „Verification" |
| SR-06 | Keine organization_id-übergreifenden Datensätze | PR #1 (Basis bereits auf main aus dem Erstentwurf) | RLS-Test grün in CI (001_employer_isolation.test.sql), noch nicht gegen dev verifiziert (dev-Merge steht aus) | CI-Lauf PR #2, `All tests successful` |
| SR-07 | Bestätigte Anwesenheit/Verifizierung unveränderlich | PR #1 | Trigger-Logik entschieden (fn_derive_field_job_status u.a.), Review ausstehend | Team-Entscheidung 2026-09-11 zum Status-Herleitungs-Trigger |
| SR-08 | Feld-Workflow-Writes klein und atomar | PR #1 | Schema (field_capture als atomarer Write) vorbereitet | Notion-Entscheidungslog 2026-09-09 |
| SR-09 | Binärer Nachweisstatus je Teilschritt-Typ | teilweise PR #1 (Praxis-Teilschritt), Rest ggf. schon im Erstentwurf auf main | Nicht abschließend geprüft — Content-/Live-Anteil dieses SR liegt evtl. schon im Erstentwurf, aber ungetestet | — |
| SR-25 | Learner sieht Nachweistyp + nächsten Schritt im Feld | PR #1 (Schema), UI fehlt noch | Schema vorbereitet, Screen existiert noch nicht in der Next.js-App | Bestätigungs-Screen „erledigt/Problem" laut PR-#1-Beschreibung neu, App insgesamt noch nicht ans neue Schema angepasst |

## Noch offen, kein PR zugeordnet

Alle übrigen SRs aus `requirements.md` (Build now: SR-01, 04, 05, 12–17, 19–23, 31, 48, 50–52, 55, 57; komplett Build next und Later): noch nicht begonnen bzw. keine gesicherte Zuordnung zu einem bestehenden PR möglich. Wird ergänzt, sobald ein PR sie explizit benennt — laut `CLAUDE.md` muss jeder PR „seine SR-xx" nennen, das macht diese Tabelle ab jetzt weitgehend selbstaktualisierend, wenn ihr das im PR-Text konsequent einhaltet.

Randnotiz: PR #2 (CI-Pipeline) ist reine Infrastruktur ohne eigenes SR — passt zur Regel „jedes Feature verweist auf ein SR", da CI kein Feature für Learner/Admin ist, sondern Werkzeug für Schritt 6. Nicht als Lücke werten.

## Wöchentliches Update

Bei jedem PR-Review (Definition of Done, Punkt 5–6): Zeile für die im PR genannte(n) SR-xx ergänzen oder aktualisieren, Status auf „gemerged, RLS grün gegen dev" heben, sobald das zutrifft.
