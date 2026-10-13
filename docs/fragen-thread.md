# Fragen-Thread pro Lektion

Stand 2026-10-07, SR-74 (Thread) und SR-75 (Moderation). Schema: `supabase/migrations/0024_lektion_beitrag.sql` (PR #74), Anzeige: PR B. Entscheidung zur Sichtbarkeit: `decisions.md`, Eintrag 2026-10-07 „Fragen-Thread gehört der Kohorte, Ausnahme von SR-06“.

## Was gilt

- Ein Thread gehört zu einer Lektion und einer Kohorte. Er erscheint unter der Lektion nur, wenn `lesson.chat_aktiv` gesetzt ist und die Person lesen darf (Lektion veröffentlicht, Einschreibung in dieser Kohorte aktiv oder abgeschlossen).
- Schreiben nur mit Einschreibung `aktiv`. Nur Text und Smileys, 1 bis 1000 Zeichen, eine Antwortebene, kein Bearbeiten.
- Löschen: eigene Beiträge durch die Autor:in, alle Beiträge der Kohorte durch Moderierende (`kohorte_moderation`) und AfCJ admin. Gelöschte Beiträge erscheinen als „Beitrag gelöscht“, Antworten bleiben.
- Kein Echtzeit (Button „Aktualisieren“), keine Benachrichtigungen, keine Anhänge, kein Ausblenden, kein Rate-Limit.
- Hat eine Person mehrere passende Einschreibungen, zeigt die Seite nur einen Thread: zuerst die Kohorte des aktuellen Kontexts (älteste aktive Einschreibung), sonst aktive vor abgeschlossenen.
- Zeichen werden wie in der Datenbank gezählt (Unicode-Codepoints): 🙂 zählt 1, 👍🏽 und 🇩🇪 zählen 2, 👨‍👩‍👧 zählt 5.

## Thread einschalten, Moderation eintragen

Immer zuerst auf Staging (Irland, `keijrwvegmwgpvprpoxa`), Production (Frankfurt, `vqfnmkcfjsudsujiuoqm`) erst nach Freigabe. Vor dem Livegang auf Production muss die Datenschutzerklärung ergänzt sein.

1. **IDs heraussuchen**: Table Editor → `lesson` (Lektions-ID); für die Moderation `person` (ID der Person) und `cohort` (ID der Kohorte).
2. **SQL-Vorlage ausführen**: Inhalt von `scripts/sql/thread_aktivieren.sql` in den SQL Editor kopieren, im Block „EINGABEN“ die Lektions-ID eintragen und `p_chat_aktiv` setzen (true = an, false = aus). Optional `p_moderation_person` und `p_moderation_kohorte` zusammen setzen.
   - Der erste Lauf ist ein **Probelauf**: Er endet absichtlich mit „PROBELAUF ok, nichts gespeichert …“ und zeigt Lektion, Status, alten und neuen Wert sowie die Moderation.
   - Passt alles: `p_probelauf := false` setzen und noch einmal ausführen.
3. **Prüfen**: Table Editor → `lesson.chat_aktiv`, ggf. `kohorte_moderation`.

Die Vorlage bricht ab, wenn Lektion, Person oder Kohorte fehlen, nur einer der beiden Moderationswerte gesetzt ist oder die Kohorte nicht zum Programm der Lektion gehört. Eine Moderation wird aus der Vorlage nur eingetragen, nicht entfernt; zum Entfernen die Zeile in `kohorte_moderation` löschen.

## Hinweise

- Beitragsinhalte und Namen werden nicht geloggt (CLAUDE.md Regel 9); Fehlermeldungen in der App enthalten keine Inhalte.
- Bei Account-Löschung werden die Beiträge der Person anonymisiert (Text und Anzeigename leer), Antworten anderer bleiben.
