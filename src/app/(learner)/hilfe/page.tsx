import Image from "next/image";
import { ChevronDown, Download } from "lucide-react";

import { HILFE } from "./inhalte";

// Hilfe-Seite (Anna 2026-11-01, SR folgt): Fragen und Antworten zur Plattform,
// aufklappbar in vier Gruppen. Erreichbar über das Account-Menü. Inhalt wie
// die Kurzanleitung (PDF zum Herunterladen, Quelle docs/ux/hilfe/).

export const metadata = { title: "Hilfe" };

// Fortlaufende Nummer über alle Gruppen, wie in der Kurzanleitung.
const START = HILFE.map((_, i) => HILFE.slice(0, i).reduce((n, g) => n + g.fragen.length, 0));

export default function HilfePage() {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h1 className="font-heading text-[40px] leading-none text-ink md:text-[52px]">So findest du dich zurecht</h1>
        <p className="text-[15px] text-ink-muted">
          Die wichtigsten Fragen und Antworten zur Lernplattform. Tippe auf eine Frage, um sie zu öffnen.
        </p>
        <a
          href="/hilfe/kurzanleitung.pdf"
          download="Kurzanleitung Lernplattform.pdf"
          className="mt-1 inline-flex min-h-11 items-center gap-2 self-start rounded-full bg-lime px-5 text-sm font-bold text-on-lime outline-none transition-[filter] duration-150 hover:brightness-95 focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 motion-reduce:transition-none"
        >
          <Download className="size-[18px]" aria-hidden="true" />
          Als PDF herunterladen
        </a>
      </section>

      {HILFE.map((gruppe, gi) => (
        <section key={gruppe.titel} aria-label={gruppe.titel} className="flex flex-col gap-3">
          <h2 className="text-lg font-bold text-ink">{gruppe.titel}</h2>
          <div className="flex flex-col divide-y divide-line overflow-hidden rounded-karte bg-card shadow-card">
            {gruppe.fragen.map((f, fi) => {
              const nummer = START[gi] + fi + 1;
              return (
                <details key={f.id} id={f.id} className="group/frage">
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 text-ink outline-none transition-[background-color] duration-150 hover:bg-subtle focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset motion-reduce:transition-none [&::-webkit-details-marker]:hidden">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand text-[13px] font-bold text-white">
                      {nummer}
                    </span>
                    <span className="flex-1 text-[15px] leading-snug font-semibold">{f.titel}</span>
                    <ChevronDown
                      className="size-[18px] shrink-0 text-ink-muted transition-transform group-open/frage:rotate-180 motion-reduce:transition-none"
                      aria-hidden="true"
                    />
                  </summary>
                  <div className="flex flex-col gap-4 px-5 pt-3 pb-6 text-[15px] leading-relaxed text-ink md:pl-[60px] [&_li]:mb-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5">
                    <div>{f.antwort}</div>
                    {f.bild && (
                      <Image
                        src={`/hilfe/${f.bild.datei}`}
                        alt=""
                        width={f.bild.breite}
                        height={f.bild.hoehe}
                        className="h-auto max-w-full rounded-xl border border-line"
                        style={{ width: f.bild.breite }}
                      />
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
