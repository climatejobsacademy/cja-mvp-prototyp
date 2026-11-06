"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import { Check, ClipboardList, FileCheck2, FileUp, Library, PencilRuler, Trash2, X, type LucideIcon } from "lucide-react";

import { FOKUS } from "@/components/praxisflow/stile";
import type { PraxisDateiArt } from "@/lib/database.types";
import { MAX_DATEI_BYTES, UPLOAD_FORMATE, dateiTyp } from "@/lib/praxisflow-inhalte";
import type { PraxisDatei } from "@/lib/praxisflow-shared";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import { dateienGeaendert } from "./praxisflow-actions";

// Dateien im Praxisflow (SR-88): Hochladen und Löschen direkt aus dem Browser
// mit der Session der lernenden Person. Storage- und Tabellen-Policies (0059)
// lassen nur den eigenen Ordner und den eigenen, nicht abgeschlossenen
// Praxistag zu. Pfad <learner_id>/<field_job_id>/<uuid>.<endung>.

const BUCKET = "praxis-dateien";

function endung(name: string) {
  const e = name.toLowerCase().split(".").pop() ?? "";
  return /^[a-z0-9]{1,5}$/.test(e) ? e : "bin";
}

/** Liste der eigenen Dateien einer Art mit Hochladen und Löschen. */
export function DateiUpload({
  id,
  art,
  fieldJobId,
  learnerId,
  dateien,
  offen,
  organisationId,
}: {
  id: string;
  art: PraxisDateiArt;
  fieldJobId: string;
  learnerId: string;
  organisationId: string;
  dateien: PraxisDatei[];
  /** false nach dem Abschluss: nur ansehen */
  offen: boolean;
}) {
  const router = useRouter();
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const eigene = dateien.filter((d) => d.art === art);

  async function hochladen(liste: File[]) {
    setFehler(null);
    setLaeuft(true);
    const supabase = createClient();
    try {
      for (const datei of liste) {
        const typ = dateiTyp(datei.name, datei.type, art);
        if (!typ) {
          setFehler(`${datei.name}: Dieses Format geht hier nicht.`);
          continue;
        }
        if (datei.size > MAX_DATEI_BYTES) {
          setFehler(`${datei.name}: Die Datei ist größer als 50 MB.`);
          continue;
        }
        const pfad = `${learnerId}/${fieldJobId}/${crypto.randomUUID()}.${endung(datei.name)}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(pfad, datei, { contentType: typ, upsert: false });
        if (upErr) {
          setFehler(`${datei.name}: Hochladen hat nicht geklappt.`);
          continue;
        }
        const { error: rowErr } = await supabase.from("field_job_datei").insert({
          organisation_id: organisationId,
          field_job_id: fieldJobId,
          learner_id: learnerId,
          art,
          storage_pfad: pfad,
          dateiname: datei.name.slice(0, 255),
          mime_type: typ,
          groesse: datei.size,
        });
        if (rowErr) {
          // Datei wieder entfernen, damit nichts ohne Eintrag liegen bleibt.
          await supabase.storage.from(BUCKET).remove([pfad]);
          setFehler(`${datei.name}: Speichern hat nicht geklappt.`);
        }
      }
    } finally {
      setLaeuft(false);
      await dateienGeaendert(fieldJobId);
      router.refresh();
    }
  }

  async function loeschen(datei: PraxisDatei) {
    setFehler(null);
    setLaeuft(true);
    const supabase = createClient();
    const { error } = await supabase.from("field_job_datei").delete().eq("id", datei.id);
    if (error) setFehler("Löschen hat nicht geklappt.");
    else await supabase.storage.from(BUCKET).remove([datei.storagePfad]);
    setLaeuft(false);
    await dateienGeaendert(fieldJobId);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      {eigene.length > 0 && (
        <ul className="flex flex-col gap-2">
          {eigene.map((d) => (
            <li key={d.id} className="flex items-center gap-3 rounded-zeile bg-subtle px-4 py-2.5 text-[15px] text-ink">
              <Check className="size-4 shrink-0 text-brand" strokeWidth={3} aria-hidden="true" />
              {d.url ? (
                <a href={d.url} target="_blank" rel="noopener noreferrer" className={cn("min-w-0 flex-1 truncate underline-offset-2 hover:underline", FOKUS)}>
                  {d.dateiname}
                  <span className="sr-only"> (öffnet in neuem Tab)</span>
                </a>
              ) : (
                <span className="min-w-0 flex-1 truncate">{d.dateiname}</span>
              )}
              {offen && (
                <button
                  type="button"
                  disabled={laeuft}
                  onClick={() => loeschen(d)}
                  aria-label={`${d.dateiname} löschen`}
                  className={cn("rounded-sm text-ink-muted hover:text-ink disabled:opacity-50", FOKUS)}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {offen && (
        <label
          htmlFor={id}
          className={cn(
            "inline-flex min-h-11 w-fit cursor-pointer items-center gap-2 rounded-full bg-subtle px-5 text-[15px] font-semibold text-ink hover:bg-praxis-tint has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand has-[:focus-visible]:ring-offset-2",
            laeuft && "pointer-events-none opacity-60"
          )}
        >
          <FileUp className="size-[18px]" aria-hidden="true" />
          {laeuft ? "Wird hochgeladen …" : eigene.length > 0 ? "Weitere Datei hochladen" : "Foto oder Datei hochladen"}
          <input
            id={id}
            type="file"
            multiple
            accept={UPLOAD_FORMATE[art]}
            disabled={laeuft}
            className="sr-only"
            onChange={(e) => {
              const liste = Array.from(e.target.files ?? []);
              e.target.value = "";
              if (liste.length > 0) void hochladen(liste);
            }}
          />
        </label>
      )}
      {fehler && (
        <p role="alert" className="text-sm text-ink">
          {fehler}
        </p>
      )}
    </div>
  );
}

type Art = { id: PraxisDateiArt; titel: string; kurz: string; Icon: LucideIcon; leer: string };

const ARTEN: Art[] = [
  { id: "auftrag", titel: "Dein Auftrag", kurz: "Auftrag", Icon: ClipboardList, leer: "Lade deinen Auftrag im ersten Schritt hoch, dann findest du ihn hier." },
  { id: "hilfe", titel: "Hilfsunterlagen", kurz: "Hilfen", Icon: Library, leer: "Eigene Hilfsunterlagen kannst du im zweiten Schritt hochladen." },
  { id: "plan", titel: "Pläne und Skizzen", kurz: "Pläne", Icon: PencilRuler, leer: "Deine Pläne und Skizzen lädst du beim Planen hoch." },
  { id: "protokoll", titel: "Prüfprotokoll", kurz: "Protokoll", Icon: FileCheck2, leer: "Das Prüfprotokoll lädst du am Ende der Kontrolle hoch." },
];

function istBild(mime: string) {
  return mime.startsWith("image/") && !mime.includes("dwg") && !mime.includes("dxf");
}

/** Unterlagen-Leiste: je Art ein Symbol, ein Klick öffnet die Vorschau im Fenster. */
export function UnterlagenLeiste({ dateien }: { dateien: PraxisDatei[] }) {
  return (
    <nav
      aria-label="Deine Unterlagen"
      className="flex gap-2 overflow-x-auto md:sticky md:top-6 md:flex-col md:overflow-visible md:rounded-karte md:bg-card md:p-2 md:shadow-card print:hidden"
    >
      {ARTEN.map((art) => (
        <UnterlagenFenster key={art.id} art={art} dateien={dateien.filter((d) => d.art === art.id)} />
      ))}
    </nav>
  );
}

function UnterlagenFenster({ art, dateien }: { art: Art; dateien: PraxisDatei[] }) {
  const [gewaehlt, setGewaehlt] = useState(0);
  const datei = dateien.length > 0 ? dateien[Math.min(gewaehlt, dateien.length - 1)] : null;
  return (
    <Dialog.Root onOpenChange={(offen) => offen && setGewaehlt(0)}>
      <Dialog.Trigger
        className={cn(
          "relative flex min-h-14 min-w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-zeile bg-card px-2 py-1.5 text-[12px] font-semibold shadow-card hover:bg-subtle md:shadow-none",
          dateien.length === 0 ? "text-ink-muted" : "text-ink",
          FOKUS
        )}
      >
        <art.Icon className={cn("size-5", dateien.length === 0 ? "text-ink-muted opacity-60" : "text-praxis-text")} aria-hidden="true" />
        {art.kurz}
        <span className="sr-only">, {dateien.length} {dateien.length === 1 ? "Dokument" : "Dokumente"}</span>
        {dateien.length > 1 && (
          <span aria-hidden="true" className="absolute top-1 right-1 rounded-full bg-praxis-tint px-1.5 text-[11px] tabular-nums">
            {dateien.length}
          </span>
        )}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-ink/40" />
        <Dialog.Popup className="fixed inset-2 z-50 mx-auto flex max-w-5xl flex-col overflow-hidden rounded-karte bg-page text-ink shadow-card outline-none md:inset-8">
          <div className="flex items-center gap-3 border-b border-line px-4 py-3 md:px-6">
            <art.Icon className="size-5 shrink-0 text-praxis-text" aria-hidden="true" />
            <Dialog.Title className="min-w-0 flex-1 truncate text-base font-bold">{art.titel}</Dialog.Title>
            <Dialog.Close aria-label="Schließen" className={cn("flex size-10 shrink-0 items-center justify-center rounded-full bg-white shadow-card hover:bg-subtle", FOKUS)}>
              <X className="size-[18px]" aria-hidden="true" />
            </Dialog.Close>
          </div>
          {dateien.length > 1 && (
            <div className="flex gap-2 overflow-x-auto border-b border-line px-4 py-2 md:px-6" role="tablist" aria-label={art.titel}>
              {dateien.map((d, i) => (
                <button
                  key={d.id}
                  type="button"
                  role="tab"
                  aria-selected={i === gewaehlt}
                  onClick={() => setGewaehlt(i)}
                  className={cn(
                    "max-w-[16rem] shrink-0 truncate rounded-full px-3 py-1.5 text-[13px] font-semibold",
                    i === gewaehlt ? "bg-ink text-white" : "bg-subtle text-ink hover:bg-line",
                    FOKUS
                  )}
                >
                  {d.dateiname}
                </button>
              ))}
            </div>
          )}
          <div className="flex min-h-0 flex-1 p-4 md:px-6">
            {!datei ? (
              <p className="m-auto max-w-sm text-center text-[15px] text-ink-muted">{art.leer}</p>
            ) : !datei.url ? (
              <p className="m-auto max-w-sm text-center text-sm text-ink-muted">Die Datei lässt sich gerade nicht öffnen. Lade die Seite neu.</p>
            ) : istBild(datei.mimeType) ? (
              // eslint-disable-next-line @next/next/no-img-element -- signierter Link aus Supabase Storage, kein Bildoptimierer
              <img src={datei.url} alt={datei.dateiname} className="m-auto max-h-full max-w-full object-contain" />
            ) : datei.mimeType === "application/pdf" ? (
              <iframe src={datei.url} title={`Vorschau: ${datei.dateiname}`} className="h-full w-full rounded-zeile bg-white" />
            ) : (
              <a href={datei.url} download={datei.dateiname} className={cn("m-auto inline-flex min-h-11 items-center gap-2 rounded-full bg-subtle px-5 text-[15px] font-semibold hover:bg-line", FOKUS)}>
                Datei herunterladen
              </a>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
