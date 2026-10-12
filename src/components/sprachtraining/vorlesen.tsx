"use client";

import { Volume2 } from "lucide-react";

import { cn } from "@/lib/utils";

// Sprachtraining-Demo (SR-24/SR-31, nur demo): 🔊 liest einen Text mit der
// deutschen Stimme des Browsers vor (Web Speech API, Sprachausgabe im Gerät).
// Ohne Unterstützung im Browser bleibt der Knopf ohne Wirkung.

export function vorlesenMoeglich(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function vorlesen(text: string) {
  if (!vorlesenMoeglich()) return;
  window.speechSynthesis.cancel();
  const s = new SpeechSynthesisUtterance(text);
  s.lang = "de-DE";
  s.rate = 0.9;
  window.speechSynthesis.speak(s);
}

export function VorlesenKnopf({ text, klein, className }: { text: string; klein?: boolean; className?: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        vorlesen(text);
      }}
      aria-label={`Vorlesen: ${text}`}
      title="Vorlesen"
      className={cn(
        "inline-flex flex-none items-center justify-center rounded-full bg-self-tint text-self outline-none hover:bg-white focus-visible:ring-2 focus-visible:ring-brand",
        klein ? "size-8" : "size-10",
        className
      )}
    >
      <Volume2 className={klein ? "size-4" : "size-5"} aria-hidden="true" />
    </button>
  );
}
