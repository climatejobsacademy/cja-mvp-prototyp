import { createClient } from "@/lib/supabase/server";
import { getMeineTrainer } from "@/lib/queries/trainer";
import type { PraxisflowDaten } from "@/lib/praxisflow-shared";

// Geführter Praxisflow (SR-64, SR-88, SR-89, SR-90). Liest nur mit der
// Session der lernenden Person: field_job (eigene Zeile), field_job_datei
// (nur eigene, SR-88) und signierte Links aus praxis-dateien. Kein
// Service-Role-Key, keine Dateipfade im Log.

const DATEI_LINK_SEKUNDEN = 600;

/** Praxistag im geführten Ablauf; null, wenn nicht eigener Praxistag oder einfacher Ablauf. */
export async function getPraxisflow(fieldJobId: string, learnerId: string): Promise<PraxisflowDaten | null> {
  const supabase = await createClient();
  const { data: job } = await supabase
    .from("field_job")
    .select("id, organisation_id, learner_id, datum, phase, praxisflow, instructor_id, field_job_type_id")
    .eq("id", fieldJobId)
    .maybeSingle();
  if (!job || job.learner_id !== learnerId) return null;

  const { data: typ } = await supabase
    .from("field_job_type")
    .select("titel, beschreibung, ablauf")
    .eq("id", job.field_job_type_id)
    .maybeSingle();
  if (!typ || typ.ablauf !== "gefuehrt") return null;

  const { data: dateien } = await supabase
    .from("field_job_datei")
    .select("id, art, dateiname, mime_type, storage_pfad, created_at")
    .eq("field_job_id", fieldJobId)
    .order("created_at", { ascending: true });

  const pfade = (dateien ?? []).map((d) => d.storage_pfad);
  const links = new Map<string, string>();
  if (pfade.length > 0) {
    const { data } = await supabase.storage.from("praxis-dateien").createSignedUrls(pfade, DATEI_LINK_SEKUNDEN);
    for (const e of data ?? []) if (e.path && e.signedUrl && !e.error) links.set(e.path, e.signedUrl);
  }

  const trainer = job.instructor_id ? ((await getMeineTrainer()).get(job.instructor_id) ?? null) : null;

  return {
    fieldJobId: job.id,
    learnerId: job.learner_id,
    organisationId: job.organisation_id,
    titel: typ.titel,
    beschreibung: typ.beschreibung,
    datum: job.datum,
    phase: job.phase,
    fortschritt: job.praxisflow ?? {},
    dateien: (dateien ?? []).map((d) => ({
      id: d.id,
      art: d.art,
      dateiname: d.dateiname,
      mimeType: d.mime_type,
      storagePfad: d.storage_pfad,
      url: links.get(d.storage_pfad) ?? null,
    })),
    trainer: trainer ? { name: trainer.name, fotoUrl: trainer.fotoUrl } : null,
  };
}
