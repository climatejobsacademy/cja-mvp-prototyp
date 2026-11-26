"use client";

import { useState, useSyncExternalStore } from "react";
import { ChevronDown, CircleCheck, Download, ExternalLink, Eye, FileText, Link2 } from "lucide-react";

import { DateiVorschau } from "@/components/datei-vorschau";
import { erstelleDownloadMarker, markierteIds } from "@/lib/download-marker";
import { dateiInfo, unterlagenAufteilen } from "@/lib/materialien";
import type { Material } from "@/lib/queries/materialien";

// "heruntergeladen" nur für die laufende Browser-Sitzung (sessionStorage),
// nichts davon geht in die Datenbank. Logik in src/lib/download-marker.ts.
const downloadMarker = erstelleDownloadMarker(() =>
  typeof window === "undefined" ? null : window.sessionStorage
);

// Anker für Stundenplan und Home ("Unterlagen" führt direkt hierher).
export const UNTERLAGEN_ANKER = "unterlagen";

// Hauptaktion je Zeile: "Herunterladen" bzw. bei Links "Öffnen"; immer mit
// sichtbarem Text, auch auf dem Smartphone (SR-68, ergänzt 26.11.2026).
const HAUPTKNOPF =
  "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-brand px-4 text-sm font-semibold text-white outline-none hover:bg-brand-2 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2";
// Nebenaktion "Vorschau": auf dem Smartphone nur das Symbol (Name per sr-only).
const NEBENKNOPF =
  "inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-full bg-subtle px-3 text-sm font-semibold text-ink outline-none hover:bg-brand-tint hover:text-brand focus-visible:ring-2 focus-visible:ring-brand";

/**
 * Abschnitt „Unterlagen“ einer Lektion (SR-68). Steht direkt unter dem Titel
 * (ergänzt 26.11.2026, löst die Kacheln ohne Download-Knopf vom 12.10. ab):
 * je Datei eine Zeile mit Titel, Format und Größe und einem Knopf
 * „Herunterladen“, dazu „Vorschau“ als Nebenaktion bei PDF und Bildern.
 * Mehr als drei Einträge: die ersten drei, der Rest hinter „Alle anzeigen“.
 * Download ist ein normaler Link; der signierte Link entsteht erst beim
 * Aufruf im Route Handler (?aktion=download liefert die Datei als Anhang,
 * die Seite bleibt stehen). Kein next/link, damit nichts vorab geladen wird.
 * Bilder werden nirgends inline gezeigt.
 */
export function MaterialienListe({ lessonId, materialien }: { lessonId: string; materialien: Material[] }) {
  const heruntergeladen = markierteIds(
    useSyncExternalStore(downloadMarker.abonnieren, downloadMarker.lesen, () => "")
  );
  const [aufgeklappt, setAufgeklappt] = useState(false);
  const { sichtbar, weitere } = unterlagenAufteilen(materialien, aufgeklappt);

  const basis = `/content/${lessonId}/material`;
  const markieren = (id: string) => downloadMarker.setzen(id);

  return (
    <section
      id={UNTERLAGEN_ANKER}
      aria-labelledby="unterlagen-ueberschrift"
      className="flex scroll-mt-4 flex-col gap-2 rounded-karte bg-card p-4 shadow-card md:p-5"
    >
      <h2 id="unterlagen-ueberschrift" className="flex items-center gap-2 text-base font-bold text-ink">
        <Download className="size-[18px] text-brand" aria-hidden="true" />
        Unterlagen
        <span className="text-sm font-normal text-ink-muted">({materialien.length})</span>
      </h2>
      <ul className="flex flex-col divide-y divide-line">
        {sichtbar.map((m) => {
          const downloadHref = `${basis}/${m.id}?aktion=download`;
          return (
            <li key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3 first:pt-1 last:pb-1">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-subtle text-brand">
                {m.art === "datei" ? (
                  <FileText className="size-5" aria-hidden="true" />
                ) : (
                  <Link2 className="size-5" aria-hidden="true" />
                )}
              </span>
              <span className="flex min-w-0 flex-1 basis-40 flex-col gap-0.5">
                <span className="text-[15px] leading-snug font-semibold break-words text-ink">{m.titel}</span>
                <span className="flex flex-wrap items-center gap-x-2 text-[13px] text-ink-muted">
                  {m.art === "datei" ? dateiInfo(m.format, m.groesse) : "Link"}
                  {heruntergeladen.has(m.id) && (
                    <span className="flex items-center gap-1">
                      <CircleCheck className="size-3.5 text-progress" aria-hidden="true" />
                      heruntergeladen
                    </span>
                  )}
                </span>
              </span>
              <span className="ml-auto flex shrink-0 items-center gap-2">
                {m.art === "datei" ? (
                  <>
                    {m.vorschau && (
                      <DateiVorschau
                        titel={m.titel}
                        href={`${basis}/${m.id}?aktion=vorschau`}
                        ausloeserLabel={`Vorschau: ${m.titel}`}
                        ausloeserKlasse={NEBENKNOPF}
                        downloadHref={downloadHref}
                        downloadName={m.dateiname}
                        onDownload={() => markieren(m.id)}
                      >
                        <Eye className="size-4" aria-hidden="true" />
                        <span className="hidden sm:inline">Vorschau</span>
                      </DateiVorschau>
                    )}
                    <a
                      href={downloadHref}
                      download={m.dateiname}
                      aria-label={`Herunterladen: ${m.titel} (${dateiInfo(m.format, m.groesse)})`}
                      onClick={() => markieren(m.id)}
                      className={HAUPTKNOPF}
                    >
                      <Download className="size-4" aria-hidden="true" />
                      Herunterladen
                    </a>
                  </>
                ) : (
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Öffnen: ${m.titel} (externer Link, öffnet in neuem Tab)`}
                    className={HAUPTKNOPF}
                  >
                    <ExternalLink className="size-4" aria-hidden="true" />
                    Öffnen
                  </a>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      {weitere > 0 && (
        <button
          type="button"
          onClick={() => setAufgeklappt(true)}
          className="flex min-h-11 w-fit items-center gap-1.5 rounded-full px-2 text-sm font-semibold text-brand outline-none hover:underline focus-visible:ring-2 focus-visible:ring-brand"
        >
          <ChevronDown className="size-4" aria-hidden="true" />
          Alle anzeigen ({weitere} weitere)
        </button>
      )}
    </section>
  );
}
