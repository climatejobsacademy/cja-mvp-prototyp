"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Camera } from "lucide-react";

import { cn } from "@/lib/utils";

import { FOKUS } from "./stile";

/**
 * Foto auswählen und nur im Browser als Vorschau zeigen. Kein Upload, nichts
 * wird gespeichert; die temporäre Objekt-URL wird beim Wechsel und beim
 * Verlassen der Phase wieder freigegeben.
 */
export function FotoVorschau({ hinweis }: { hinweis?: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor="kontrolle-foto"
        className={cn(
          "inline-flex min-h-11 w-fit cursor-pointer items-center gap-2 rounded-full bg-subtle px-5 text-[15px] font-semibold text-ink hover:bg-praxis-tint has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand has-[:focus-visible]:ring-offset-2",
          FOKUS
        )}
      >
        <Camera className="size-[18px]" aria-hidden="true" />
        {url ? "Anderes Foto wählen" : "Foto auswählen"}
        <input
          id="kontrolle-foto"
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => {
            const datei = e.target.files?.[0];
            setUrl(datei ? URL.createObjectURL(datei) : null);
          }}
        />
      </label>
      {hinweis && <p className="text-sm text-ink-muted">{hinweis}</p>}
      {url && (
        <div className="relative h-56 w-full max-w-md overflow-hidden rounded-zeile bg-subtle">
          <Image src={url} alt="Vorschau des ausgewählten Fotos" fill unoptimized sizes="448px" className="object-contain" />
        </div>
      )}
    </div>
  );
}
