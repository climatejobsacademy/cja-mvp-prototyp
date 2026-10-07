"use client";

import { useSyncExternalStore } from "react";
import { CircleCheck, Download, ExternalLink, Eye, FileText, Link2 } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Material } from "@/lib/queries/materialien";

// "heruntergeladen" gilt nur für die laufende Browser-Sitzung (sessionStorage),
// nichts davon geht in die Datenbank (Entscheidung 2026-10-07).
const MARKER_PREFIX = "lernmaterial-heruntergeladen:";

// Marker als kleiner externer Store, damit React ihn ohne setState im Effekt
// liest; auf dem Server gibt es keine Marker.
const zuhoerer = new Set<() => void>();

function abonnieren(zuhoeren: () => void) {
  zuhoerer.add(zuhoeren);
  return () => {
    zuhoerer.delete(zuhoeren);
  };
}

function markerLesen(): string {
  try {
    const ids: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i);
      if (key?.startsWith(MARKER_PREFIX)) ids.push(key.slice(MARKER_PREFIX.length));
    }
    return ids.sort().join(",");
  } catch {
    // sessionStorage nicht verfügbar (z. B. privater Modus): ohne Marker weiter.
    return "";
  }
}

function markerSetzen(id: string) {
  try {
    window.sessionStorage.setItem(MARKER_PREFIX + id, "1");
  } catch {
    // siehe markerLesen
  }
  for (const zuhoeren of zuhoerer) zuhoeren();
}

const AKTION = cn(buttonVariants({ variant: "outline" }), "h-11 gap-2 px-3 sm:h-9");

/**
 * Liste der Lernmaterialien einer Lektion (SR folgt). Vorschau/Download sind
 * normale Links in einen neuen Tab; der signierte Link entsteht erst beim
 * Aufruf im Route Handler. Kein next/link, damit nichts vorab geladen wird.
 * Bilder werden nirgends inline gezeigt (kein img), der Titel steckt im
 * zugänglichen Namen der Aktionen.
 */
export function MaterialienListe({
  lessonId,
  materialien,
  ueberschrift = "Materialien",
}: {
  lessonId: string;
  materialien: Material[];
  ueberschrift?: string;
}) {
  const markiert = useSyncExternalStore(abonnieren, markerLesen, () => "");
  const heruntergeladen = new Set(markiert ? markiert.split(",") : []);

  const basis = `/content/${lessonId}/material`;

  return (
    <section aria-labelledby="materialien-ueberschrift" className="flex flex-col gap-3">
      <h2 id="materialien-ueberschrift" className="text-[15px] font-semibold text-eco-deep-green">
        {ueberschrift}
      </h2>
      <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
        {materialien.map((m) => (
          <li key={m.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              {m.art === "datei" ? (
                <FileText className="mt-0.5 size-5 shrink-0 text-eco-green" aria-hidden="true" />
              ) : (
                <Link2 className="mt-0.5 size-5 shrink-0 text-eco-green" aria-hidden="true" />
              )}
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="text-sm font-medium break-words text-eco-deep-green">{m.titel}</p>
                {m.art === "datei" ? (
                  <p className="text-[13px] break-all text-muted-foreground">
                    {m.dateiname} · {m.format}
                    {m.groesse ? ` · ${m.groesse}` : ""}
                  </p>
                ) : (
                  <p className="text-[13px] text-muted-foreground">externer Link</p>
                )}
                {heruntergeladen.has(m.id) && (
                  <p className="flex items-center gap-1 text-[13px] text-eco-deep-green">
                    <CircleCheck className="size-3.5 text-eco-green" aria-hidden="true" />
                    heruntergeladen
                  </p>
                )}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              {m.art === "datei" ? (
                <>
                  {m.vorschau && (
                    <a
                      href={`${basis}/${m.id}?aktion=vorschau`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Vorschau: ${m.titel} (öffnet in neuem Tab)`}
                      className={AKTION}
                    >
                      <Eye aria-hidden="true" /> Vorschau
                    </a>
                  )}
                  <a
                    href={`${basis}/${m.id}?aktion=download`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Download: ${m.titel}`}
                    onClick={() => markerSetzen(m.id)}
                    className={AKTION}
                  >
                    <Download aria-hidden="true" /> Download
                  </a>
                </>
              ) : (
                <a
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Öffnen: ${m.titel} (externer Link, öffnet in neuem Tab)`}
                  className={AKTION}
                >
                  <ExternalLink aria-hidden="true" /> Öffnen
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
