import { getPraxisaufgabeHilfen, type PraxisaufgabeHilfen } from "@/lib/queries/praxisaufgabe-hilfen";
import { getMeineTrainer, type TrainerAnzeige } from "@/lib/queries/trainer";
import { createClient } from "@/lib/supabase/server";

export type LabortagDaten = {
  titel: string;
  beschreibung: string | null;
  datum: string;
  start: string | null;
  ende: string | null;
  standort: string | null;
  trainer: TrainerAnzeige | null;
  unterlagen: PraxisaufgabeHilfen;
};

/**
 * Labortag (SR-94): eigener Praxisauftrag einer Praxisaufgabe mit
 * ablauf = labor, ohne Praxisflow. Unterlagen kommen aus SR-68
 * (field_job_type_resource). null, wenn es kein eigener Labortag ist.
 */
export async function getLabortag(fieldJobId: string, learnerId: string): Promise<LabortagDaten | null> {
  const supabase = await createClient();
  const { data: job, error } = await supabase
    .from("field_job")
    .select("id, learner_id, datum, start, ende, standort, instructor_id, field_job_type_id")
    .eq("id", fieldJobId)
    .maybeSingle();
  if (error) throw new Error("Labortag konnte nicht geladen werden");
  if (!job || job.learner_id !== learnerId) return null;

  const { data: typ, error: typFehler } = await supabase
    .from("field_job_type")
    .select("titel, beschreibung, ablauf")
    .eq("id", job.field_job_type_id)
    .maybeSingle();
  if (typFehler) throw new Error("Labortag konnte nicht geladen werden");
  if (!typ || typ.ablauf !== "labor") return null;

  const [unterlagen, trainerListe] = await Promise.all([getPraxisaufgabeHilfen(job.field_job_type_id), getMeineTrainer()]);
  return {
    titel: typ.titel,
    beschreibung: typ.beschreibung,
    datum: job.datum,
    start: job.start,
    ende: job.ende,
    standort: job.standort,
    trainer: job.instructor_id ? (trainerListe.get(job.instructor_id) ?? null) : null,
    unterlagen,
  };
}
