-- 046_alte_kompetenz_spalten.test.sql
-- Migration 0075: competency.quelle und competency_step.competency_id gibt es
-- nicht mehr; die Zuordnungen laufen über competency_programme und
-- competency_competency_step.
--
-- Ausführen mit: supabase test db
begin;

create extension if not exists pgtap schema extensions;

select plan(4);

select hasnt_column('public', 'competency', 'quelle', 'competency.quelle ist entfernt (0075)');
select hasnt_column('public', 'competency_step', 'competency_id', 'competency_step.competency_id ist entfernt (0075)');
select has_table('public', 'competency_programme', 'Zuordnung Kompetenz -> Programm bleibt (0020)');
select has_table('public', 'competency_competency_step', 'Zuordnung Kompetenz -> Teilschritt bleibt');

select * from finish();
rollback;
