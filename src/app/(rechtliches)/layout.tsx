import { RechtsseiteKopf } from "@/components/rechtsseite-kopf";

// Rechtliche Pflichtseiten (SR-60): Impressum, Datenschutz, Barrierefreiheit.
// Die Gruppe (rechtliches) ändert die Adressen nicht, gibt den Seiten aber
// einen gemeinsamen Kopf mit "Zurück" (Anna 2026-10-16).
export default function RechtlichesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RechtsseiteKopf />
      {children}
    </>
  );
}
