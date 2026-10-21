import { cache } from "react";
import { redirect } from "next/navigation";

import { type HeaderLogo, headerLogo } from "@/lib/org-logo";
import { createClient } from "@/lib/supabase/server";
import { zielOhneEinschreibung } from "@/lib/trainer-tag";

import { signierteFotoLinks } from "./trainer";

export type CurrentLearner = {
  personId: string;
  name: string;
  /** Rufname für Begrüßung und Anzeige (person.rufname, 0029) */
  rufname: string;
  /** Eigenes Profilfoto als signierter Link (SR-77, 1 Stunde), null = keins */
  fotoUrl: string | null;
  email: string;
  enrolmentId: string;
  cohortId: string;
  organisationId: string;
  programmeId: string;
  programmeName: string;
  cohortName: string;
  /** Logo der Organisation für den Header (SR-76), null = Fallback. */
  organisationLogo: HeaderLogo | null;
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

  // getClaims prüft das Anmelde-Token lokal über den öffentlichen Schlüssel
  // (asymmetrische Signier-Schlüssel), ohne Rundreise zu Supabase Auth --
  // die Middleware hat die Sitzung im selben Request schon aufgefrischt.
  // Rechte entscheidet weiterhin RLS (auth.uid() aus demselben Token).
  const { data: anmeldung } = await supabase.auth.getClaims();
  const userId = anmeldung?.claims.sub;

  if (!userId) {
    redirect("/login");
  }

  // Person und Einschreibung hängen beide nur an der Nutzer-ID: gleichzeitig
  // laden statt nacheinander (Ladezeit, Anna 2026-10-21).
  // Bewusst als einfache Abfragen statt eines verschachtelten Selects:
  // hält die Typinferenz robust, ohne von den (hier von Hand geschriebenen,
  // nicht generierten) Relationships-Metadaten abhängig zu sein.
  const [{ data: person, error: personError }, { data: enrolment, error: enrolmentError }] = await Promise.all([
    supabase.from("person").select("id, name, rufname, foto_pfad").eq("id", userId).single(),
    supabase
      .from("enrolment")
      .select("id, organisation_id, cohort_id")
      .eq("learner_id", userId)
      .eq("status", "aktiv")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  if (personError || !person) {
    // Person existiert in auth.users, aber (noch) nicht in public.person —
    // Prototyp legt Accounts händisch an (data-model.md, 4d).
    redirect("/login?error=kein-profil");
  }

  if (enrolmentError || !enrolment) {
    // Trainer:innen ohne Einschreibung haben ihren eigenen Bereich (SR-81, Paket G2).
    const { data: rollen } = await supabase
      .from("role_assignment")
      .select("rolle")
      .eq("person_id", person.id)
      .eq("rolle", "trainer")
      .limit(1);
    redirect(zielOhneEinschreibung((rollen ?? []).length > 0));
  }

  // Organisation und Profilfoto parallel zur Kohorte: kein zusätzlicher
  // Roundtrip. Organisation lesbar nur bei Mitgliedschaft
  // (organisation_learner_select, 0009). Fehler oder keine Zeile -> kein
  // Logo, die Seite bricht daran nicht.
  const [{ data: cohort, error: cohortError }, { data: organisation }, fotoLinks] = await Promise.all([
    supabase.from("cohort").select("programme_id, name").eq("id", enrolment.cohort_id).single(),
    supabase.from("organisation").select("name, logo_pfad").eq("id", enrolment.organisation_id).maybeSingle(),
    signierteFotoLinks(supabase, person.foto_pfad ? [person.foto_pfad] : []),
  ]);

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
    rufname: person.rufname,
    fotoUrl: person.foto_pfad ? (fotoLinks.get(person.foto_pfad) ?? null) : null,
    email: typeof anmeldung?.claims.email === "string" ? anmeldung.claims.email : "",
    enrolmentId: enrolment.id,
    cohortId: enrolment.cohort_id,
    organisationId: enrolment.organisation_id,
    programmeId: programme.id,
    programmeName: programme.name,
    cohortName: cohort.name,
    organisationLogo: headerLogo(
      organisation ? { name: organisation.name, logoPfad: organisation.logo_pfad } : null,
      process.env.NEXT_PUBLIC_SUPABASE_URL
    ),
  };
});
