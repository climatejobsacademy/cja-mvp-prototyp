import { gliederungFuer, letztesDatumImNamen, modulFuerDatum, modulStatus, type GliederungsModul } from "@/lib/programm";
import { createClient } from "@/lib/supabase/server";

// Programmseite v8 (docs/design_handoff_programm_v8, SR folgt): die Zeilen
// der Tabelle "module" mit ihrem Zeitraum im eigenen Stundenplan. Im
// Programm EFK-EE ist jede dieser Zeilen eine Woche (siehe
// src/lib/programm.ts, gliederungFuer). Einen Zeitraum gibt es im Schema
// nicht -- er wird aus den Stundenplan-Einträgen abgeleitet (erster bis
// letzter Tag mit Inhalten). Nur lesend, alles über die RLS der lernenden Person.

export type DbModul = {
  id: string;
  name: string;
  /** Position im Programm, 1-basiert (nach module.reihenfolge) */
  nummer: number;
  /** erster/letzter Tag im eigenen Stundenplan; null = nichts geplant */
  von: string | null;
  bis: string | null;
};

type Ctx = { organisationId: string; cohortId: string; enrolmentId: string; programmeId: string };

// PostgREST liefert höchstens 1000 Zeilen je Abfrage; ein Programm über
// 18 Monate kann mehr Stundenplan-Einträge haben.
const SEITE = 1000;

export async function getDbModule(ctx: Ctx): Promise<DbModul[]> {
  const supabase = await createClient();

  const { data: modules } = await supabase
    .from("module")
    .select("id, name, reihenfolge")
    .eq("programme_id", ctx.programmeId)
    .order("reihenfolge", { ascending: true });
  const modulListe = modules ?? [];
  if (modulListe.length === 0) return [];
  const moduleIds = modulListe.map((m) => m.id);

  type Eintrag = { datum: string; course_id: string | null; lesson_id: string | null; live_session_id: string | null; field_job_id: string | null };
  const ladeEintraege = async () => {
    const alle: Eintrag[] = [];
    for (let ab = 0; ; ab += SEITE) {
      const { data } = await supabase
        .from("schedule_entry")
        .select("datum, course_id, lesson_id, live_session_id, field_job_id")
        .eq("organisation_id", ctx.organisationId)
        .or(`cohort_id.eq.${ctx.cohortId},enrolment_id.eq.${ctx.enrolmentId}`)
        .order("datum", { ascending: true })
        .order("id", { ascending: true })
        .range(ab, ab + SEITE - 1);
      alle.push(...(data ?? []));
      if (!data || data.length < SEITE) return alle;
    }
  };

  // Live-Termine und Praxistage ohne Filter: die RLS liefert ohnehin nur die
  // eigenen (live_session_learner_select, field_job_learner_select).
  const [eintraege, { data: courses }, { data: jobTypes }, { data: liveSessions }, { data: jobs }] = await Promise.all([
    ladeEintraege(),
    supabase.from("course").select("id, module_id").in("module_id", moduleIds),
    supabase.from("field_job_type").select("id, module_id").in("module_id", moduleIds),
    supabase.from("live_session").select("id, lesson_id, course_id"),
    supabase.from("field_job").select("id, field_job_type_id"),
  ]);
  const modulVonKurs = new Map((courses ?? []).map((c) => [c.id, c.module_id]));
  const modulVonJobTyp = new Map((jobTypes ?? []).map((t) => [t.id, t.module_id]));
  const liveById = new Map((liveSessions ?? []).map((l) => [l.id, l]));
  const jobTypVonJob = new Map((jobs ?? []).map((j) => [j.id, j.field_job_type_id]));

  const kursIds = [...modulVonKurs.keys()];
  const { data: lessons } = kursIds.length
    ? await supabase.from("lesson").select("id, course_id").in("course_id", kursIds)
    : { data: [] as { id: string; course_id: string }[] };
  const kursVonLektion = new Map((lessons ?? []).map((l) => [l.id, l.course_id]));

  const modulVon = (e: Eintrag): string | null => {
    if (e.field_job_id) {
      const typ = jobTypVonJob.get(e.field_job_id);
      return typ ? (modulVonJobTyp.get(typ) ?? null) : null;
    }
    const live = e.live_session_id ? liveById.get(e.live_session_id) : undefined;
    const kursId = live ? live.course_id : e.course_id;
    const lessonId = live ? live.lesson_id : e.lesson_id;
    const kurs = kursId ?? (lessonId ? kursVonLektion.get(lessonId) : undefined);
    return kurs ? (modulVonKurs.get(kurs) ?? null) : null;
  };

  // Einträge sind nach Datum sortiert: erster Treffer = von, letzter = bis.
  const zeitraum = new Map<string, { von: string; bis: string }>();
  for (const e of eintraege) {
    const modulId = modulVon(e);
    if (!modulId) continue;
    const z = zeitraum.get(modulId);
    if (z) z.bis = e.datum;
    else zeitraum.set(modulId, { von: e.datum, bis: e.datum });
  }

  return modulListe.map((m, i) => ({
    id: m.id,
    name: m.name,
    nummer: i + 1,
    von: zeitraum.get(m.id)?.von ?? null,
    bis: zeitraum.get(m.id)?.bis ?? null,
  }));
}

/** Start und Ende der eigenen Kohorte (cohort_learner_select) -- für "Start … · 18 Monate". */
export async function getKohortenZeitraum(cohortId: string): Promise<{ start: string; ende: string | null } | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("cohort").select("start_datum, end_datum").eq("id", cohortId).maybeSingle();
  return data ? { start: data.start_datum, ende: data.end_datum } : null;
}

/**
 * Module der vorläufigen Gliederung (src/lib/programm.ts) mit den Wochen
 * (Zeilen aus "module"), die über ihr Datum dazugehören. Ohne Gliederung
 * für dieses Programm null -- dann gelten die Module der Datenbank.
 */
export async function getGliederungsModule(
  ctx: Ctx,
  programmName: string
): Promise<(GliederungsModul & { wochenIds: Set<string> })[] | null> {
  const kohorte = await getKohortenZeitraum(ctx.cohortId);
  const gliederung = gliederungFuer(programmName, kohorte?.start ?? null);
  if (!gliederung) return null;
  const wochen = await getDbModule(ctx);
  return gliederung.map((g) => ({
    ...g,
    wochenIds: new Set(
      wochen.filter((w) => modulFuerDatum(gliederung, w.von ?? letztesDatumImNamen(w.name)) === g.nummer).map((w) => w.id)
    ),
  }));
}

/**
 * Aktuelles Modul mit seinen Wochen -- dieselbe Regel wie auf der
 * Programmseite: das Modul der Gliederung, das noch nicht vorbei ist. Ohne
 * Gliederung null (dann gilt die bisherige Regel getAktuellesModul).
 * Behebt "Dein Fortschritt in Modul 3", obwohl Modul 1 läuft (Änderungsliste
 * Home freier Tag, Punkt 6): vorher wurden Wochen als Module gezählt.
 */
export async function getAktuellesGliederungsModul(
  ctx: Ctx,
  programmName: string,
  heute: string
): Promise<{ modul: { id: string; name: string; nummer: number }; wochenIds: Set<string> } | null> {
  const modulListe = await getGliederungsModule(ctx, programmName);
  if (!modulListe) return null;
  const index = modulStatus(modulListe, heute).indexOf("aktuell");
  if (index === -1) return null;
  const g = modulListe[index];
  return { modul: { id: String(g.nummer), name: g.name, nummer: g.nummer }, wochenIds: g.wochenIds };
}
