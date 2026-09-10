import { createClient } from "@/lib/supabase/server";
import type { CaptureUiStatus } from "@/components/status-badge";
import type { FieldJobDetail } from "@/lib/praxistag-shared";

export async function getFieldJobDetail(
  fieldJobId: string,
  learnerId: string
): Promise<FieldJobDetail | null> {
  const supabase = await createClient();

  const { data: job } = await supabase
    .from("field_job")
    .select("id, status, field_job_type_id, learner_id")
    .eq("id", fieldJobId)
    .single();

  if (!job || job.learner_id !== learnerId) return null;

  const { data: type } = await supabase
    .from("field_job_type")
    .select(
      "titel, beschreibung, vorbereitung_text, vorbereitung_content_id, nachbereitung_text, nachbereitung_content_id"
    )
    .eq("id", job.field_job_type_id)
    .single();

  if (!type) return null;

  const { data: captures } = await supabase
    .from("field_capture")
    .select("id, status")
    .eq("field_job_id", fieldJobId)
    .eq("learner_id", learnerId)
    .order("eingereicht_am", { ascending: false })
    .limit(1);

  const capture = captures?.[0]
    ? { id: captures[0].id, status: toUiStatus(captures[0].status) }
    : null;

  return {
    fieldJobId: job.id,
    status: job.status,
    titel: type.titel,
    beschreibung: type.beschreibung,
    vorbereitungText: type.vorbereitung_text,
    vorbereitungContentId: type.vorbereitung_content_id,
    nachbereitungText: type.nachbereitung_text,
    nachbereitungContentId: type.nachbereitung_content_id,
    capture,
  };
}

function toUiStatus(status: "submitted" | "verified" | "rejected"): CaptureUiStatus {
  if (status === "submitted") return "pending";
  return status;
}
