"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import { Check, ClipboardList, Download, ExternalLink, FileCheck2, FileText, FileUp, Library, Link2, PencilRuler, Trash2, X, type LucideIcon } from "lucide-react";

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
  const [fehler, setFehlerListe] = useState<string[]>([]);
  const setFehler = (f: string | null) => setFehlerListe(f ? [f] : []);
  const fehlerDazu = (f: string) => setFehlerListe((l) => [...l, f]);
  // Hilfsunterlagen von AfCJ (SR-68) stehen nicht in der eigenen Liste und sind nicht löschbar.
  const eigene = dateien.filter((d) => d.art === art && !d.vonAfcj);

  async function hochladen(liste: File[]) {
    setFehler(null);
    setLaeuft(true);
    const supabase = createClient();
    try {
      for (const datei of liste) {
        const typ = dateiTyp(datei.name, datei.type, art);
        if (!typ) {
          fehlerDazu(`${datei.name}: Dieses Format geht hier nicht.`);
          continue;
        }
        if (datei.size > MAX_DATEI_BYTES) {
          fehlerDazu(`${datei.name}: Die Datei ist größer als 50 MB.`);
          continue;
        }
        const pfad = `${learnerId}/${fieldJobId}/${crypto.randomUUID()}.${endung(datei.name)}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(pfad, datei, { contentType: typ, upsert: false });
        if (upErr) {
          fehlerDazu(`${datei.name}: Hochladen hat nicht geklappt.`);
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
          // Scheitert auch das, bleibt sie im privaten Ordner der Person.
          await supabase.storage.from(BUCKET).remove([pfad]);
          fehlerDazu(`${datei.name}: Speichern hat nicht geklappt.`);
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
    // Erst die Datei im Speicher, dann die Zeile: bleibt etwas übrig, dann
    // eine sichtbare Zeile, die sich erneut löschen lässt (SR-88).
    const { error: speicherFehler } = await supabase.storage.from(BUCKET).remove([datei.storagePfad]);
    const { error } = speicherFehler ? { error: speicherFehler } : await supabase.from("field_job_datei").delete().eq("id", datei.id);
    if (error) setFehler("Löschen hat nicht geklappt. Bitte versuch es noch einmal.");
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
            "inline-flex min-h-11 w-fit cursor-pointer items-center gap-2 rounded-full bg-subtle px-5 text-[15px] font-semibold text-ink hover:bg-brand-tint has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand has-[:focus-visible]:ring-offset-2",
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
      <p role="status" aria-live="polite" className="sr-only">
        {laeuft ? "Datei wird hochgeladen" : ""}
      </p>
      {fehler.length > 0 && (
        <ul role="alert" className="flex flex-col gap-1 text-sm text-ink">
          {fehler.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Hilfsunterlagen von AfCJ zur Praxisaufgabe (SR-68): Dateien und Links,
 * nur ansehen. Gleiche Zeilen wie die eigenen Dateien, öffnen im neuen Tab.
 */
export function AfcjHilfen({ dateien, links }: { dateien: PraxisDatei[]; links: { id: string; titel: string; url: string }[] }) {
  const afcj = dateien.filter((d) => d.vonAfcj);
  if (afcj.length === 0 && links.length === 0) return null;
  const zeile = "flex items-center gap-3 rounded-zeile bg-subtle px-4 py-2.5 text-[15px] text-ink";
  const link = cn("min-w-0 flex-1 truncate underline-offset-2 hover:underline", FOKUS);
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[15px] font-semibold text-ink">Unterlagen zu deinem Auftrag</span>
      <ul className="flex flex-col gap-2">
        {afcj.map((d) => (
          <li key={d.id} className={zeile}>
            <FileText className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
            {d.url ? (
              <a href={d.url} target="_blank" rel="noopener noreferrer" className={link}>
                {d.dateiname}
                <span className="sr-only"> (öffnet in neuem Tab)</span>
              </a>
            ) : (
              <span className="min-w-0 flex-1 truncate">{d.dateiname}</span>
            )}
          </li>
        ))}
        {links.map((l) => (
          <li key={l.id} className={zeile}>
            <Link2 className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
            <a href={l.url} target="_blank" rel="noopener noreferrer" className={link}>
              {l.titel}
              <span className="sr-only"> (externer Link, öffnet in neuem Tab)</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

type Art = { id: PraxisDateiArt; titel: string; kurz: string; Icon: LucideIcon; leer: string };

const ARTEN: Art[] = [
  { id: "auftrag", titel: "Dein Auftrag", kurz: "Auftrag", Icon: ClipboardList, leer: "Lade deinen Auftrag im ersten Schritt hoch, dann findest du ihn hier." },
  { id: "hilfe", titel: "Hilfsunterlagen", kurz: "Hilfen", Icon: Library, leer: "Eigene Hilfsunterlagen kannst du im zweiten Schritt hochladen." },
  { id: "plan", titel: "Pläne und Zeichnungen", kurz: "Pläne", Icon: PencilRuler, leer: "Deine Pläne und Zeichnungen lädst du beim Planen hoch." },
  { id: "protokoll", titel: "Prüfprotokoll", kurz: "Protokoll", Icon: FileCheck2, leer: "Das Prüfprotokoll lädst du am Ende der Kontrolle hoch." },
];

function istBild(mime: string) {
  return mime.startsWith("image/") && !mime.includes("dwg") && !mime.includes("dxf");
}

/** Signierter Supabase-Link, der die Datei herunterlädt statt sie zu öffnen. */
function downloadUrl(url: string, name: string) {
  return `${url}${url.includes("?") ? "&" : "?"}download=${encodeURIComponent(name)}`;
}

const AKTION = cn("inline-flex min-h-11 items-center gap-2 rounded-full bg-subtle px-4 text-[14px] font-semibold text-ink hover:bg-line", FOKUS);

/**
 * Unter jeder Datei: in neuem Tab öffnen (am Handy zeigt das den PDF-Viewer
 * des Geräts, eingebettet klappt das nicht überall) und herunterladen. Für
 * Formate ohne Vorschau (Word, Excel, CAD) ein kurzer Hinweis.
 */
function DateiAktionen({ datei, ohneVorschau }: { datei: PraxisDatei; ohneVorschau: boolean }) {
  if (!datei.url) return null;
  return (
    <div className="flex flex-col items-center gap-2">
      {ohneVorschau && (
        <p className="max-w-sm text-center text-sm text-ink-muted">Diese Datei kann hier nicht angezeigt werden. Lade sie herunter und öffne sie auf deinem Gerät.</p>
      )}
      <div className="flex flex-wrap justify-center gap-2">
        {!ohneVorschau && (
          <a href={datei.url} target="_blank" rel="noopener noreferrer" className={AKTION}>
            <ExternalLink className="size-4" aria-hidden="true" />
            In neuem Tab öffnen
            <span className="sr-only">: {datei.dateiname}</span>
          </a>
        )}
        <a href={downloadUrl(datei.url, datei.dateiname)} className={AKTION}>
          <Download className="size-4" aria-hidden="true" />
          Herunterladen
          <span className="sr-only">: {datei.dateiname}</span>
        </a>
      </div>
    </div>
  );
}

const hatVorschau = (mime: string) => istBild(mime) || mime === "application/pdf";

/** Unterlagen-Leiste: je Art ein Symbol, ein Klick öffnet die Vorschau im Fenster. */
export function UnterlagenLeiste({ dateien, onGeoeffnet }: { dateien: PraxisDatei[]; onGeoeffnet?: (art: PraxisDateiArt) => void }) {
  return (
    <nav
      aria-label="Deine Unterlagen"
      className="flex gap-2 overflow-x-auto md:sticky md:top-6 md:flex-col md:overflow-visible md:rounded-karte md:bg-card md:p-2 md:shadow-card print:hidden"
    >
      {ARTEN.map((art) => (
        <UnterlagenFenster key={art.id} art={art} dateien={dateien.filter((d) => d.art === art.id)} onGeoeffnet={onGeoeffnet} />
      ))}
    </nav>
  );
}

function UnterlagenFenster({ art, dateien, onGeoeffnet }: { art: Art; dateien: PraxisDatei[]; onGeoeffnet?: (art: PraxisDateiArt) => void }) {
  const [gewaehlt, setGewaehlt] = useState(0);
  const datei = dateien.length > 0 ? dateien[Math.min(gewaehlt, dateien.length - 1)] : null;
  // Kommt eine Datei dazu (Upload), leuchtet das Fach kurz in Charge Green
  // auf (Lime = jetzt, design-specifications.md), nicht beim ersten Laden.
  const vorher = useRef(dateien.length);
  const [neu, setNeu] = useState(false);
  useEffect(() => {
    const mehr = dateien.length > vorher.current;
    vorher.current = dateien.length;
    if (!mehr) return;
    setNeu(true);
    const t = setTimeout(() => setNeu(false), 2200);
    return () => clearTimeout(t);
  }, [dateien.length]);
  return (
    <Dialog.Root
      onOpenChange={(offen) => {
        if (!offen) return;
        setGewaehlt(0);
        onGeoeffnet?.(art.id);
      }}
    >
      <Dialog.Trigger
        className={cn(
          "relative flex min-h-14 min-w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-zeile px-2 py-1.5 text-[12px] font-semibold shadow-card transition-[background-color,box-shadow] duration-500 hover:bg-subtle md:shadow-none motion-reduce:transition-none",
          dateien.length === 0 ? "bg-card text-ink-muted" : "bg-card text-ink",
          neu && "bg-lime/40 shadow-glow-charge-sm md:shadow-glow-charge-sm",
          FOKUS
        )}
      >
        <art.Icon className={cn("size-5", dateien.length === 0 ? "text-ink-muted opacity-60" : "text-ink")} aria-hidden="true" />
        {art.kurz}
        <span className="sr-only">, {dateien.length} {dateien.length === 1 ? "Dokument" : "Dokumente"}</span>
        {/* Belegt: immer eine kleine Zahl in der Fortschrittsfarbe, auch bei einer Datei. */}
        {dateien.length > 0 && (
          <span aria-hidden="true" className="absolute top-1 right-1 min-w-4 rounded-full bg-progress px-1 text-center text-[11px] leading-4 text-white tabular-nums">
            {dateien.length}
          </span>
        )}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-ink/40" />
        <Dialog.Popup className="fixed inset-2 z-50 mx-auto flex max-w-5xl flex-col overflow-hidden rounded-karte bg-page text-ink shadow-card outline-none md:inset-8">
          <div className="flex items-center gap-3 border-b border-line px-4 py-3 md:px-6">
            <art.Icon className="size-5 shrink-0 text-ink-muted" aria-hidden="true" />
            <Dialog.Title className="min-w-0 flex-1 truncate text-base font-bold">{art.titel}</Dialog.Title>
            <Dialog.Close aria-label="Schließen" className={cn("flex size-10 shrink-0 items-center justify-center rounded-full bg-white shadow-card hover:bg-subtle", FOKUS)}>
              <X className="size-[18px]" aria-hidden="true" />
            </Dialog.Close>
          </div>
          {dateien.length > 1 && (
            <div className="flex gap-2 overflow-x-auto border-b border-line px-4 py-2 md:px-6" role="group" aria-label={`${art.titel}: Datei wählen`}>
              {dateien.map((d, i) => (
                <button
                  key={d.id}
                  type="button"
                  aria-pressed={i === gewaehlt}
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
          {datei && (
            <p className="px-4 pt-2 text-xs text-ink-muted md:px-6">Öffnet sich die Datei nicht, lade die Seite neu.</p>
          )}
          <div className="flex min-h-0 flex-1 flex-col gap-3 p-4 md:px-6">
            {!datei ? (
              <p className="m-auto max-w-sm text-center text-[15px] text-ink-muted">{art.leer}</p>
            ) : !datei.url ? (
              <p className="m-auto max-w-sm text-center text-sm text-ink-muted">Die Datei lässt sich gerade nicht öffnen. Lade die Seite neu.</p>
            ) : istBild(datei.mimeType) ? (
              // eslint-disable-next-line @next/next/no-img-element -- signierter Link aus Supabase Storage, kein Bildoptimierer
              <img src={datei.url} alt={datei.dateiname} className="mx-auto min-h-0 max-w-full flex-1 object-contain" />
            ) : datei.mimeType === "application/pdf" ? (
              <iframe src={datei.url} title={`Vorschau: ${datei.dateiname}`} className="min-h-0 w-full flex-1 rounded-zeile bg-white" />
            ) : null}
            {datei && <div className={hatVorschau(datei.mimeType) ? "" : "m-auto"}><DateiAktionen datei={datei} ohneVorschau={!hatVorschau(datei.mimeType)} /></div>}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * Vorschau direkt auf der Seite, ohne Fenster: für die Plan-Freigabe, damit
 * die Trainer:in alles auf einen Blick sieht (SR-65). Bilder und PDF werden
 * angezeigt, andere Formate (Word, Excel, CAD) mit Hinweis; unter jeder
 * Datei „In neuem Tab öffnen“ und „Herunterladen“.
 */
export function DateiVorschau({ dateien }: { dateien: PraxisDatei[] }) {
  return (
    <div className="flex flex-col gap-3">
      {dateien.map((d) => (
        <figure key={d.id} className="flex flex-col gap-1.5 rounded-zeile bg-white p-2">
          {!d.url ? (
            <p className="p-4 text-center text-sm text-ink-muted">Die Datei lässt sich gerade nicht öffnen. Lade die Seite neu.</p>
          ) : istBild(d.mimeType) ? (
            // eslint-disable-next-line @next/next/no-img-element -- signierter Link aus Supabase Storage, kein Bildoptimierer
            <img src={d.url} alt={d.dateiname} className="mx-auto max-h-[70vh] w-auto max-w-full rounded-sm object-contain" />
          ) : d.mimeType === "application/pdf" ? (
            <iframe src={d.url} title={`Vorschau: ${d.dateiname}`} className="h-[70vh] w-full rounded-sm bg-white" />
          ) : null}
          <figcaption className="truncate px-1 text-xs text-ink-muted">{d.dateiname}</figcaption>
          <DateiAktionen datei={d} ohneVorschau={!hatVorschau(d.mimeType)} />
        </figure>
      ))}
    </div>
  );
}
