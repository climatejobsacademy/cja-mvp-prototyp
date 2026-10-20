"use client";

import { useState } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Nutzungsregeln für Kohorten-Chat und Fragen-Thread (SR-83, SR-74; Text
// Anna 2026-10-18). Der Link sitzt unter dem Eingabefeld und öffnet die
// Regeln als Fenster; nur Anzeige, nichts wird gespeichert.

const ABSCHNITTE: { titel: string; punkte: string[] }[] = [
  {
    titel: "So nutzen wir den Chat",
    punkte: [
      "Ankündigungen: Hier schreiben deine Trainer:innen und das Team der Akademie. Du kannst mitlesen.",
      "Treffpunkt: Hier schreiben alle aus deiner Kohorte. Für Fragen, Absprachen und Austausch.",
      "Fragen zur Lektion stellst du am besten im Fragen-Thread unter der Lektion. Dann finden alle die Antwort an der richtigen Stelle.",
    ],
  },
  {
    titel: "Bitte beachte",
    punkte: [
      "Sei freundlich und respektvoll. Keine Beleidigungen, kein Mobbing, keine Diskriminierung.",
      "Teile keine privaten Daten: keine Telefonnummern, Adressen, Ausweise oder Fotos von anderen Personen.",
      "Keine Werbung und keine Links zu Seiten, die nichts mit dem Lernen zu tun haben.",
      "Sicherheit geht vor: Antworten im Chat ersetzen keine Anweisung deiner Trainer:in. Arbeite an elektrischen Anlagen nur so, wie es im Unterricht und im Betrieb vorgegeben ist.",
      "Deine Nachrichten sehen alle Teilnehmenden deiner Kohorte und das Team der Akademie.",
    ],
  },
  {
    titel: "Wenn etwas nicht passt",
    punkte: [
      "Über „Melden“ an einer Chat-Nachricht gibst du dem Team Bescheid. Die Person, deren Nachricht du meldest, erfährt nicht, wer gemeldet hat.",
      "Trainer:innen und das Team können Nachrichten löschen, die gegen diese Regeln verstoßen.",
      "Eigene Nachrichten kannst du selbst löschen.",
      "Bei Fragen oder wenn du Daten löschen lassen möchtest: info@climatejobsacademy.com.",
    ],
  },
];

/** Link „Chat-Regeln“, öffnet die Regeln als Fenster. */
export function ChatRegelnLink({ className }: { className?: string }) {
  const [offen, setOffen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOffen(true)}
        className={className ?? "rounded underline underline-offset-2 outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-brand"}
      >
        Chat-Regeln
      </button>
      <Dialog open={offen} onOpenChange={setOffen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chat-Regeln</DialogTitle>
          </DialogHeader>
          {ABSCHNITTE.map((a) => (
            <section key={a.titel} className="flex flex-col gap-1.5">
              <h3 className="font-semibold text-ink">{a.titel}</h3>
              <ul className="flex list-disc flex-col gap-1 pl-5 text-ink">
                {a.punkte.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </section>
          ))}
        </DialogContent>
      </Dialog>
    </>
  );
}
