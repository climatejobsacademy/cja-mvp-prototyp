"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { FOTO_MAX_BYTES, PROFILFOTO_BUCKET, fotoPfad } from "@/lib/profilfoto";
import { requireCurrentLearner } from "@/lib/queries/session";
import { createClient } from "@/lib/supabase/server";

// Profil im Konto-Menü (SR-77, SR-48/SR-73, Entscheidungen 2026-10-13):
// Profilfoto hochladen, ändern, entfernen und den Rufnamen ändern. Alles mit
// der Session der Person: person_self_update (0009) und die Storage-Policies
// aus 0030 erlauben nur die eigene Zeile und den eigenen Ordner. Kein
// Logging von Pfaden oder Dateien (CLAUDE.md Regel 9).

export type ProfilErgebnis = { ok: true } | { ok: false; fehler: string };

const FEHLER_SPEICHERN = "Das hat nicht geklappt. Bitte versuche es noch einmal.";

/** JPEG beginnt mit FF D8 FF -- der Browser schickt nach dem Zuschnitt immer JPEG. */
async function istJpeg(datei: File): Promise<boolean> {
  const kopf = new Uint8Array(await datei.slice(0, 3).arrayBuffer());
  return kopf[0] === 0xff && kopf[1] === 0xd8 && kopf[2] === 0xff;
}

export async function profilfotoSpeichern(formData: FormData): Promise<ProfilErgebnis> {
  const learner = await requireCurrentLearner();
  const datei = formData.get("foto");
  if (!(datei instanceof File) || datei.size === 0) return { ok: false, fehler: "Bitte wähle ein Foto aus." };
  if (datei.size > FOTO_MAX_BYTES) return { ok: false, fehler: "Das Foto ist zu groß (höchstens 1 MB)." };
  if (datei.type !== "image/jpeg" || !(await istJpeg(datei))) {
    return { ok: false, fehler: "Dieses Format wird nicht unterstützt." };
  }

  const supabase = await createClient();
  const { data: person } = await supabase.from("person").select("foto_pfad").eq("id", learner.personId).single();

  // Neuer Name je Upload: kein Überschreiben, alte Links laufen sauber aus.
  const pfad = fotoPfad(learner.personId, randomUUID());
  const speicher = supabase.storage.from(PROFILFOTO_BUCKET);
  const { error: uploadFehler } = await speicher.upload(pfad, datei, { contentType: "image/jpeg", upsert: false });
  if (uploadFehler) return { ok: false, fehler: FEHLER_SPEICHERN };

  const { error } = await supabase.from("person").update({ foto_pfad: pfad }).eq("id", learner.personId);
  if (error) {
    await speicher.remove([pfad]);
    return { ok: false, fehler: FEHLER_SPEICHERN };
  }
  if (person?.foto_pfad) await speicher.remove([person.foto_pfad]);

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function profilfotoEntfernen(): Promise<ProfilErgebnis> {
  const learner = await requireCurrentLearner();
  const supabase = await createClient();
  const { data: person } = await supabase.from("person").select("foto_pfad").eq("id", learner.personId).single();
  if (!person?.foto_pfad) return { ok: true };

  const { error } = await supabase.from("person").update({ foto_pfad: null }).eq("id", learner.personId);
  if (error) return { ok: false, fehler: FEHLER_SPEICHERN };
  // Datei löschen, damit nichts liegen bleibt (Datenschutz: Löschung auf Wunsch).
  await supabase.storage.from(PROFILFOTO_BUCKET).remove([person.foto_pfad]);

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function rufnameSpeichern(eingabe: string): Promise<ProfilErgebnis> {
  const learner = await requireCurrentLearner();
  const rufname = eingabe.replace(/\s+/g, " ").trim();
  if (!rufname) return { ok: false, fehler: "Bitte gib einen Rufnamen ein." };
  if (rufname.length > 60) return { ok: false, fehler: "Der Rufname ist zu lang (höchstens 60 Zeichen)." };

  const supabase = await createClient();
  const { error } = await supabase.from("person").update({ rufname }).eq("id", learner.personId);
  if (error) return { ok: false, fehler: FEHLER_SPEICHERN };

  revalidatePath("/", "layout");
  return { ok: true };
}
