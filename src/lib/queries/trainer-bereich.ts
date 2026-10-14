// Bereich für Trainer:innen (SR-81, Paket G2): wer darf hinein, und welche
// Termine der eigenen Kohorten liegen an einem Tag. Gelesen wird nur über die
// Policies aus 0032 (Kohorten mit mindestens einem eigenen Termin, E3);
// Namen der Lernenden über fn_trainer_teilnehmende(), person bleibt zu.

import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { lektionTitel } from "@/lib/lektion-titel";
import { type AktuelleAnwesenheit, type AnwesenheitStatus, trainerZugang } from "@/lib/trainer-tag";

export type CurrentTrainer = { personId: string; name: string; rufname: string; email: string };

export const requireCurrentTrainer = cache(async (): Promise<CurrentTrainer> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: person }, { data: rollen }, { data: einschreibung }] = await Promise.all([
    supabase.from("person").select("id, name, rufname").eq("id", user.id).maybeSingle(),
    supabase.from("role_assignment").select("rolle").eq("person_id", user.id).eq("rolle", "trainer").limit(1),
    // nur eigene Einschreibungen: Trainer:innen lesen per Policy auch die der Kohorte
    supabase.from("enrolment").select("id").eq("learner_id", user.id).eq("status", "aktiv").limit(1),
  ]);
  if (!person) redirect("/login?error=kein-profil");

  const zugang = trainerZugang({
    istTrainer: (rollen ?? []).length > 0,
    hatAktiveEinschreibung: (einschreibung ?? []).length > 0,
  });
  if (!zugang.erlaubt) redirect(zugang.ziel);

  return { personId: person.id, name: person.name, rufname: person.rufname, email: user.email ?? "" };
});

export type Teilnehmende = { personId: string; name: string; anwesenheit: AktuelleAnwesenheit };

export type LiveTermin = {
  id: string;
  titel: string;
  thema: string | null;
  start: string;
  ende: string;
  kohorten: string[];
  /** live_session.trainer_id ist die eingeloggte Person */
  eigener: boolean;
  teilnehmende: Teilnehmende[];
};

export type PraxisTermin = {
  /** field_job_type_id + Uhrzeit */
  id: string;
  titel: string;
  start: string | null;
  ende: string | null;
  kohorten: string[];
  eigener: boolean;
  lernende: { personId: string; name: string; durchgefuehrt: boolean }[];
};

export type TrainerTag = { live: LiveTermin[]; praxis: PraxisTermin[] };

const nachZeit = <T extends { start: string | null; titel: string }>(a: T, b: T) =>
  (a.start ?? "").localeCompare(b.start ?? "") || a.titel.localeCompare(b.titel, "de");

export async function getTrainerTag(personId: string, datum: string): Promise<TrainerTag> {
  const supabase = await createClient();

  const [{ data: eintraege }, { data: teilnehmendeRoh }] = await Promise.all([
    supabase
      .from("schedule_entry")
      .select("art, cohort_id, enrolment_id, live_session_id, field_job_id")
      .eq("datum", datum)
      .in("art", ["live", "feld"]),
    supabase.rpc("fn_trainer_teilnehmende"),
  ]);
  const teilnehmende = teilnehmendeRoh ?? [];
  const zeilen = eintraege ?? [];

  const kohortenIds = [...new Set(teilnehmende.map((t) => t.cohort_id))];
  const { data: kohorten } = kohortenIds.length
    ? await supabase.from("cohort").select("id, name").in("id", kohortenIds)
    : { data: [] as { id: string; name: string }[] };
  const kohortenName = new Map((kohorten ?? []).map((k) => [k.id, k.name]));
  const kohorteVonEnrolment = new Map(teilnehmende.map((t) => [t.enrolment_id, t.cohort_id]));

  // ---------- Live ----------
  const liveZeilen = zeilen.filter((z) => z.live_session_id);
  const sessionIds = [...new Set(liveZeilen.map((z) => z.live_session_id as string))];
  const [{ data: sessions }, { data: anwesenheit }] = sessionIds.length
    ? await Promise.all([
        supabase.from("live_session").select("id, lesson_id, course_id, start, ende, trainer_id").in("id", sessionIds),
        supabase.from("attendance_aktuell").select("id, learner_id, live_session_id, status").in("live_session_id", sessionIds),
      ])
    : [{ data: [] }, { data: [] }];

  const lessonIds = [...new Set((sessions ?? []).map((s) => s.lesson_id).filter((x): x is string => !!x))];
  const courseIds = [...new Set((sessions ?? []).map((s) => s.course_id).filter((x): x is string => !!x))];
  const [{ data: lessons }, { data: courses }] = await Promise.all([
    lessonIds.length
      ? supabase.from("lesson").select("id, name, thema").in("id", lessonIds)
      : Promise.resolve({ data: [] as { id: string; name: string; thema: string | null }[] }),
    courseIds.length
      ? supabase.from("course").select("id, name").in("id", courseIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const live: LiveTermin[] = (sessions ?? []).map((s) => {
    const zuSession = liveZeilen.filter((z) => z.live_session_id === s.id);
    const kohortenDesTermins = new Set(zuSession.map((z) => z.cohort_id).filter((x): x is string => !!x));
    const enrolmentsDesTermins = new Set(zuSession.map((z) => z.enrolment_id).filter((x): x is string => !!x));
    for (const e of enrolmentsDesTermins) {
      const k = kohorteVonEnrolment.get(e);
      if (k) kohortenDesTermins.add(k);
    }
    // Kohortenweiter Eintrag: alle der Kohorte; Eintrag je Einschreibung: nur diese Person.
    const personen = teilnehmende.filter(
      (t) => zuSession.some((z) => z.cohort_id === t.cohort_id) || enrolmentsDesTermins.has(t.enrolment_id)
    );
    const lesson = s.lesson_id ? (lessons ?? []).find((l) => l.id === s.lesson_id) : null;
    const titel = lesson ? lektionTitel(lesson.name, lesson.thema) : null;
    return {
      id: s.id,
      titel: titel?.titel ?? (courses ?? []).find((c) => c.id === s.course_id)?.name ?? "Live-Termin",
      thema: titel?.thema ?? null,
      start: s.start,
      ende: s.ende,
      kohorten: [...kohortenDesTermins].map((k) => kohortenName.get(k) ?? "").filter(Boolean),
      eigener: s.trainer_id === personId,
      teilnehmende: [...new Map(personen.map((p) => [p.person_id, p])).values()]
        .map((p) => {
          const a = (anwesenheit ?? []).find((x) => x.live_session_id === s.id && x.learner_id === p.person_id);
          return {
            personId: p.person_id,
            name: p.name,
            anwesenheit: a ? { id: a.id, status: a.status as AnwesenheitStatus } : null,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name, "de")),
    };
  });

  // ---------- Praxis ----------
  const feldZeilen = zeilen.filter((z) => z.field_job_id);
  const jobIds = feldZeilen.map((z) => z.field_job_id as string);
  const { data: jobs } = jobIds.length
    ? await supabase.from("field_job").select("id, learner_id, field_job_type_id, start, ende, status, instructor_id").in("id", jobIds)
    : { data: [] as { id: string; learner_id: string; field_job_type_id: string; start: string | null; ende: string | null; status: string; instructor_id: string | null }[] };
  const typIds = [...new Set((jobs ?? []).map((j) => j.field_job_type_id))];
  const { data: typen } = typIds.length
    ? await supabase.from("field_job_type").select("id, titel").in("id", typIds)
    : { data: [] as { id: string; titel: string }[] };

  const praxisMap = new Map<string, PraxisTermin>();
  for (const j of jobs ?? []) {
    const schluessel = `${j.field_job_type_id}|${j.start ?? ""}|${j.ende ?? ""}`;
    const enrolment = feldZeilen.find((z) => z.field_job_id === j.id)?.enrolment_id;
    const kohorte = enrolment ? kohorteVonEnrolment.get(enrolment) : undefined;
    const person = teilnehmende.find((t) => t.person_id === j.learner_id);
    const termin = praxisMap.get(schluessel) ?? {
      id: schluessel,
      titel: (typen ?? []).find((t) => t.id === j.field_job_type_id)?.titel ?? "Praxisaufgabe",
      start: j.start,
      ende: j.ende,
      kohorten: [],
      eigener: false,
      lernende: [],
    };
    if (kohorte && !termin.kohorten.includes(kohortenName.get(kohorte) ?? "")) termin.kohorten.push(kohortenName.get(kohorte) ?? "");
    termin.eigener ||= j.instructor_id === personId;
    termin.lernende.push({ personId: j.learner_id, name: person?.name ?? "Lernende:r", durchgefuehrt: j.status === "durchgeführt" });
    praxisMap.set(schluessel, termin);
  }
  const praxis = [...praxisMap.values()].map((p) => ({
    ...p,
    kohorten: p.kohorten.filter(Boolean),
    lernende: p.lernende.sort((a, b) => a.name.localeCompare(b.name, "de")),
  }));

  return { live: live.sort(nachZeit), praxis: praxis.sort(nachZeit) };
}
