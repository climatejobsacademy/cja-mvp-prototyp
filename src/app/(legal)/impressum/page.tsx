import type { Metadata } from "next";

export const metadata: Metadata = { title: "Impressum — AfCJ" };

/**
 * SR-60: Platzhalterinhalt für den Prototyp — der rechtsverbindliche Text
 * folgt von Vera. Diese Seite erfüllt vorerst nur die technische
 * Anforderung (Route ohne Login erreichbar, Struktur vorhanden).
 */
export default function ImpressumPage() {
  return (
    <article className="flex flex-col gap-4">
      <h1 className="font-heading text-2xl text-eco-deep-green">Impressum</h1>
      <p className="text-sm text-muted-foreground">
        Platzhaltertext. Der rechtsverbindliche Inhalt (Anbieterkennzeichnung)
        folgt.
      </p>
    </article>
  );
}
