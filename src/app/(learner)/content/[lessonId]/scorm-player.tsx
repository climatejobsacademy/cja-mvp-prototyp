"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { unzip } from "fflate";
import { Scorm12API } from "scorm-again";

import { markLessonComplete } from "./actions";

const MIME_TYPES: Record<string, string> = {
  html: "text/html",
  htm: "text/html",
  css: "text/css",
  js: "text/javascript",
  json: "application/json",
  xml: "application/xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  svg: "image/svg+xml",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  txt: "text/plain",
};

function guessMimeType(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return MIME_TYPES[ext] ?? "application/octet-stream";
}

// SCORM 1.2 vermischt bewusst "gemacht" und "bestanden" in einem Feld --
// beide zaehlen hier als abgeschlossen im Sinne von unit_progress.
const COMPLETING_STATUSES = new Set(["completed", "passed"]);

type Props = {
  lessonId: string;
  entryPointPfad: string;
  zipSignedUrl: string;
  done: boolean;
};

export function ScormPlayer({ lessonId, entryPointPfad, zipSignedUrl, done }: Props) {
  const [status, setStatus] = useState<"laedt" | "bereit" | "fehler">("laedt");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const completionFiredRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      try {
        const registration = await navigator.serviceWorker.register("/scorm-assets/sw-scorm.js", {
          scope: "/scorm-assets/",
        });
        await navigator.serviceWorker.ready;

        const response = await fetch(zipSignedUrl);
        if (!response.ok) throw new Error(`Zip-Download fehlgeschlagen (${response.status})`);
        const zipBytes = new Uint8Array(await response.arrayBuffer());

        const unzipped = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
          unzip(zipBytes, (err, data) => (err ? reject(err) : resolve(data)));
        });

        const files = Object.entries(unzipped)
          .filter(([path, data]) => !path.endsWith("/") && data.length > 0)
          .map(([path, data]) => ({
            path,
            mimeType: guessMimeType(path),
            data: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
          }));

        if (cancelled) return;

        const activeWorker = registration.active;
        if (!activeWorker) throw new Error("Service Worker nicht aktiv.");

        await new Promise<void>((resolve, reject) => {
          const channel = new MessageChannel();
          channel.port1.onmessage = (event) => {
            if (event.data?.type === "PACKAGE_REGISTERED") resolve();
            else reject(new Error("Unerwartete Service-Worker-Antwort."));
          };
          activeWorker.postMessage({ type: "REGISTER_PACKAGE", packageId: lessonId, files }, [
            channel.port2,
            ...files.map((f) => f.data),
          ]);
        });

        if (cancelled) return;

        // SCORM 1.2 sucht die Runtime-API per Konvention an window.API (kein
        // Konfigurationsspielraum, protokollvorgegeben) -- daher der Cast statt
        // einer globalen Window-Erweiterung fuer diesen einen Anwendungsfall.
        const api = new Scorm12API({ autocommit: false });
        api.on("LMSSetValue.cmi.core.lesson_status", (_element: string, value: string) => {
          if (!completionFiredRef.current && !done && COMPLETING_STATUSES.has(value)) {
            completionFiredRef.current = true;
            startTransition(async () => {
              await markLessonComplete(lessonId);
            });
          }
        });
        (window as unknown as { API: Scorm12API }).API = api;

        setStatus("bereit");
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Unbekannter Fehler.");
          setStatus("fehler");
        }
      }
    }

    setup();

    return () => {
      cancelled = true;
      delete (window as unknown as { API?: Scorm12API }).API;
    };
  }, [lessonId, zipSignedUrl, done]);

  if (status === "fehler") {
    return (
      <p className="text-sm text-destructive" role="alert">
        SCORM-Paket konnte nicht geladen werden{errorMessage ? `: ${errorMessage}` : "."}
      </p>
    );
  }

  if (status === "laedt") {
    return <p className="text-sm text-muted-foreground">SCORM-Paket wird geladen …</p>;
  }

  return (
    <iframe
      src={`/scorm-assets/${lessonId}/${entryPointPfad}`}
      title="SCORM-Lerninhalt"
      className="h-[600px] w-full rounded-md border"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
    />
  );
}
