"use client";

import { useState } from "react";
import { CircleAlert, KeyRound, UserCheck } from "lucide-react";

import { cn } from "@/lib/utils";

import { EINGABE, PRIMAER } from "./stile";

/**
 * Freigabe durch die Trainer:in per Codewort. Der Hinweis zur Trainer:in
 * steht direkt über dem Eingabefeld, in derselben Box. Die Prüfung kommt als
 * Funktion über Props (im Demo clientseitig, siehe praxisflow-daten.ts).
 */
export function CodewortGate({
  id,
  hinweis,
  label,
  buttonText,
  aktiv = true,
  gesperrtText,
  fehlerText,
  pruefen,
  onFreigabe,
}: {
  id: string;
  hinweis: string;
  label: string;
  buttonText: string;
  aktiv?: boolean;
  gesperrtText?: string;
  fehlerText: string;
  pruefen: (eingabe: string) => boolean;
  onFreigabe: () => void;
}) {
  const [eingabe, setEingabe] = useState("");
  const [fehler, setFehler] = useState(false);

  function absenden(e: React.FormEvent) {
    e.preventDefault();
    if (!aktiv) return;
    if (pruefen(eingabe)) {
      setFehler(false);
      setEingabe("");
      onFreigabe();
    } else {
      setFehler(true);
    }
  }

  return (
    <form onSubmit={absenden} className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-3">
      <p className="flex items-start gap-2 rounded-lg bg-lylac/30 p-3 text-sm text-eco-deep-green">
        <UserCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{hinweis}</span>
      </p>
      <label htmlFor={id} className="flex items-center gap-2 text-sm font-medium text-eco-deep-green">
        <KeyRound className="size-4" aria-hidden="true" />
        {label}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={id}
          type="password"
          autoComplete="off"
          value={eingabe}
          onChange={(e) => {
            setEingabe(e.target.value);
            setFehler(false);
          }}
          disabled={!aktiv}
          aria-invalid={fehler || undefined}
          aria-describedby={`${id}-info`}
          className={cn(EINGABE, "flex-1 disabled:cursor-not-allowed disabled:bg-muted")}
        />
        <button type="submit" disabled={!aktiv || !eingabe.trim()} className={PRIMAER}>
          {buttonText}
        </button>
      </div>
      <p id={`${id}-info`} className="text-sm" role={fehler ? "alert" : undefined}>
        {!aktiv && gesperrtText && <span className="text-muted-foreground">{gesperrtText}</span>}
        {aktiv && fehler && (
          <span className="flex items-center gap-1.5 text-eco-deep-green">
            <CircleAlert className="size-4 text-coral" aria-hidden="true" />
            {fehlerText}
          </span>
        )}
      </p>
    </form>
  );
}
