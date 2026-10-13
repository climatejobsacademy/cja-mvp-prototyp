import { ProgrammZeile } from "@/components/programm-zeile";

// Kompetenzseite v1 (SR-61, SR-62, SR-63; Design aus dem Branch demo):
// Überzeile Programm und "Deine Kompetenzen". Ohne Modul-Reiter -- die
// brauchen die Modul-Ebene (Datenlücke Nr. 1) und folgen später.

export function KompetenzenKopf({ programmName }: { programmName: string }) {
  return (
    <section className="flex flex-col gap-2">
      <ProgrammZeile name={programmName} />
      <h1 className="font-heading text-[40px] leading-none text-ink md:text-[52px]">Deine Kompetenzen</h1>
    </section>
  );
}
