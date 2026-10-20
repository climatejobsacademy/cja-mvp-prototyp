-- scripts/sql/lektion_klammer_entfernen.sql
-- Entfernt die Themen-Klammer aus lesson.name, wenn das Thema seit 0029 in
-- lesson.thema steht (SR-13, Datenlücke Nr. 4, Entscheidung 2026-10-13).
-- Beispiel: "Grundlagen der Elektrotechnik (Der Transistor / Die Dioden)"
-- mit thema "Der Transistor / Die Dioden" -> "Grundlagen der Elektrotechnik".
--
-- Wann: NICHT vor der Demo am 15.10.2026. Danach abends auf Staging, im
-- Release auf Production -- jeweils erst nach Migration 0029 und mit
-- Freigabe. Die App zeigt den Titel schon vorher ohne Klammer an
-- (src/lib/lektion-titel.ts, gleiche Regel); nur demo liest lesson.name roh.
--
-- Nur Lektionen, deren erste Klammer genau lesson.thema enthält. Bleibt
-- ohne Klammer kein Titel übrig, bleibt der Name unverändert.
--
-- Standard ist der Probelauf: am Ende wird absichtlich ein Fehler ausgelöst,
-- dadurch wird alles zurückgerollt (ROLLBACK), und die Meldung zeigt Anzahl
-- und Beispiele. Erst wenn das passt, p_probelauf auf false setzen und
-- erneut ausführen. Läuft im Supabase-Dashboard (SQL Editor) oder per psql.
-- Lektionsnamen sind keine Personendaten.

do $$
declare
  -- ===================== EINGABEN =====================
  p_probelauf boolean := true;  -- true = ROLLBACK, false = speichern
  -- ====================================================

  v_anzahl     integer;
  v_beispiele  text;
  v_rest       integer;
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'lesson' and column_name = 'thema'
  ) then
    raise exception 'Abbruch: lesson.thema fehlt -- zuerst Migration 0029 anwenden.';
  end if;

  with neu as (
    select l.id,
           l.name as vorher,
           btrim(regexp_replace(regexp_replace(l.name, '\s*\([^()]+\)\s*', ' '), '\s+', ' ', 'g')) as nachher
      from lesson l
     where l.thema is not null
       and l.name ~ '\([^()]+\)'
       and btrim(substring(l.name from '\(([^()]+)\)')) = btrim(l.thema)
  ),
  geaendert as (
    update lesson
       set name = neu.nachher
      from neu
     where lesson.id = neu.id
       and neu.nachher <> ''
    returning neu.vorher, neu.nachher
  )
  select count(*),
         string_agg(format('"%s" -> "%s"', vorher, nachher), E'\n' order by vorher)
    into v_anzahl, v_beispiele
    from geaendert;

  -- Kontrolle: Lektionen mit thema, deren Name die Klammer noch enthält.
  select count(*) into v_rest
    from lesson l
   where l.thema is not null
     and position('(' || l.thema || ')' in l.name) > 0;

  if p_probelauf then
    raise exception E'PROBELAUF ok, nichts gespeichert: % Lektionsnamen würden geändert, % behielten die Klammer.\n%\nZum Speichern p_probelauf := false setzen.',
      v_anzahl, v_rest, coalesce(v_beispiele, '(keine)');
  end if;

  raise notice E'Gespeichert: % Lektionsnamen geändert, % mit Klammer übrig.\n%',
    v_anzahl, v_rest, coalesce(v_beispiele, '(keine)');
end $$;
