"use client";

import { useState } from "react";
import { ExternalLink, Play, Video } from "lucide-react";

import { einbettAdresse, startSekunden, youtubeId } from "@/lib/youtube";

// YouTube-Videos einer Lektion (SR folgt): Link-Einträge mit YouTube-Adresse
// erscheinen hier als Player statt in „Unterlagen“. Zwei-Klick-Lösung: bis
// zum Klick auf „Video laden“ wird nichts von YouTube geladen (kein
// Vorschaubild, kein Skript); danach nur über youtube-nocookie.com, mit
// Untertiteln (deutsch bevorzugt). Es wird nicht erfasst, wer ein Video lädt.

export type LektionsVideo = { id: string; titel: string; url: string };

export function VideoAbschnitt({ videos }: { videos: LektionsVideo[] }) {
  if (videos.length === 0) return null;
  return (
    <section aria-labelledby="videos-ueberschrift" className="flex flex-col gap-3">
      <h2 id="videos-ueberschrift" className="flex items-center gap-2 text-base font-bold text-ink">
        <Video className="size-[18px] text-brand" aria-hidden="true" />
        {videos.length === 1 ? "Video" : "Videos"}
      </h2>
      {videos.map((v) => (
        <VideoKarte key={v.id} video={v} />
      ))}
    </section>
  );
}

function VideoKarte({ video }: { video: LektionsVideo }) {
  const [geladen, setGeladen] = useState(false);
  const id = youtubeId(video.url);
  if (!id) return null;
  return (
    <figure className="flex flex-col gap-2 rounded-karte bg-card p-4 shadow-card md:p-5">
      <figcaption className="text-[15px] font-semibold text-ink">{video.titel}</figcaption>
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-subtle">
        {geladen ? (
          <iframe
            src={einbettAdresse(id, startSekunden(video.url))}
            title={`Video: ${video.titel}`}
            className="absolute inset-0 size-full"
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
            <button
              type="button"
              onClick={() => setGeladen(true)}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand px-5 text-[15px] font-semibold text-white outline-none hover:bg-brand-2 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              <Play className="size-4 fill-current" aria-hidden="true" />
              Video laden
            </button>
            <p className="max-w-md text-[13px] text-ink-muted">
              Das Video kommt von YouTube. Erst nach dem Klick werden Daten an YouTube (Google) übertragen, mehr dazu in der
              Datenschutzerklärung.
            </p>
          </div>
        )}
      </div>
      <a
        href={video.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 w-fit items-center gap-1.5 text-sm text-ink-muted outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-brand"
      >
        <ExternalLink className="size-4" aria-hidden="true" />
        Auf YouTube öffnen
        <span className="sr-only">(neuer Tab)</span>
      </a>
    </figure>
  );
}
