import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type CurrentLearner = {
  personId: string;
  name: string;
  email: string;
  enrolmentId: string;
  cohortId: string;
  organisationId: string;
  programmeId: string;
  programmeName: string;
};

/**
 * Lädt die eingeloggte Person plus ihre (erste) aktive Enrolment/Kohorte.
 *
 * Der Prototyp modelliert bewusst nur die Learner-Rolle in der App (siehe
 * docs/design-specifications.md, Abschnitt 3: Admin-Oberfläche zurückgestellt).
 * Eine Person kann laut data-model.md zu mehreren Organisationen gehören —
 * für den Prototyp reicht die erste aktive Enrolment als "aktueller Kontext"
 * (siehe docs/open-questions.md für die Mehrfach-Org-Implikation allgemein).
 *
 * Mit React `cache()` gewrappt: mehrere Aufrufe innerhalb desselben Requests
 * (Layout + Page rufen das unabhängig auf) lösen nur eine DB-Abfrage aus, ohne
 * die Daten manuell über Props durchreichen zu müssen.
 */
export const requireCurrentLearner = cache(async (): Promise<CurrentLearner> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: person, error: personError } = await supabase
    .from("person")
    .select("id, name")
    .eq("id", user.id)
    .single();

  if (personError || !person) {
    // Person existiert in auth.users, aber (noch) nicht in public.person —
    // Prototyp legt Accounts händisch an (data-model.md, 4d).
    redirect("/login?error=kein-profil");
  }

  // Bewusst als drei einfache Abfragen statt eines verschachtelten Selects:
  // hält die Typinferenz robust, ohne von den (hier von Hand geschriebenen,
  // nicht generierten) Relationships-Metadaten abhängig zu sein.
  const { data: enrolment, error: enrolmentError } = await supabase
    .from("enrolment")
    .select("id, organisation_id, cohort_id")
    .eq("learner_id", person.id)
    .eq("status", "aktiv")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (enrolmentError || !enrolment) {
    redirect("/login?error=keine-einschreibung");
  }

  const { data: cohort, error: cohortError } = await supabase
    .from("cohort")
    .select("programme_id")
    .eq("id", enrolment.cohort_id)
    .single();

  if (cohortError || !cohort) {
    redirect("/login?error=keine-einschreibung");
  }

  const { data: programme, error: programmeError } = await supabase
    .from("programme")
    .select("id, name")
    .eq("id", cohort.programme_id)
    .single();

  if (programmeError || !programme) {
    redirect("/login?error=keine-einschreibung");
  }

  return {
    personId: person.id,
    name: person.name,
    email: user.email ?? "",
    enrolmentId: enrolment.id,
    cohortId: enrolment.cohort_id,
    organisationId: enrolment.organisation_id,
    programmeId: programme.id,
    programmeName: programme.name,
  };
});
