/**
 * Seitenkopf (Handoff 2a): nur die H1 in Anton, keine Eyebrow, keine
 * Unterzeile. Titel = Nav-Label bzw. Name der Lektion/Aufgabe.
 */
export function PageHeader({ title }: { title: string }) {
  return (
    <header className="border-b border-border pb-5">
      <h1 className="font-heading text-[32px] leading-tight text-eco-deep-green md:text-[40px]">
        {title}
      </h1>
    </header>
  );
}
