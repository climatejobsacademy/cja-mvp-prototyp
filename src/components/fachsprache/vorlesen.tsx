"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Volume2 } from "lucide-react";

import { cn } from "@/lib/utils";

// Fachsprache-Einheit (Stufe 2, SR folgt): Vorlesen mit der deutschen Stimme
// des Browsers (Web Speech API, Sprachausgabe im Gerät, nichts geht an einen
// Server von uns). Welche Stimmen auf Production erlaubt sind, ist noch nicht
// entschieden (docs/decisions.md 2026-10-16, O4). Ohne Unterstützung im Browser
// erscheint der Knopf nicht. Ziel 44 px.

function vorlesenMoeglich(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function vorlesen(text: string) {
  if (!vorlesenMoeglich()) return;
  window.speechSynthesis.cancel();
  const s = new SpeechSynthesisUtterance(text);
  s.lang = "de-DE";
  s.rate = 0.9;
  window.speechSynthesis.speak(s);
}

export function VorlesenKnopf({ text, label, className }: { text: string; label: string; className?: string }) {
  // Auf dem Server und beim ersten Rendern "nicht möglich", im Browser ohne Zwischenzustand.
  const moeglich = useSyncExternalStore(
    () => () => {},
    vorlesenMoeglich,
    () => false
  );
  // Beim Verlassen der Seite verstummen.
  useEffect(() => {
    return () => {
      if (vorlesenMoeglich()) window.speechSynthesis.cancel();
    };
  }, []);
  if (!moeglich) return null;
  return (
    <button
      type="button"
      onClick={() => vorlesen(text)}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-11 flex-none items-center justify-center rounded-full bg-white text-self shadow-card outline-none hover:bg-subtle focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
        className
      )}
    >
      <Volume2 className="size-5" aria-hidden="true" />
    </button>
  );
}
