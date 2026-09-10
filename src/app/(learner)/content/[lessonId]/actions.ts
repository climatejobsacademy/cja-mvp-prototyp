"use server";

import { revalidatePath } from "next/cache";

import { requireCurrentLearner } from "@/lib/queries/session";
import { createClient } from "@/lib/supabase/server";

export async function markLessonComplete(lessonId: string) {
  const learner = await requireCurrentLearner();
  const supabase = await createClient();

  const { error } = await supabase.from("unit_progress").upsert(
    {
      organisation_id: learner.organisationId,
      learner_id: learner.personId,
      lesson_id: lessonId,
      status: "abgeschlossen",
      abgeschlossen_am: new Date().toISOString(),
    },
    { onConflict: "learner_id,lesson_id" }
  );

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath(`/content/${lessonId}`);
  revalidatePath("/content");
  revalidatePath("/kompetenzen");
  return { ok: true as const };
}
