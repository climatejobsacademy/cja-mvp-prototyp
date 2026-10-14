// Praxisberichte für Trainer:innen (SR-82, Paket G3). Gelesen wird nur über
// die Policies aus 0032 (Kohorten mit mindestens einem eigenen Termin, E3):
// field_capture, field_capture_antwort, field_capture_step_mapping,
// field_job, verification. Namen über fn_trainer_teilnehmende(), person
// bleibt zu. Bericht = Selbstauskunft der Phase "abschluss".

import { createClient } from "@/lib/supabase/server";
import { berichtStand, sortiereBerichte, type AktuellePruefung, type BerichtStand, type Entscheidung } from "@/lib/praxisbericht";

export type BerichtZeile = {
  id: string;
  name: string;
  titel: string;
  datum: string;
  eingereichtAm: string;
  stand: BerichtStand;
  geprueftAm: string | null;
};

export type Pruefung = {
  id: string;
  entscheidung: Entscheidung;
  kommentar: string | null;
  am: string;
  vonMir: boolean;
  /** durch einen späteren Eintrag korrigiert */
  storniert: boolean;
};

export type BerichtDetail = {
  id: string;
  name: string;
  titel: string;
  datum: string;
  standort: string | null;
  eingereichtAm: string;
  ergebnis: "erledigt" | "problem" | null;
  problemBeschreibung: string | null;
  text: string | null;
  antworten: { frage: string; antwort: string }[];
  teilschritte: string[];
  aktuell: AktuellePruefung;
  verlauf: Pruefung[];
};

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function namen(supabase: Supabase): Promise<Map<string, string>> {
  const { data } = await supabase.rpc("fn_trainer_teilnehmende");
  return new Map((data ?? []).map((t) => [t.person_id, t.name]));
}

/** Alle Berichte der eigenen Kohorten, offene zuerst. */
export async function getPraxisberichte(): Promise<BerichtZeile[]> {
  const supabase = await createClient();
  const [{ data: captures }, personen] = await Promise.all([
    supabase.from("field_capture").select("id, learner_id, field_job_id, eingereicht_am").eq("phase", "abschluss"),
    namen(supabase),
  ]);
  const liste = (captures ?? []).filter((c) => personen.has(c.learner_id));
  if (!liste.length) return [];

  const [{ data: jobs }, { data: pruefungen }] = await Promise.all([
    supabase.from("field_job").select("id, datum, field_job_type_id").in("id", liste.map((c) => c.field_job_id)),
    supabase.from("verification_aktuell").select("id, field_capture_id, entscheidung, verifiziert_am").in("field_capture_id", liste.map((c) => c.id)),
  ]);
  const typIds = [...new Set((jobs ?? []).map((j) => j.field_job_type_id))];
  const { data: typen } = typIds.length
    ? await supabase.from("field_job_type").select("id, titel").in("id", typIds)
    : { data: [] as { id: string; titel: string }[] };

  return sortiereBerichte(
    liste.map((c) => {
      const job = (jobs ?? []).find((j) => j.id === c.field_job_id);
      const p = (pruefungen ?? []).find((v) => v.field_capture_id === c.id);
      return {
        id: c.id,
        name: personen.get(c.learner_id) ?? "Lernende:r",
        titel: (typen ?? []).find((t) => t.id === job?.field_job_type_id)?.titel ?? "Praxisaufgabe",
        datum: job?.datum ?? "",
        eingereichtAm: c.eingereicht_am,
        stand: berichtStand(p ? { id: p.id, entscheidung: p.entscheidung as Entscheidung } : null),
        geprueftAm: p?.verifiziert_am ?? null,
      };
    })
  );
}

/** Ein Bericht mit Antworten, Teilschritten und Verlauf; null = nicht sichtbar. */
export async function getPraxisbericht(captureId: string, personId: string): Promise<BerichtDetail | null> {
  const supabase = await createClient();
  const { data: capture } = await supabase
    .from("field_capture")
    .select("id, learner_id, field_job_id, text, eingereicht_am, phase")
    .eq("id", captureId)
    .maybeSingle();
  if (!capture || capture.phase !== "abschluss") return null;

  const personen = await namen(supabase);
  if (!personen.has(capture.learner_id)) return null;

  const [{ data: job }, { data: antworten }, { data: schritte }, { data: verlauf }] = await Promise.all([
    supabase.from("field_job").select("datum, standort, ergebnis, problem_beschreibung, field_job_type_id").eq("id", capture.field_job_id).maybeSingle(),
    supabase.from("field_capture_antwort").select("field_job_type_frage_id, gewaehlte_option").eq("field_capture_id", captureId),
    supabase.from("field_capture_step_mapping").select("competency_step_id").eq("field_capture_id", captureId),
    supabase
      .from("verification")
      .select("id, entscheidung, kommentar, verifiziert_am, verifiziert_von, korrigiert_id")
      .eq("field_capture_id", captureId)
      .order("verifiziert_am", { ascending: true }),
  ]);

  const frageIds = (antworten ?? []).map((a) => a.field_job_type_frage_id);
  const schrittIds = (schritte ?? []).map((s) => s.competency_step_id);
  const [{ data: typ }, { data: fragen }, { data: stepNamen }] = await Promise.all([
    job
      ? supabase.from("field_job_type").select("titel").eq("id", job.field_job_type_id).maybeSingle()
      : Promise.resolve({ data: null }),
    frageIds.length
      ? supabase.from("field_job_type_frage").select("id, frage_text, reihenfolge").in("id", frageIds)
      : Promise.resolve({ data: [] as { id: string; frage_text: string; reihenfolge: number }[] }),
    schrittIds.length
      ? supabase.from("competency_step").select("id, name").in("id", schrittIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const korrigierte = new Set((verlauf ?? []).map((v) => v.korrigiert_id).filter(Boolean));
  const eintraege: Pruefung[] = (verlauf ?? []).map((v) => ({
    id: v.id,
    entscheidung: v.entscheidung as Entscheidung,
    kommentar: v.kommentar,
    am: v.verifiziert_am,
    vonMir: v.verifiziert_von === personId,
    storniert: korrigierte.has(v.id),
  }));
  const aktuell = eintraege.find((e) => !e.storniert) ?? null;

  return {
    id: capture.id,
    name: personen.get(capture.learner_id) ?? "Lernende:r",
    titel: typ?.titel ?? "Praxisaufgabe",
    datum: job?.datum ?? "",
    standort: job?.standort ?? null,
    eingereichtAm: capture.eingereicht_am,
    ergebnis: (job?.ergebnis as "erledigt" | "problem" | null) ?? null,
    problemBeschreibung: job?.problem_beschreibung ?? null,
    text: capture.text,
    antworten: (antworten ?? [])
      .map((a) => {
        const f = (fragen ?? []).find((x) => x.id === a.field_job_type_frage_id);
        return { frage: f?.frage_text ?? "Frage", antwort: a.gewaehlte_option, reihenfolge: f?.reihenfolge ?? 0 };
      })
      .sort((a, b) => a.reihenfolge - b.reihenfolge)
      .map(({ frage, antwort }) => ({ frage, antwort })),
    teilschritte: (stepNamen ?? []).map((s) => s.name).sort((a, b) => a.localeCompare(b, "de")),
    aktuell: aktuell ? { id: aktuell.id, entscheidung: aktuell.entscheidung } : null,
    verlauf: eintraege,
  };
}

/** Bericht (Abschluss) je Praxistag für die Karten auf /trainer. */
export async function berichteZuPraxistagen(fieldJobIds: string[]): Promise<Map<string, { id: string; stand: BerichtStand }>> {
  if (!fieldJobIds.length) return new Map();
  const supabase = await createClient();
  const { data: captures } = await supabase
    .from("field_capture")
    .select("id, field_job_id")
    .eq("phase", "abschluss")
    .in("field_job_id", fieldJobIds);
  const ids = (captures ?? []).map((c) => c.id);
  const { data: pruefungen } = ids.length
    ? await supabase.from("verification_aktuell").select("id, field_capture_id, entscheidung").in("field_capture_id", ids)
    : { data: [] as { id: string; field_capture_id: string; entscheidung: string }[] };
  return new Map(
    (captures ?? []).map((c) => {
      const p = (pruefungen ?? []).find((v) => v.field_capture_id === c.id);
      return [c.field_job_id, { id: c.id, stand: berichtStand(p ? { id: p.id, entscheidung: p.entscheidung as Entscheidung } : null) }];
    })
  );
}
